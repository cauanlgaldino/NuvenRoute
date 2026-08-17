import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RoutePoint } from '../../../model/entities/Route';
import { colors, radius, spacing, typography } from '../../../shared/theme';

type PointCardProps = {
  point: RoutePoint;
  isInProgress: boolean;
  onPress: () => void;
};

export function PointCard({ point, isInProgress, onPress }: PointCardProps) {
  const status = getPointPresentationStatus(point, isInProgress);

  return (
    <Pressable onPress={onPress} style={styles.pointCard}>
      <View style={styles.pointOrder}>
        <Text style={styles.pointOrderText}>{point.order}</Text>
      </View>

      <View style={styles.pointContent}>
        <View style={styles.pointHeader}>
          <Text style={styles.pointTitle}>{point.customer}</Text>
          <Text
            style={[
              styles.pointStatus,
              status.tone === 'synced' ? styles.pointStatusSynced : null,
              status.tone === 'pendingSync' ? styles.pointStatusPendingSync : null,
              status.tone === 'inProgress' ? styles.pointStatusInProgress : null,
              status.tone === 'pending' ? styles.pointStatusPending : null,
            ]}
          >
            {status.label}
          </Text>
        </View>
        <Text style={styles.pointMeta}>{point.installationCode}</Text>
        <View style={styles.pointAddressRow}>
          <Ionicons name="location-outline" size={14} color={colors.onSurfaceVariant} />
          <Text style={styles.pointAddress} numberOfLines={1}>
            {point.address}
          </Text>
        </View>
        <Text style={styles.pointReference}>{point.referencePoint}</Text>
      </View>
    </Pressable>
  );
}

function getPointPresentationStatus(point: RoutePoint, isInProgress: boolean) {
  if (point.status === 'completed' && point.syncStatus === 'synced') {
    return { label: 'Sincronizado', tone: 'synced' as const };
  }

  if (point.status === 'completed') {
    return { label: 'Ag. sync', tone: 'pendingSync' as const };
  }

  if (isInProgress) {
    return { label: 'Em atendimento', tone: 'inProgress' as const };
  }

  return { label: 'Pendente', tone: 'pending' as const };
}

const styles = StyleSheet.create({
  pointCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    borderRadius: radius.default,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  pointOrder: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.full,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  pointOrderText: {
    ...typography.labelLg,
    color: colors.primary,
  },
  pointContent: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  pointHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pointTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    flex: 1,
    minWidth: 0,
  },
  pointStatus: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    flexShrink: 0,
    maxWidth: 96,
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  pointStatusSynced: {
    color: colors.success,
  },
  pointStatusPendingSync: {
    color: colors.primary,
  },
  pointStatusInProgress: {
    color: colors.info,
  },
  pointStatusPending: {
    color: colors.warning,
  },
  pointMeta: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  pointAddressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pointAddress: {
    ...typography.bodySm,
    color: colors.onSurface,
    flex: 1,
  },
  pointReference: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
});
