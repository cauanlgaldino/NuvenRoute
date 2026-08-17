import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import {
  PendingVisitRepository,
  SyncPendingVisitsService,
} from '../services/sync/SyncPendingVisitsService';
import { Visit } from '../model/entities/Visit';
import { SyncVisitsInterface } from '../model/interfaces/SyncVisitsInterface';

function makeVisit(id: string): Visit {
  return {
    id,
    pointId: Number(id.replace(/\D/g, '')) || 1,
    installationCode: `LEIT-TEST-${id}`,
    meterNumber: `MED-${id}`,
    previousReading: 100,
    currentReading: 120,
    latitude: -3.7319,
    longitude: -38.5267,
    capturedAt: '2026-08-20T14:32:00',
    photoUri: 'file://photo.jpg',
    syncStatus: 'pending',
  };
}

describe('SyncPendingVisitsService', () => {
  it('returns zero summary when there are no pending visits', async () => {
    const getPendingVisits = mock.fn(async () => []);
    const updateVisitSyncStatus = mock.fn(async () => undefined);
    const syncVisits = mock.fn(async () => []);
    const repository: PendingVisitRepository = {
      getPendingVisits,
      updateVisitSyncStatus,
    };
    const syncService: SyncVisitsInterface = {
      syncVisits,
    };

    const result = await new SyncPendingVisitsService(repository, syncService).execute();

    assert.deepEqual(result, { total: 0, synced: 0, failed: 0 });
    assert.equal(syncVisits.mock.callCount(), 0);
    assert.equal(updateVisitSyncStatus.mock.callCount(), 0);
  });

  it('marks visits as syncing before simulated sync and persists final statuses', async () => {
    const visits = [makeVisit('visit-1'), makeVisit('visit-2')];
    const getPendingVisits = mock.fn(async () => visits);
    const updateVisitSyncStatus = mock.fn(async () => undefined);
    const syncVisits = mock.fn(async () => [
      { visitId: 'visit-1', status: 'synced' as const },
      { visitId: 'visit-2', status: 'error' as const, errorMessage: 'Falha simulada.' },
    ]);
    const repository: PendingVisitRepository = {
      getPendingVisits,
      updateVisitSyncStatus,
    };
    const syncService: SyncVisitsInterface = {
      syncVisits,
    };

    const result = await new SyncPendingVisitsService(repository, syncService).execute();

    assert.deepEqual(syncVisits.mock.calls[0].arguments, [visits]);
    assert.deepEqual(updateVisitSyncStatus.mock.calls[0].arguments, ['visit-1', 'syncing']);
    assert.deepEqual(updateVisitSyncStatus.mock.calls[1].arguments, ['visit-2', 'syncing']);
    assert.deepEqual(updateVisitSyncStatus.mock.calls[2].arguments, [
      'visit-1',
      'synced',
      undefined,
    ]);
    assert.deepEqual(updateVisitSyncStatus.mock.calls[3].arguments, [
      'visit-2',
      'error',
      'Falha simulada.',
    ]);
    assert.deepEqual(result, { total: 2, synced: 1, failed: 1 });
  });
});
