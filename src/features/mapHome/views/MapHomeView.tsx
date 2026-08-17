import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PointsSheetView } from '../../points/views/PointsSheetView';
import { RoutesSheetView } from '../../routes/views/RoutesSheetView';
import { VisitDetailSheetView } from '../../visitDetail/views/VisitDetailSheetView';
import { useConnectivityViewModel } from '../viewModels/ConnectivityViewModel';
import { useMapHomeViewModel, MapHomeTab } from '../viewModels/MapHomeViewModel';
import { RoutePoint, RouteSummary } from '../../../model/entities/Route';
import { colors, radius, spacing, typography } from '../../../shared/theme';

const fortalezaRegion = {
  latitude: -3.7319,
  longitude: -38.5267,
  latitudeDelta: 0.09,
  longitudeDelta: 0.06,
};

const screenHeight = Dimensions.get('window').height;
const tabBarHeight = 55;
const sheetHeights = {
  collapsed: Math.round(screenHeight * 0.14),
  medium: Math.round(screenHeight * 0.35),
  expanded: Math.round(screenHeight * 0.75),
} as const;

type SheetPosition = keyof typeof sheetHeights;
type SheetMode = MapHomeTab | 'visitDetail';
type RouteSegmentState = 'completed' | 'pending';
type PointMarkerState = 'completed' | 'pendingSync' | 'pending';

function buildRouteSegments(points: RoutePoint[]) {
  return points.slice(0, -1).map((point, index) => {
    const nextPoint = points[index + 1];
    const state: RouteSegmentState =
      point.status === 'completed' && nextPoint.status === 'completed' ? 'completed' : 'pending';

    return {
      key: `${point.id}-${nextPoint.id}`,
      state,
      coordinates: [
        { latitude: point.latitude, longitude: point.longitude },
        { latitude: nextPoint.latitude, longitude: nextPoint.longitude },
      ],
    };
  });
}

function getPointMarkerState(point: RoutePoint): PointMarkerState {
  if (point.status === 'completed' && point.syncStatus === 'synced') return 'completed';
  if (point.status === 'completed') return 'pendingSync';
  return 'pending';
}

function getRouteSegmentColor(state: RouteSegmentState) {
  if (state === 'completed') return colors.success;
  return colors.warning;
}

function getRouteRegion(points: RoutePoint[]): Region {
  if (points.length === 0) return fortalezaRegion;

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max((maxLatitude - minLatitude) * 1.6, 0.025),
    longitudeDelta: Math.max((maxLongitude - minLongitude) * 1.6, 0.025),
  };
}

function getPointRegion(point: RoutePoint): Region {
  const latitudeDelta = 0.008;

  return {
    latitude: point.latitude - latitudeDelta * 0.25,
    longitude: point.longitude,
    latitudeDelta,
    longitudeDelta: 0.008,
  };
}

export function MapHomeView() {
  const insets = useSafeAreaInsets();
  const {
    activeTab,
    routes,
    points,
    selectedRouteId,
    isLoading,
    isImporting,
    isSyncing,
    error,
    importMessage,
    syncMessage,
    reload,
    setActiveTab,
    selectRoute,
    deleteRoute,
    importRoute,
    syncPendingVisits,
    clearTransientMessages,
  } = useMapHomeViewModel();
  const { isOnline, isChecking } = useConnectivityViewModel();
  const [sheetMode, setSheetMode] = useState<SheetMode>('routes');
  const [selectedPointId, setSelectedPointId] = useState<number | null>(null);
  const [inProgressPointIds, setInProgressPointIds] = useState<number[]>([]);
  const [sheetPosition, setSheetPosition] = useState<SheetPosition>('medium');
  const mapRef = useRef<MapView>(null);
  const sheetPositionRef = useRef<SheetPosition>('medium');
  const sheetHeight = useRef(new Animated.Value(sheetHeights.medium)).current;
  const currentSheetHeight = useRef<number>(sheetHeights.medium);
  const dragStartSheetHeight = useRef<number>(sheetHeights.medium);
  const previousOnlineState = useRef<boolean | null>(null);
  const [statusBottom, setStatusBottom] = useState(insets.top + spacing.sm + 26);
  const bottomInset = Math.max(insets.bottom, spacing.sm);
  const tabBarTotalHeight = tabBarHeight + bottomInset;
  const brandBottom = Animated.add(sheetHeight, tabBarTotalHeight);
  const selectedRouteSummary = routes.find((route) => route.routeId === selectedRouteId) ?? null;
  const routeSegments = buildRouteSegments(points);

  useEffect(() => {
    void reload(selectedRouteId);
  }, [reload, selectedRouteId]);

  useEffect(() => {
    const wasOnline = previousOnlineState.current;
    previousOnlineState.current = isOnline;

    if (wasOnline === false && isOnline) {
      void syncPendingVisits({ silent: true });
    }
  }, [isOnline, syncPendingVisits]);

  useEffect(() => {
    if (points.length === 0 || selectedPointId) {
      return;
    }

    mapRef.current?.animateToRegion(getRouteRegion(points), 450);
  }, [points, selectedPointId]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
        onPanResponderGrant: () => {
          dragStartSheetHeight.current = currentSheetHeight.current;
          sheetHeight.stopAnimation((value) => {
            currentSheetHeight.current = value;
            dragStartSheetHeight.current = value;
          });
        },
        onPanResponderMove: (_, gesture) => {
          const nextHeight = clampSheetHeight(dragStartSheetHeight.current - gesture.dy);
          currentSheetHeight.current = nextHeight;
          sheetHeight.setValue(nextHeight);
        },
        onPanResponderRelease: (_, gesture) => {
          const isTap = Math.abs(gesture.dy) < 8 && Math.abs(gesture.dx) < 8;

          if (isTap) {
            cycleSheetPositionFromHeader(sheetPositionRef.current);
            return;
          }

          const nextPosition = resolveNearestSheetPosition(currentSheetHeight.current, gesture.vy);
          animateSheetTo(nextPosition);
        },
        onPanResponderTerminate: () => {
          const nextPosition = resolveNearestSheetPosition(currentSheetHeight.current, 0);
          animateSheetTo(nextPosition);
        },
      }),
    [sheetHeight],
  );

  const isCollapsed = sheetPosition === 'collapsed';

  function animateSheetTo(position: SheetPosition) {
    sheetPositionRef.current = position;
    setSheetPosition(position);
    currentSheetHeight.current = sheetHeights[position];
    Animated.spring(sheetHeight, {
      toValue: sheetHeights[position],
      useNativeDriver: false,
      tension: 50,
      friction: 10,
    }).start();
  }

  function collapseExpandedSheetToMedium() {
    if (sheetPosition === 'expanded') {
      animateSheetTo('medium');
    }
  }

  function cycleSheetPositionFromHeader(currentPosition: SheetPosition) {
    if (currentPosition === 'collapsed') {
      animateSheetTo('medium');
      return;
    }

    if (currentPosition === 'medium') {
      animateSheetTo('expanded');
      return;
    }

    animateSheetTo('medium');
  }

  function expandSheetOneStep() {
    if (sheetPositionRef.current === 'collapsed') {
      animateSheetTo('medium');
      return;
    }

    if (sheetPositionRef.current === 'medium') {
      animateSheetTo('expanded');
      return;
    }

    if (sheetPositionRef.current === 'expanded') {
      animateSheetTo('collapsed');
    }
  }

  function handleTabPress(tab: MapHomeTab) {
    clearTransientMessages();

    if (sheetMode === tab && activeTab === tab) {
      expandSheetOneStep();
      return;
    }

    setSheetMode(tab);
    setActiveTab(tab);
  }

  function handleSelectRoute(routeId: string) {
    clearTransientMessages();
    void selectRoute(routeId);

    if (selectedRouteId === routeId) {
      setSheetMode('points');
      return;
    }

    if (selectedRouteId !== routeId && sheetPositionRef.current === 'expanded') {
      animateSheetTo('medium');
    }
  }

  function focusRouteOnMap() {
    if (points.length === 0) {
      mapRef.current?.animateToRegion(fortalezaRegion, 450);
      return;
    }

    mapRef.current?.animateToRegion(getRouteRegion(points), 450);
  }

  function handleDeleteRoute(routeId: string) {
    clearTransientMessages();
    Alert.alert(
      'Excluir rota',
      'Isso vai apagar a rota e todas as informações associadas a ela neste dispositivo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            void deleteRoute(routeId);
          },
        },
      ],
    );
  }

  function handleSelectPointFromList(pointId: number) {
    clearTransientMessages();
    setSelectedPointId(pointId);
    setSheetMode('visitDetail');
  }

  function handleSelectPointFromMap(point: RoutePoint) {
    clearTransientMessages();
    setSelectedPointId(point.id);
    setSheetMode('visitDetail');
    animateSheetTo('medium');
    mapRef.current?.animateToRegion(getPointRegion(point), 450);
  }

  function handleCloseVisitDetail() {
    setSelectedPointId(null);
    setSheetMode('points');
    setActiveTab('points');
    focusRouteOnMap();
  }

  function handleVisitCompleted() {
    if (isOnline) {
      void syncPendingVisits({ silent: true });
    } else {
      void reload(selectedRouteId);
    }

    handleCloseVisitDetail();
  }

  function handleManualSync() {
    clearTransientMessages();

    if (!isOnline) {
      Alert.alert(
        'Sem conexão',
        'As visitas continuam salvas no dispositivo e serão sincronizadas quando a internet voltar.',
      );
      return;
    }

    void syncPendingVisits();
  }

  function handleDraftChange(pointId: number, hasDraft: boolean) {
    setInProgressPointIds((current) => {
      if (hasDraft && !current.includes(pointId)) {
        return [...current, pointId];
      }

      if (!hasDraft) {
        return current.filter((currentPointId) => currentPointId !== pointId);
      }

      return current;
    });
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFill}
        initialRegion={fortalezaRegion}
        onPanDrag={() => {
          clearTransientMessages();
          collapseExpandedSheetToMedium();
        }}
        onPress={() => {
          clearTransientMessages();
          collapseExpandedSheetToMedium();
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {routeSegments.map((segment) => (
          <Polyline
            key={segment.key}
            coordinates={segment.coordinates}
            strokeColor={getRouteSegmentColor(segment.state)}
            strokeWidth={segment.state === 'pending' ? 5 : 6}
          />
        ))}

        {points.map((point) => {
          const markerState = getPointMarkerState(point);

          return (
            <Marker
              key={point.id}
              coordinate={{ latitude: point.latitude, longitude: point.longitude }}
              title={point.customer}
              description={point.installationCode}
              onPress={() => handleSelectPointFromMap(point)}
            >
              <View style={[styles.marker, styles[`${markerState}Marker`]]}>
                <Text style={[styles.markerText, markerState === 'pending' ? styles.pendingMarkerText : null]}>
                  {point.order}
                </Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.topActions}>
          <View
            style={styles.statusPillFrame}
            onLayout={(event) => {
              const { y, height } = event.nativeEvent.layout;
              setStatusBottom(insets.top + y + height);
            }}
          >
            <View style={[styles.onlineBadge, !isOnline ? styles.offlineBadge : null]}>
              <View style={[styles.onlineDot, !isOnline ? styles.offlineDot : null]} />
              <Text style={[styles.onlineText, !isOnline ? styles.offlineText : null]}>
                {isChecking ? 'Checando' : isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
          <Pressable
            disabled={isSyncing}
            onPress={handleManualSync}
            style={[styles.syncIconButton, !isOnline ? styles.syncIconButtonOffline : null]}
          >
            {isSyncing ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Ionicons name="sync" size={22} color={colors.primary} />
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      <Animated.View pointerEvents="none" style={[styles.brandMark, { bottom: brandBottom }]}>
        <Image
          source={require('../../../../assets/branding/nuven-route-logo.png')}
          style={styles.brandLogo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            bottom: tabBarTotalHeight,
            height: sheetHeight,
          },
        ]}
      >
        <View {...panResponder.panHandlers} style={styles.sheetHandleArea}>
          <View style={styles.grabber} />
          {sheetMode !== 'visitDetail' ? (
            <ProgressSheetHeader
              activeTab={activeTab}
              routes={routes}
              points={points}
              selectedRouteSummary={selectedRouteSummary}
              sheetPosition={sheetPosition}
              isImporting={isImporting}
              onImportRoute={importRoute}
            />
          ) : null}
        </View>

        {!isCollapsed ? (
          <>
            {isLoading ? (
              <View style={styles.stateContainer}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.stateText}>Carregando rota local...</Text>
              </View>
            ) : null}

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Não foi possível carregar</Text>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={() => reload()} style={styles.retryButton}>
                  <Text style={styles.retryText}>Tentar novamente</Text>
                </Pressable>
              </View>
            ) : null}

            {!isLoading && !error && sheetMode === 'routes' ? (
              <RoutesSheetView
                routes={routes}
                selectedRouteId={selectedRouteId}
                importMessage={importMessage}
                syncMessage={syncMessage}
                onInteract={clearTransientMessages}
                onSelectRoute={handleSelectRoute}
                onDeleteRoute={handleDeleteRoute}
              />
            ) : null}

            {!isLoading && !error && sheetMode === 'points' ? (
              <PointsSheetView
                points={points}
                inProgressPointIds={inProgressPointIds}
                onGoToRoutes={() => {
                  setSheetMode('routes');
                  setActiveTab('routes');
                }}
                onSelectPoint={handleSelectPointFromList}
              />
            ) : null}

            {!isLoading && !error && sheetMode === 'visitDetail' && selectedPointId ? (
              <VisitDetailSheetView
                pointId={selectedPointId}
                onClose={handleCloseVisitDetail}
                onCompleted={handleVisitCompleted}
                onDraftChange={handleDraftChange}
              />
            ) : null}
          </>
        ) : null}
      </Animated.View>

      <View style={[styles.tabBar, { height: tabBarTotalHeight, paddingBottom: bottomInset - 8 }]}>
        <AppTab
          type="route"
          label="Rotas"
          isActive={activeTab === 'routes'}
          onPress={() => handleTabPress('routes')}
        />
        <AppTab
          type="point"
          label="Pontos"
          isActive={activeTab === 'points'}
          onPress={() => handleTabPress('points')}
        />
      </View>
    </View>
  );
}

function clampSheetHeight(height: number) {
  return Math.min(sheetHeights.expanded, Math.max(sheetHeights.collapsed, height));
}

function resolveNearestSheetPosition(height: number, velocityY: number): SheetPosition {
  if (velocityY < -0.9) return 'expanded';
  if (velocityY > 0.9) return 'collapsed';

  const positions = Object.keys(sheetHeights) as SheetPosition[];
  return positions.reduce((nearest, position) => {
    const nearestDistance = Math.abs(sheetHeights[nearest] - height);
    const positionDistance = Math.abs(sheetHeights[position] - height);
    return positionDistance < nearestDistance ? position : nearest;
  }, 'medium');
}

function ProgressSheetHeader({
  activeTab,
  routes,
  points,
  selectedRouteSummary,
  sheetPosition,
  isImporting,
  onImportRoute,
}: {
  activeTab: MapHomeTab;
  routes: RouteSummary[];
  points: RoutePoint[];
  selectedRouteSummary: RouteSummary | null;
  sheetPosition: SheetPosition;
  isImporting: boolean;
  onImportRoute: () => void;
}) {
  const progress =
    activeTab === 'routes' ? getRoutesProgress(routes) : getPointsProgress(points, selectedRouteSummary);
  const completedPercent = getProgressPercent(progress.completed, progress.total);
  const pendingSyncPercent = getProgressPercent(progress.pendingSync, progress.total);
  const pendingPercent = getProgressPercent(progress.pending, progress.total);
  const title = activeTab === 'routes' ? 'Rotas salvas no dispositivo' : 'Pontos de visita na rota';
  const rightLabel =
    activeTab === 'routes'
      ? formatRouteCount(routes.length).replace(' adicionada', '').replace(' adicionadas', '')
      : formatVisitProgress(progress.completed + progress.pendingSync, progress.total);

  return (
    <View style={styles.progressHeaderContainer}>
      <View style={styles.previewHeader}>
        <View>
          <Text style={styles.previewTitle}>{title}</Text>
          <Text style={styles.previewCount}>{rightLabel}</Text>
        </View>
        {activeTab === 'routes' && sheetPosition !== 'collapsed' ? (
          <Pressable
            accessibilityLabel={routes.length === 0 ? 'Carregar rota dos assets' : 'Importar rota JSON'}
            disabled={isImporting}
            onPress={(event) => {
              event.stopPropagation();
              onImportRoute();
            }}
            style={[styles.headerAddButton, isImporting ? styles.headerAddButtonDisabled : null]}
          >
            {isImporting ? (
              <ActivityIndicator color={colors.onPrimary} size="small" />
            ) : (
              <Ionicons name="add" size={24} color={colors.onPrimary} />
            )}
          </Pressable>
        ) : null}
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressCompleted, { width: `${completedPercent}%` }]} />
        <View style={[styles.progressPendingSync, { width: `${pendingSyncPercent}%` }]} />
        <View style={[styles.progressPending, { width: `${pendingPercent}%` }]} />
      </View>

      <View style={styles.previewLegend}>
        <LegendItem color={colors.success} label={`${progress.completed} concluídas`} />
        <LegendItem color={colors.primary} label={`${progress.pendingSync} ag. sync`} />
        <LegendItem color={colors.warning} label={`${progress.pending} pendentes`} />
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function getProgressPercent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (value / total) * 100));
}

function getRoutesProgress(routes: RouteSummary[]) {
  return routes.reduce(
    (progress, route) => {
      if (route.pendingPoints > 0) {
        progress.pending += 1;
      } else if (route.pendingSync > 0) {
        progress.pendingSync += 1;
      } else if (route.totalPoints > 0) {
        progress.completed += 1;
      }

      progress.total += 1;
      return progress;
    },
    { completed: 0, pendingSync: 0, pending: 0, total: 0 },
  );
}

function getPointsProgress(points: RoutePoint[], selectedRouteSummary: RouteSummary | null) {
  const total = selectedRouteSummary?.totalPoints ?? points.length;
  const completedRaw = selectedRouteSummary?.completedPoints ?? points.filter((point) => point.status === 'completed').length;
  const pendingSync = selectedRouteSummary?.pendingSync ?? 0;
  const completed = Math.max(completedRaw - pendingSync, 0);
  const pending = Math.max(total - completedRaw, 0);

  return { completed, pendingSync, pending, total };
}

function formatVisitProgress(completedCount: number, totalPoints: number) {
  if (totalPoints === 0) return 'Nenhuma visita';
  if (totalPoints === 1) return '1 visita';
  return `${totalPoints} visitas`;
}

function formatRouteCount(routesCount: number) {
  if (routesCount === 0) return 'Nenhuma rota adicionada';
  if (routesCount === 1) return '1 rota adicionada';
  return `${routesCount} rotas adicionadas`;
}

function formatPointCount(pointsCount: number) {
  if (pointsCount === 0) return 'Nenhuma rota selecionada';
  if (pointsCount === 1) return '1 ponto na sequência da rota';
  return `${pointsCount} pontos na sequência da rota`;
}

type AppTabProps = {
  type: 'route' | 'point';
  label: string;
  isActive: boolean;
  onPress: () => void;
};

function AppTab({ type, label, isActive, onPress }: AppTabProps) {
  return (
    <Pressable style={styles.appTab} onPress={onPress}>
      <View style={[styles.appTabIconPill, isActive ? styles.activeAppTabIconPill : null]}>
        {type === 'route' ? (
          <MaterialIcons name="route" size={24} color={isActive ? colors.primary : colors.onSurfaceVariant} />
        ) : (
          <Ionicons name="location" size={24} color={isActive ? colors.primary : colors.onSurfaceVariant} />
        )}
      </View>
      <Text style={[styles.appTabText, isActive ? styles.activeAppTabText : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topActions: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
    marginRight: spacing.md,
    marginTop: 0,
  },
  statusPillFrame: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    borderRadius: radius.full,
    borderWidth: 1,
    padding: 3,
  },
  onlineBadge: {
    alignItems: 'center',
    backgroundColor: colors.successContainer,
    borderRadius: radius.full,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  onlineDot: {
    backgroundColor: colors.success,
    borderRadius: radius.full,
    height: 8,
    width: 8,
  },
  onlineText: {
    ...typography.labelSm,
    color: colors.success,
  },
  offlineBadge: {
    backgroundColor: colors.errorContainer,
  },
  offlineDot: {
    backgroundColor: colors.error,
  },
  offlineText: {
    color: colors.error,
  },
  syncIconButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    borderRadius: radius.full,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  syncIconButtonOffline: {
    opacity: 0.55,
  },
  brandMark: {
    left: spacing.md,
    position: 'absolute',
  },
  brandLogo: {
    height: 40,
    width: 120,
  },
  sheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    left: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    position: 'absolute',
    right: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 10,
  },
  sheetHandleArea: {
    gap: spacing.xs,
  },
  grabber: {
    alignSelf: 'center',
    backgroundColor: colors.outlineVariant,
    borderRadius: radius.full,
    height: 4,
    marginBottom: spacing.sm,
    width: 44,
  },
  stateContainer: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  stateText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  errorContainer: {
    backgroundColor: colors.errorContainer,
    borderRadius: radius.default,
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  errorTitle: {
    ...typography.headlineSm,
    color: colors.error,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  retryButton: {
    alignSelf: 'flex-start',
    minHeight: 48,
    justifyContent: 'center',
  },
  retryText: {
    ...typography.labelLg,
    color: colors.primary,
  },
  headerAddButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  headerAddButtonDisabled: {
    opacity: 0.7,
  },
  progressHeaderContainer: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  previewHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  previewCount: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  progressTrack: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.full,
    flexDirection: 'row',
    height: 7,
    overflow: 'hidden',
  },
  progressCompleted: {
    backgroundColor: colors.success,
    height: '100%',
  },
  progressPendingSync: {
    backgroundColor: colors.primary,
    height: '100%',
  },
  progressPending: {
    backgroundColor: colors.warning,
    height: '100%',
  },
  previewLegend: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  legendDot: {
    borderRadius: radius.full,
    height: 9,
    width: 9,
  },
  legendText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textTransform: 'capitalize',
  },
  tabBar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    // borderTopColor: colors.outlineVariant,
    borderTopWidth: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    left: 0,
    paddingTop: spacing.sm,
    position: 'absolute',
    right: 0,
  },
  appTab: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
  },
  appTabIconPill: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 36,
    justifyContent: 'center',
    width: 76,
  },
  activeAppTabIconPill: {
    backgroundColor: colors.surfaceContainer,
  },
  appTabText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  activeAppTabText: {
    color: colors.onSurface,
  },
  marker: {
    alignItems: 'center',
    borderColor: colors.surfaceContainerLowest,
    borderRadius: radius.full,
    borderWidth: 3,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  completedMarker: {
    backgroundColor: colors.success,
  },
  pendingSyncMarker: {
    backgroundColor: colors.primary,
  },
  pendingMarker: {
    backgroundColor: colors.warning,
  },
  markerText: {
    ...typography.labelLg,
    color: colors.onPrimary,
  },
  pendingMarkerText: {
    color: colors.onSurface,
  },
});
