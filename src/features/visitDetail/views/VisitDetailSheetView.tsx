import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoutePoint } from '../../../model/entities/Route';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { colors, radius, spacing, typography } from '../../../shared/theme';
import { useVisitDetailViewModel } from '../viewModels/VisitDetailViewModel';

type VisitDetailSheetViewProps = {
  pointId: number;
  onClose: () => void;
  onCompleted: () => void;
  onDraftChange: (pointId: number, hasDraft: boolean) => void;
};

export function VisitDetailSheetView({ pointId, onClose, onCompleted, onDraftChange }: VisitDetailSheetViewProps) {
  const cameraRef = useRef<CameraView>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const {
    point,
    currentReading,
    readingError,
    photoUri,
    location,
    isLoading,
    isSaving,
    error,
    successMessage,
    canComplete,
    hasDraft,
    setCurrentReading,
    setPhotoUri,
    captureLocation,
    completeVisit,
  } = useVisitDetailViewModel(pointId);

  function closeSheet() {
    onDraftChange(pointId, hasDraft);
    onClose();
  }

  async function openCamera() {
    const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();

    if (!permission.granted) {
      return;
    }

    setIsCameraOpen(true);
  }

  async function takePhoto() {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });

    if (photo?.uri) {
      setPhotoUri(photo.uri);
      setIsCameraOpen(false);
    }
  }

  async function handleCompleteVisit() {
    const didComplete = await completeVisit();

    if (didComplete) {
      onDraftChange(pointId, false);
      onCompleted();
    }
  }

  if (isCameraOpen) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        <SafeAreaView style={styles.cameraOverlay}>
          <Pressable onPress={() => setIsCameraOpen(false)} style={styles.cameraCloseButton}>
            <Ionicons name="close" size={28} color={colors.onPrimary} />
          </Pressable>
          <Pressable onPress={takePhoto} style={styles.captureButton}>
            <View style={styles.captureButtonInner} />
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Atendimento</Text>
        <Pressable onPress={closeSheet} hitSlop={10} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.onSurface} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.centerText}>Carregando atendimento...</Text>
        </View>
      ) : null}

      {!isLoading && point ? (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.pointCard}>
              <View style={styles.pointCardHeader}>
                <Text style={styles.pointTitle}>{point.customer}</Text>
                <StatusBadge {...getPointStatusBadgeProps(point, hasDraft)} />
              </View>

              <View style={styles.infoGrid}>
                <InfoBlock label="Instalação" value={point.installationCode} />
                <InfoBlock label="Medidor" value={point.meterNumber} />
                <InfoBlock label="Leitura anterior" value={String(point.previousReading)} />
              </View>

              <View style={styles.divider} />
              <View style={styles.addressRow}>
                <Ionicons name="location" size={20} color={colors.onSurfaceVariant} />
                <View style={styles.addressTextGroup}>
                  <Text style={styles.address}>{point.address}</Text>
                  <Text style={styles.reference}>Ref: {point.referencePoint}</Text>
                </View>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.sectionTitle}>Nova Leitura</Text>
              <View style={[styles.inputFrame, readingError ? styles.inputFrameError : null]}>
                <TextInput
                  value={currentReading}
                  onChangeText={setCurrentReading}
                  keyboardType="numeric"
                  placeholder="Digite a leitura atual"
                  placeholderTextColor={colors.outlineVariant}
                  style={styles.input}
                />
                {readingError ? <Ionicons name="alert-circle" size={22} color={colors.error} /> : null}
              </View>
              {readingError ? <Text style={styles.errorText}>{readingError}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.sectionTitle}>Evidências</Text>
              <Pressable onPress={openCamera} style={styles.actionBox}>
                {photoUri ? (
                  <>
                    <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                    <View style={styles.actionContent}>
                      <Text style={styles.actionTitle}>Foto capturada</Text>
                      <Text style={styles.actionSubtitle}>Tocar para tirar nova foto</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                  </>
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={22} color={colors.primary} />
                    <Text style={styles.actionTitle}>Tirar Foto</Text>
                  </>
                )}
              </Pressable>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.sectionTitle}>Localização</Text>
              <Pressable onPress={captureLocation} style={styles.actionBox}>
                <Ionicons
                  name={location ? 'checkmark-circle' : 'locate-outline'}
                  size={22}
                  color={location ? colors.success : colors.primary}
                />
                {location ? (
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>
                      Lat: {location.latitude.toFixed(4)}, Long: {location.longitude.toFixed(4)}
                    </Text>
                    <Text style={styles.actionSubtitle}>
                      Registrado em {new Date(location.capturedAt).toLocaleTimeString()}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.actionTitle}>Obter Localização</Text>
                )}
              </Pressable>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              disabled={!canComplete}
              onPress={handleCompleteVisit}
              style={[styles.completeButton, !canComplete ? styles.completeButtonDisabled : null]}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.onPrimary} size="small" />
              ) : (
                <Ionicons name="checkmark-done" size={20} color={canComplete ? colors.onPrimary : colors.outline} />
              )}
              <Text style={[styles.completeText, !canComplete ? styles.completeTextDisabled : null]}>
                Concluir Visita
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {!isLoading && !point ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error ?? 'Atendimento não encontrado.'}</Text>
        </View>
      ) : null}
    </View>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoBlock}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function getPointStatusBadgeProps(point: RoutePoint, hasDraft: boolean) {
  if (point.status === 'completed' && point.syncStatus === 'synced') {
    return { label: 'Sincronizado', tone: 'success' as const };
  }

  if (point.status === 'completed') {
    return { label: 'Aguardando sync', tone: 'info' as const };
  }

  if (hasDraft) {
    return { label: 'Em atendimento', tone: 'info' as const };
  }

  return { label: 'Pendente', tone: 'warning' as const };
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: 120,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  centerText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  pointCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    borderRadius: radius.default,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  pointCardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  pointTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    flex: 1,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  infoBlock: {
    minWidth: '42%',
  },
  infoLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  infoValue: {
    ...typography.bodyLg,
    color: colors.onSurface,
    marginTop: spacing.xs,
  },
  divider: {
    backgroundColor: colors.outlineVariant,
    height: 1,
  },
  addressRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  addressTextGroup: {
    flex: 1,
  },
  address: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  reference: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  inputFrame: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    borderRadius: radius.default,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 56,
    paddingHorizontal: spacing.md,
  },
  inputFrameError: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.error,
  },
  input: {
    ...typography.bodyLg,
    color: colors.onSurface,
    flex: 1,
  },
  actionBox: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    borderRadius: radius.default,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 68,
    padding: spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  actionSubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  photoPreview: {
    borderRadius: radius.default,
    height: 52,
    width: 52,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
  },
  successText: {
    ...typography.bodyMd,
    color: colors.success,
  },
  footer: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopColor: colors.outlineVariant,
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    padding: spacing.md,
    position: 'absolute',
    right: 0,
  },
  completeButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 56,
  },
  completeButtonDisabled: {
    backgroundColor: colors.surfaceContainer,
  },
  completeText: {
    ...typography.labelLg,
    color: colors.onPrimary,
  },
  completeTextDisabled: {
    color: colors.outline,
  },
  cameraContainer: {
    backgroundColor: '#000000',
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  cameraCloseButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: '#00000066',
    borderRadius: radius.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  captureButton: {
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: colors.onPrimary,
    borderRadius: radius.full,
    borderWidth: 4,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  captureButtonInner: {
    backgroundColor: colors.onPrimary,
    borderRadius: radius.full,
    height: 54,
    width: 54,
  },
});
