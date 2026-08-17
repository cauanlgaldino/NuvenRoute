import { Visit } from '../../model/entities/Visit';
import { SyncVisitsInterface, VisitSyncResult } from '../../model/interfaces/SyncVisitsInterface';

type SyncVisitsServiceOptions = {
  delayMs?: number;
  shouldFail?: (visit: Visit) => boolean;
};

export class SyncVisitsService implements SyncVisitsInterface {
  private readonly delayMs: number;
  private readonly shouldFail: (visit: Visit) => boolean;

  constructor(options: SyncVisitsServiceOptions = {}) {
    this.delayMs = options.delayMs ?? 800;
    this.shouldFail = options.shouldFail ?? (() => false);
  }

  async syncVisits(visits: Visit[]): Promise<VisitSyncResult[]> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    return visits.map((visit) => {
      if (this.shouldFail(visit)) {
        return {
          visitId: visit.id,
          status: 'error',
          errorMessage: 'Falha simulada ao sincronizar visita.',
        };
      }

      return {
        visitId: visit.id,
        status: 'synced',
      };
    });
  }
}

export const syncVisitsService = new SyncVisitsService();
