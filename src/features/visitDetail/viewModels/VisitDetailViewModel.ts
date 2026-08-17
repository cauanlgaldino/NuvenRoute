import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { routeRepositoryService } from '../../../services/repositories/RouteRepositoryService';
import { RoutePoint } from '../../../model/entities/Route';
import { Visit } from '../../../model/entities/Visit';

type CapturedLocation = {
  latitude: number;
  longitude: number;
  capturedAt: string;
};

type VisitDraft = {
  currentReading: string;
  photoUri: string | null;
  location: CapturedLocation | null;
};

const visitDrafts = new Map<number, VisitDraft>();

function getDraft(pointId: number) {
  return visitDrafts.get(pointId);
}

function setDraft(pointId: number, draft: VisitDraft) {
  const hasDraft = Boolean(draft.currentReading.trim() || draft.photoUri || draft.location);

  if (hasDraft) {
    visitDrafts.set(pointId, draft);
    return;
  }

  visitDrafts.delete(pointId);
}

export function hasVisitDraft(pointId: number) {
  return visitDrafts.has(pointId);
}

type ViewState = {
  point: RoutePoint | null;
  currentReading: string;
  readingError: string | null;
  photoUri: string | null;
  location: CapturedLocation | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  successMessage: string | null;
};

export function useVisitDetailViewModel(pointId: number) {
  const [state, setState] = useState<ViewState>({
    point: null,
    currentReading: '',
    readingError: null,
    photoUri: null,
    location: null,
    isLoading: true,
    isSaving: false,
    error: null,
    successMessage: null,
  });

  const loadPoint = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      await routeRepositoryService.initialize();
      const [point, latestVisit] = await Promise.all([
        routeRepositoryService.getRoutePoint(pointId),
        routeRepositoryService.getLatestVisitByPoint(pointId),
      ]);
      const draft = latestVisit ? undefined : getDraft(pointId);

      setState((current) => ({
        ...current,
        point,
        currentReading: latestVisit
          ? String(latestVisit.currentReading)
          : draft?.currentReading ?? current.currentReading,
        photoUri: latestVisit?.photoUri ?? draft?.photoUri ?? current.photoUri,
        location: latestVisit
          ? {
              latitude: latestVisit.latitude,
              longitude: latestVisit.longitude,
              capturedAt: latestVisit.capturedAt,
            }
          : draft?.location
          ? draft.location
          : current.location,
        successMessage: latestVisit ? 'Visita registrada e aguardando sincronização.' : current.successMessage,
        isLoading: false,
        error: point ? null : 'Ponto de atendimento não encontrado.',
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Não foi possível carregar o atendimento.',
      }));
    }
  }, [pointId]);

  const setCurrentReading = useCallback((currentReading: string) => {
    setState((current) => ({
      ...current,
      currentReading,
      readingError: null,
      successMessage: null,
    }));
    setDraft(pointId, {
      currentReading,
      photoUri: state.photoUri,
      location: state.location,
    });
  }, [pointId, state.location, state.photoUri]);

  const setPhotoUri = useCallback((photoUri: string) => {
    setState((current) => ({ ...current, photoUri, successMessage: null }));
    setDraft(pointId, {
      currentReading: state.currentReading,
      photoUri,
      location: state.location,
    });
  }, [pointId, state.currentReading, state.location]);

  const captureLocation = useCallback(async () => {
    setState((current) => ({ ...current, error: null, successMessage: null }));

    const permission = await Location.requestForegroundPermissionsAsync();

    if (!permission.granted) {
      setState((current) => ({
        ...current,
        error: 'Permissão de localização negada.',
      }));
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    const capturedLocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      capturedAt: new Date().toISOString(),
    };

    setState((current) => ({
      ...current,
      location: capturedLocation,
    }));
    setDraft(pointId, {
      currentReading: state.currentReading,
      photoUri: state.photoUri,
      location: capturedLocation,
    });
  }, [pointId, state.currentReading, state.photoUri]);

  const validateReading = useCallback(() => {
    const normalizedReading = state.currentReading.trim();

    if (!normalizedReading) {
      return 'Informe a nova leitura.';
    }

    if (!/^\d+$/.test(normalizedReading)) {
      return 'Informe uma leitura numérica válida.';
    }

    return null;
  }, [state.currentReading]);

  const completeVisit = useCallback(async () => {
    const readingError = validateReading();

    if (readingError) {
      setState((current) => ({ ...current, readingError }));
      return false;
    }

    if (!state.point) {
      setState((current) => ({ ...current, error: 'Ponto de atendimento não encontrado.' }));
      return false;
    }

    if (!state.photoUri) {
      setState((current) => ({ ...current, error: 'Capture uma foto antes de concluir a visita.' }));
      return false;
    }

    if (!state.location) {
      setState((current) => ({ ...current, error: 'Obtenha a localização antes de concluir a visita.' }));
      return false;
    }

    setState((current) => ({ ...current, isSaving: true, error: null }));

    const visit: Visit = {
      id: `${state.point.id}-${Date.now()}`,
      pointId: state.point.id,
      installationCode: state.point.installationCode,
      meterNumber: state.point.meterNumber,
      previousReading: state.point.previousReading,
      currentReading: Number(state.currentReading.trim()),
      latitude: state.location.latitude,
      longitude: state.location.longitude,
      capturedAt: state.location.capturedAt,
      photoUri: state.photoUri,
      syncStatus: 'pending',
    };

    try {
      await routeRepositoryService.saveVisit(visit);
      visitDrafts.delete(state.point.id);
      setState((current) => ({
        ...current,
        isSaving: false,
        successMessage: 'Visita concluída e aguardando sincronização.',
      }));
      return true;
    } catch (error) {
      setState((current) => ({
        ...current,
        isSaving: false,
        error: error instanceof Error ? error.message : 'Não foi possível concluir a visita.',
      }));
      return false;
    }
  }, [state.currentReading, state.location, state.photoUri, state.point, validateReading]);

  useEffect(() => {
    void loadPoint();
  }, [loadPoint]);

  const canComplete = Boolean(
    state.currentReading.trim() && state.photoUri && state.location && !state.isSaving,
  );
  const hasDraft = Boolean(
    state.point?.status !== 'completed' &&
      (state.currentReading.trim() || state.photoUri || state.location),
  );

  return useMemo(
    () => ({
      ...state,
      canComplete,
      hasDraft,
      reload: loadPoint,
      setCurrentReading,
      setPhotoUri,
      captureLocation,
      completeVisit,
    }),
    [canComplete, captureLocation, completeVisit, hasDraft, loadPoint, setCurrentReading, setPhotoUri, state],
  );
}
