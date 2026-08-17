import { useCallback, useEffect, useMemo, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { SyncPendingVisitsService } from '../../../services/sync/SyncPendingVisitsService';
import { preferencesService } from '../../../services/preferences/PreferencesService';
import { routeRepositoryService } from '../../../services/repositories/RouteRepositoryService';
import { syncVisitsService } from '../../../services/sync/SyncVisitsService';
import { defaultRoute } from '../../../services/seed/defaultRoute';
import { RoutePoint, RouteSummary } from '../../../model/entities/Route';
import { parseRouteJson } from '../../../model/validation/routeValidation';

export type MapHomeTab = 'routes' | 'points';

type ViewState = {
  activeTab: MapHomeTab;
  routes: RouteSummary[];
  points: RoutePoint[];
  selectedRouteId: string | null;
  isLoading: boolean;
  isImporting: boolean;
  isSyncing: boolean;
  error: string | null;
  importMessage: string | null;
  syncMessage: string | null;
};

type SyncPendingVisitsOptions = {
  silent?: boolean;
};

export function useMapHomeViewModel() {
  const [state, setState] = useState<ViewState>({
    activeTab: 'routes',
    routes: [],
    points: [],
    selectedRouteId: null,
    isLoading: true,
    isImporting: false,
    isSyncing: false,
    error: null,
    importMessage: null,
    syncMessage: null,
  });

  const load = useCallback(async (preferredRouteId?: string | null) => {
    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      await routeRepositoryService.initialize();
      const routes = await routeRepositoryService.getRouteSummaries();
      const persistedRouteId = await preferencesService.getSelectedRouteId();
      const routeIdCandidate = preferredRouteId ?? persistedRouteId;
      const candidateRouteExists = routes.some((route) => route.routeId === routeIdCandidate);
      const selectedRouteId = candidateRouteExists ? routeIdCandidate : routes[0]?.routeId ?? null;
      const points = selectedRouteId ? await routeRepositoryService.getRoutePoints(selectedRouteId) : [];

      await preferencesService.setSelectedRouteId(selectedRouteId);

      setState((current) => ({
        ...current,
        routes,
        points,
        selectedRouteId,
        isLoading: false,
        isImporting: false,
        error: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        routes: [],
        points: [],
        selectedRouteId: null,
        isLoading: false,
        isImporting: false,
        error: error instanceof Error ? error.message : 'Não foi possível carregar o mapa.',
      }));
    }
  }, []);

  const setActiveTab = useCallback((activeTab: MapHomeTab) => {
    setState((current) => ({ ...current, activeTab }));
  }, []);

  const clearTransientMessages = useCallback(() => {
    setState((current) => {
      if (!current.importMessage && !current.syncMessage) {
        return current;
      }

      return { ...current, importMessage: null, syncMessage: null };
    });
  }, []);

  const selectRoute = useCallback(async (routeId: string) => {
    if (state.selectedRouteId === routeId) {
      setState((current) => ({ ...current, activeTab: 'points' }));
      return;
    }

    void preferencesService.setSelectedRouteId(routeId);
    setState((current) => ({
      ...current,
      selectedRouteId: routeId,
      isLoading: true,
      error: null,
      importMessage: null,
    }));

    try {
      const points = await routeRepositoryService.getRoutePoints(routeId);
      setState((current) => ({
        ...current,
        selectedRouteId: routeId,
        points,
        isLoading: false,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Não foi possível selecionar a rota.',
      }));
    }
  }, [state.selectedRouteId]);

  const deleteRoute = useCallback(
    async (routeId: string) => {
      setState((current) => ({ ...current, isLoading: true, error: null, importMessage: null }));

      try {
        await routeRepositoryService.deleteRoute(routeId);
        const shouldClearSelection = state.selectedRouteId === routeId;
        if (shouldClearSelection) {
          await preferencesService.setSelectedRouteId(null);
        }
        await load(shouldClearSelection ? null : state.selectedRouteId);
      } catch (error) {
        setState((current) => ({
          ...current,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Não foi possível excluir a rota.',
        }));
      }
    },
    [load, state.selectedRouteId],
  );

  const importRoute = useCallback(async () => {
    setState((current) => ({
      ...current,
      isImporting: true,
      error: null,
      importMessage: null,
    }));

    try {
      const currentRoutes = await routeRepositoryService.getRouteSummaries();

      if (currentRoutes.length === 0) {
        await routeRepositoryService.importRoute(defaultRoute);
        await load(defaultRoute.routeId);
        setState((current) => ({
          ...current,
          activeTab: 'routes',
          importMessage: 'Rota dos assets carregada com sucesso.',
        }));
        return;
      }

      const pickerResult = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (pickerResult.canceled) {
        setState((current) => ({ ...current, isImporting: false }));
        return;
      }

      const selectedFile = pickerResult.assets[0];

      if (!selectedFile.name.toLowerCase().endsWith('.json')) {
        throw new Error('Formato inválido. Selecione um arquivo .json.');
      }

      const fileContent = await FileSystem.readAsStringAsync(selectedFile.uri);
      const route = parseRouteJson(fileContent);

      await routeRepositoryService.importRoute(route);
      await load(route.routeId);
      setState((current) => ({
        ...current,
        activeTab: 'routes',
        importMessage: 'Rota importada com sucesso.',
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        isImporting: false,
        error: error instanceof Error ? error.message : 'Não foi possível importar a rota.',
      }));
    }
  }, [load]);

  const syncPendingVisits = useCallback(async (options?: SyncPendingVisitsOptions) => {
    if (state.isSyncing) {
      return;
    }

    setState((current) => ({
      ...current,
      isSyncing: true,
      error: null,
      syncMessage: null,
    }));

    try {
      await routeRepositoryService.initialize();
      const syncPendingVisitsService = new SyncPendingVisitsService(
        routeRepositoryService,
        syncVisitsService,
      );
      const summary = await syncPendingVisitsService.execute();
      await load(state.selectedRouteId);

      setState((current) => ({
        ...current,
        isSyncing: false,
        syncMessage: options?.silent
          ? null
          : summary.total === 0
          ? 'Nenhuma visita pendente para sincronizar.'
          : `${summary.synced} de ${summary.total} visitas sincronizadas.`,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        isSyncing: false,
        error: error instanceof Error ? error.message : 'Não foi possível sincronizar as visitas.',
      }));
    }
  }, [load, state.isSyncing, state.selectedRouteId]);

  useEffect(() => {
    void load();
  }, [load]);

  return useMemo(
    () => ({
      ...state,
      reload: load,
      setActiveTab,
      selectRoute,
      deleteRoute,
      importRoute,
      syncPendingVisits,
      clearTransientMessages,
    }),
    [clearTransientMessages, deleteRoute, importRoute, load, selectRoute, setActiveTab, state, syncPendingVisits],
  );
}
