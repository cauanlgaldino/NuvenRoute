import { Visit } from '../../model/entities/Visit';
import { SyncVisitsInterface } from '../../model/interfaces/SyncVisitsInterface';

export type PendingVisitRepository = {
  getPendingVisits(): Promise<Visit[]>;
  updateVisitSyncStatus(visitId: string, syncStatus: Visit['syncStatus'], syncError?: string): Promise<void>;
};

export type SyncPendingVisitsSummary = {
  total: number;
  synced: number;
  failed: number;
};

export class SyncPendingVisitsService {
  constructor(
    private readonly visitRepository: PendingVisitRepository,
    private readonly syncService: SyncVisitsInterface,
  ) {}

  async execute(): Promise<SyncPendingVisitsSummary> {
    const pendingVisits = await this.visitRepository.getPendingVisits();

    if (pendingVisits.length === 0) {
      return {
        total: 0,
        synced: 0,
        failed: 0,
      };
    }

    await Promise.all(
      pendingVisits.map((visit) =>
        this.visitRepository.updateVisitSyncStatus(visit.id, 'syncing'),
      ),
    );

    const results = await this.syncService.syncVisits(pendingVisits);

    await Promise.all(
      results.map((result) =>
        this.visitRepository.updateVisitSyncStatus(
          result.visitId,
          result.status,
          result.status === 'error' ? result.errorMessage : undefined,
        ),
      ),
    );

    const synced = results.filter((result) => result.status === 'synced').length;

    return {
      total: pendingVisits.length,
      synced,
      failed: results.length - synced,
    };
  }
}
