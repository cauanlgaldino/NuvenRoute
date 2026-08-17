import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteSummary } from '../../../model/entities/Route';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { colors, radius, spacing, typography } from '../../../shared/theme';

type RouteCardProps = {
  route: RouteSummary;
  isSelected?: boolean;
  onPress?: () => void;
  onDelete?: () => void;
};

function formatDate(date: string) {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

export function RouteCard({ route, isSelected = false, onPress, onDelete }: RouteCardProps) {
  const syncTone = route.pendingSync > 0 ? 'info' : 'success';
  const syncLabel = route.pendingSync > 0 ? 'Ag. sync' : 'Sincronizada';

  return (
    <Pressable style={[styles.card, isSelected ? styles.selectedCard : null]} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>{route.routeName}</Text>
          <Text style={styles.location}>
            {route.neighborhood}, {route.city} - {route.state}
          </Text>
        </View>
        <StatusBadge label={isSelected ? 'Selecionada' : 'Adicionada'} tone={isSelected ? 'success' : 'info'} />
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{formatDate(route.date)}</Text>
        <Text style={styles.metaDivider}>•</Text>
        <Text style={styles.metaText}>{route.totalPoints} pontos</Text>
      </View>

      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>Progresso</Text>
        <StatusBadge label={syncLabel} tone={syncTone} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.progressText}>
          {route.completedPoints} concluídos · {route.pendingSync} aguardando sync ·{' '}
          {route.pendingPoints} pendentes
        </Text>
        {onDelete ? (
          <Pressable
            hitSlop={10}
            onPress={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            style={styles.iconButton}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    borderRadius: radius.default,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  selectedCard: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  iconButton: {
    alignItems: 'center',
    borderColor: colors.outlineVariant,
    borderRadius: radius.full,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  titleGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  location: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metaText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  metaDivider: {
    ...typography.bodySm,
    color: colors.outline,
  },
  progressHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTitle: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  progressText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
});
