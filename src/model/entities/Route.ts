export type RouteStatus = 'assigned' | string;

export type RoutePointStatus = 'pending' | 'completed' | string;
export type RoutePointSyncStatus = 'pending' | 'syncing' | 'synced' | 'error' | string;

export type RoutePoint = {
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
  status: RoutePointStatus;
  syncStatus?: RoutePointSyncStatus | null;
};

export type Route = {
  routeId: string;
  routeName: string;
  date: string;
  city: string;
  state: string;
  neighborhood: string;
  status: RouteStatus;
  points: RoutePoint[];
};

export type RouteSummary = {
  routeId: string;
  routeName: string;
  date: string;
  city: string;
  state: string;
  neighborhood: string;
  status: RouteStatus;
  totalPoints: number;
  completedPoints: number;
  pendingSync: number;
  pendingPoints: number;
};
