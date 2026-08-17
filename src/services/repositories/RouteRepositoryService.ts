import { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase, migrateDatabase } from '../database/DatabaseService';
import { Route, RoutePoint, RouteSummary } from '../../model/entities/Route';
import { Visit } from '../../model/entities/Visit';

type RouteSummaryRow = {
  routeId: string;
  routeName: string;
  date: string;
  city: string;
  state: string;
  neighborhood: string;
  status: string;
  totalPoints: number;
  completedPoints: number;
  pendingSync: number;
};

type RoutePointRow = {
  id: number;
  order: number;
  installationCode: string;
  customer: string;
  referencePoint: string;
  address: string;
  latitude: number;
  longitude: number;
  meterNumber: string;
  previousReading: number;
  status: string;
  syncStatus?: Visit['syncStatus'] | null;
};

type VisitRow = {
  id: string;
  pointId: number;
  installationCode: string;
  meterNumber: string;
  previousReading: number;
  currentReading: number;
  latitude: number;
  longitude: number;
  capturedAt: string;
  photoUri: string;
  syncStatus: Visit['syncStatus'];
  syncError: string | null;
};

function mapVisitRow(row: VisitRow): Visit {
  return {
    ...row,
    syncError: row.syncError ?? undefined,
  };
}

export class RouteRepositoryService {
  private db: SQLiteDatabase | null = null;

  async initialize() {
    await migrateDatabase();
    this.db = await getDatabase();
  }

  async getRouteSummaries(): Promise<RouteSummary[]> {
    const db = await this.requireDatabase();

    const rows = await db.getAllAsync<RouteSummaryRow>(`
      SELECT
        r.route_id as routeId,
        r.route_name as routeName,
        r.date,
        r.city,
        r.state,
        r.neighborhood,
        r.status,
        COUNT(p.id) as totalPoints,
        COALESCE(SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END), 0) as completedPoints,
        COALESCE(SUM(CASE WHEN v.sync_status IN ('pending', 'syncing', 'error') THEN 1 ELSE 0 END), 0) as pendingSync
      FROM routes r
      LEFT JOIN route_points p ON p.route_id = r.route_id
      LEFT JOIN visits v ON v.point_id = p.id
      GROUP BY r.route_id
      ORDER BY r.imported_at DESC;
    `);

    return rows.map((row) => ({
      ...row,
      pendingPoints: row.totalPoints - row.completedPoints,
    }));
  }

  async getRoutePoints(routeId: string): Promise<RoutePoint[]> {
    const db = await this.requireDatabase();

    return db.getAllAsync<RoutePointRow>(
      `SELECT
        p.id,
        p.visit_order as "order",
        p.installation_code as installationCode,
        p.customer,
        p.reference_point as referencePoint,
        p.address,
        p.latitude,
        p.longitude,
        p.meter_number as meterNumber,
        p.previous_reading as previousReading,
        p.status,
        v.sync_status as syncStatus
      FROM route_points p
      LEFT JOIN visits v ON v.point_id = p.id
      WHERE p.route_id = ?
      ORDER BY p.visit_order ASC;`,
      routeId,
    );
  }

  async getRoutePoint(pointId: number): Promise<RoutePoint | null> {
    const db = await this.requireDatabase();

    const row = await db.getFirstAsync<RoutePointRow>(
      `SELECT
        p.id,
        p.visit_order as "order",
        p.installation_code as installationCode,
        p.customer,
        p.reference_point as referencePoint,
        p.address,
        p.latitude,
        p.longitude,
        p.meter_number as meterNumber,
        p.previous_reading as previousReading,
        p.status,
        v.sync_status as syncStatus
      FROM route_points p
      LEFT JOIN visits v ON v.point_id = p.id
      WHERE p.id = ?;`,
      pointId,
    );

    return row ?? null;
  }

  async importRoute(route: Route) {
    const db = await this.requireDatabase();
    const importedAt = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT OR REPLACE INTO routes (
          route_id,
          route_name,
          date,
          city,
          state,
          neighborhood,
          status,
          source_json,
          imported_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        route.routeId,
        route.routeName,
        route.date,
        route.city,
        route.state,
        route.neighborhood,
        route.status,
        JSON.stringify(route),
        importedAt,
      );

      for (const point of route.points) {
        await db.runAsync(
          `INSERT OR REPLACE INTO route_points (
            id,
            route_id,
            visit_order,
            installation_code,
            customer,
            reference_point,
            address,
            latitude,
            longitude,
            meter_number,
            previous_reading,
            status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          point.id,
          route.routeId,
          point.order,
          point.installationCode,
          point.customer,
          point.referencePoint,
          point.address,
          point.latitude,
          point.longitude,
          point.meterNumber,
          point.previousReading,
          point.status,
        );
      }
    });
  }

  async deleteRoute(routeId: string) {
    const db = await this.requireDatabase();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `DELETE FROM visits
         WHERE point_id IN (
           SELECT id FROM route_points WHERE route_id = ?
         );`,
        routeId,
      );
      await db.runAsync('DELETE FROM route_points WHERE route_id = ?;', routeId);
      await db.runAsync('DELETE FROM routes WHERE route_id = ?;', routeId);
    });
  }

  async saveVisit(visit: Visit) {
    const db = await this.requireDatabase();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT OR REPLACE INTO visits (
          id,
          point_id,
          installation_code,
          meter_number,
          previous_reading,
          current_reading,
          latitude,
          longitude,
          captured_at,
          photo_uri,
          sync_status,
          sync_error,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        visit.id,
        visit.pointId,
        visit.installationCode,
        visit.meterNumber,
        visit.previousReading,
        visit.currentReading,
        visit.latitude,
        visit.longitude,
        visit.capturedAt,
        visit.photoUri,
        visit.syncStatus,
        visit.syncError ?? null,
        now,
        now,
      );

      await db.runAsync('UPDATE route_points SET status = ? WHERE id = ?;', 'completed', visit.pointId);
    });
  }

  async getLatestVisitByPoint(pointId: number): Promise<Visit | null> {
    const db = await this.requireDatabase();

    const row = await db.getFirstAsync<VisitRow>(
      `SELECT
        id,
        point_id as pointId,
        installation_code as installationCode,
        meter_number as meterNumber,
        previous_reading as previousReading,
        current_reading as currentReading,
        latitude,
        longitude,
        captured_at as capturedAt,
        photo_uri as photoUri,
        sync_status as syncStatus,
        sync_error as syncError
      FROM visits
      WHERE point_id = ?
      ORDER BY updated_at DESC
      LIMIT 1;`,
      pointId,
    );

    if (!row) return null;

    return mapVisitRow(row);
  }

  async getPendingVisits(): Promise<Visit[]> {
    const db = await this.requireDatabase();

    const rows = await db.getAllAsync<VisitRow>(`
      SELECT
        id,
        point_id as pointId,
        installation_code as installationCode,
        meter_number as meterNumber,
        previous_reading as previousReading,
        current_reading as currentReading,
        latitude,
        longitude,
        captured_at as capturedAt,
        photo_uri as photoUri,
        sync_status as syncStatus,
        sync_error as syncError
      FROM visits
      WHERE sync_status IN ('pending', 'error')
      ORDER BY updated_at ASC;
    `);

    return rows.map(mapVisitRow);
  }

  async updateVisitSyncStatus(visitId: string, syncStatus: Visit['syncStatus'], syncError?: string) {
    const db = await this.requireDatabase();

    await db.runAsync(
      `UPDATE visits
       SET sync_status = ?, sync_error = ?, updated_at = ?
       WHERE id = ?;`,
      syncStatus,
      syncError ?? null,
      new Date().toISOString(),
      visitId,
    );
  }

  private async requireDatabase() {
    this.db ??= await getDatabase();
    return this.db;
  }
}

export const routeRepositoryService = new RouteRepositoryService();
