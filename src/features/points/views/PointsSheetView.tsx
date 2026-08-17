import { ScrollView, StyleSheet } from 'react-native';

import { RoutePoint } from '../../../model/entities/Route';
import { EmptyStateCard } from '../../../shared/components/EmptyStateCard';
import { spacing } from '../../../shared/theme';
import { PointCard } from '../components/PointCard';

type PointsSheetViewProps = {
  points: RoutePoint[];
  inProgressPointIds: number[];
  onGoToRoutes: () => void;
  onSelectPoint: (pointId: number) => void;
};

export function PointsSheetView({ points, inProgressPointIds, onGoToRoutes, onSelectPoint }: PointsSheetViewProps) {
  return (
    <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
      {points.length === 0 ? (
        <EmptyStateCard
          icon="location-outline"
          title="Nenhum ponto disponível"
          description="Adicione uma rota para visualizar os pontos de atendimento no mapa."
          actionLabel="Ir para Rotas"
          onAction={onGoToRoutes}
        />
      ) : null}

      {points.map((point) => (
        <PointCard
          key={point.id}
          point={point}
          isInProgress={inProgressPointIds.includes(point.id)}
          onPress={() => onSelectPoint(point.id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheetContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
});
