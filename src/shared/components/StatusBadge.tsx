import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';

type StatusTone = 'success' | 'warning' | 'info' | 'neutral' | 'error';

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

const toneColors: Record<StatusTone, { background: string; text: string }> = {
  success: { background: colors.successContainer, text: colors.success },
  warning: { background: colors.warningContainer, text: colors.warning },
  info: { background: colors.infoContainer, text: colors.info },
  neutral: { background: colors.surfaceContainer, text: colors.onSurfaceVariant },
  error: { background: colors.errorContainer, text: colors.error },
};

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const currentTone = toneColors[tone];

  return (
    <View style={[styles.container, { backgroundColor: currentTone.background }]}>
      <Text style={[styles.label, { color: currentTone.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.labelSm,
    textTransform: 'uppercase',
  },
});
