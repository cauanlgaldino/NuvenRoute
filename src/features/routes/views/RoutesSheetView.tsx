import { ScrollView, StyleSheet, Text } from 'react-native';

import { RouteSummary } from '../../../model/entities/Route';
import { EmptyStateCard } from '../../../shared/components/EmptyStateCard';
import { colors, spacing, typography } from '../../../shared/theme';
import { RouteCard } from '../components/RouteCard';

type RoutesSheetViewProps = {
  routes: RouteSummary[];
  selectedRouteId: string | null;
  importMessage: string | null;
  syncMessage: string | null;
  onInteract: () => void;
  onSelectRoute: (routeId: string) => void;
  onDeleteRoute: (routeId: string) => void;
};

export function RoutesSheetView({
  routes,
  selectedRouteId,
  importMessage,
  syncMessage,
  onInteract,
  onSelectRoute,
  onDeleteRoute,
}: RoutesSheetViewProps) {
  const isEmpty = routes.length === 0;

  return (
    <ScrollView
      contentContainerStyle={styles.sheetContent}
      onScrollBeginDrag={onInteract}
      onTouchStart={onInteract}
      showsVerticalScrollIndicator={false}
    >
      {importMessage ? <Text style={styles.successText}>{importMessage}</Text> : null}

      {syncMessage ? <Text style={styles.successText}>{syncMessage}</Text> : null}

      {/* <Text style={styles.sectionTitle}>Rotas Salvas no Dispositivo</Text> */}

      {isEmpty ? (
        <EmptyStateCard
          icon="map-outline"
          title="Nenhuma rota carregada"
          description="Carregue o JSON inicial dos assets para começar a visualizar a rota e os pontos de atendimento."
        />
      ) : null}

      {routes.map((route) => (
        <RouteCard
          key={route.routeId}
          route={route}
          isSelected={route.routeId === selectedRouteId}
          onPress={() => onSelectRoute(route.routeId)}
          onDelete={() => onDeleteRoute(route.routeId)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheetContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  successText: {
    ...typography.bodySm,
    color: colors.success,
  },
  sectionTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    marginTop: spacing.xs,
  },
});
