import { Visit } from '../entities/Visit';

export type VisitSyncResult =
  | {
      visitId: string;
      status: 'synced';
    }
  | {
      visitId: string;
      status: 'error';
      errorMessage: string;
    };

export interface SyncVisitsInterface {
  syncVisits(visits: Visit[]): Promise<VisitSyncResult[]>;
}
