import * as SQLite from 'expo-sqlite';

const databaseName = 'leit-route-v2.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase() {
  databasePromise ??= SQLite.openDatabaseAsync(databaseName);
  return databasePromise;
}

export async function migrateDatabase() {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS routes (
      route_id TEXT PRIMARY KEY NOT NULL,
      route_name TEXT NOT NULL,
      date TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      neighborhood TEXT NOT NULL,
      status TEXT NOT NULL,
      source_json TEXT NOT NULL,
      imported_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS route_points (
      id INTEGER PRIMARY KEY NOT NULL,
      route_id TEXT NOT NULL,
      visit_order INTEGER NOT NULL,
      installation_code TEXT NOT NULL,
      customer TEXT NOT NULL,
      reference_point TEXT NOT NULL,
      address TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      meter_number TEXT NOT NULL,
      previous_reading INTEGER NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY (route_id) REFERENCES routes(route_id)
    );

    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY NOT NULL,
      point_id INTEGER NOT NULL,
      installation_code TEXT NOT NULL,
      meter_number TEXT NOT NULL,
      previous_reading INTEGER NOT NULL,
      current_reading INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      captured_at TEXT NOT NULL,
      photo_uri TEXT NOT NULL,
      sync_status TEXT NOT NULL,
      sync_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (point_id) REFERENCES route_points(id)
    );
  `);
}
