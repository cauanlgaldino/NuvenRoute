export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

export type Visit = {
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
  syncStatus: SyncStatus;
  syncError?: string;
};
