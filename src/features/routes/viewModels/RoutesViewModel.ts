import { useCallback, useEffect, useMemo, useState } from 'react';

import { routeRepositoryService } from '../../../services/repositories/RouteRepositoryService';
import { RouteSummary } from '../../../model/entities/Route';

type ViewState = {
  routes: RouteSummary[];
  isLoading: boolean;
  error: string | null;
};

export function useRoutesViewModel() {
  const [state, setState] = useState<ViewState>({
    routes: [],
    isLoading: true,
    error: null,
  });

  const loadRoutes = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      await routeRepositoryService.initialize();
      const routes = await routeRepositoryService.getRouteSummaries();
      setState({ routes, isLoading: false, error: null });
    } catch (error) {
      setState({
        routes: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Não foi possível carregar as rotas.',
      });
    }
  }, []);

  useEffect(() => {
    void loadRoutes();
  }, [loadRoutes]);

  return useMemo(
    () => ({
      ...state,
      reload: loadRoutes,
    }),
    [loadRoutes, state],
  );
}
