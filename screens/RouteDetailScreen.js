import { useRef, useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LeafletMap, { boundsRegion } from '../components/LeafletMap';
import { fetchRouteOrStraight } from '../osrm';
import { formatKm } from '../format';
import { useLocation } from '../location';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme';

// Proporción de la pantalla que ocupa el mapa
const MAP_RATIO = 0.36;

export default function RouteDetailScreen({ route, navigation }) {
  const { routeData } = route.params;
  const { t, language } = useTranslation();
  const { colors, isDark } = useTheme();
  const { height } = useWindowDimensions();
  const { location } = useLocation();
  const mapRef = useRef(null);

  // Sólo las paradas ubicables: así la numeración de la lista coincide con la
  // de los marcadores del mapa
  const places = useMemo(
    () => (routeData.places ?? []).filter((p) => p.lat != null && p.lng != null),
    [routeData.places],
  );

  // Tramos del recorrido tal como lo haría el usuario: ubicación actual → parada
  // 1, parada 1 → 2, etc. legs[i] es lo que hay que recorrer para llegar a la
  // parada i, así que se muestra en su fila.
  const [legs, setLegs] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const points = [
      { lat: location.latitude, lng: location.longitude },
      ...places.map((p) => ({ lat: p.lat, lng: p.lng })),
    ];
    fetchRouteOrStraight(points).then((resolved) => {
      if (!cancelled) setLegs(resolved?.legs ?? []);
    });
    return () => { cancelled = true; };
  }, [places, location.latitude, location.longitude]);

  const totalMeters = legs?.reduce((acc, leg) => acc + leg.distanceMeters, 0) ?? null;

  const geometry = routeData.geometry;
  const hasMap = geometry?.length > 1;

  useEffect(() => {
    if (hasMap) {
      mapRef.current?.fitToCoordinates(geometry, { padding: [40, 30], animate: false });
    }
  }, [geometry, hasMap]);

  const totalDistance = formatKm(totalMeters, language);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.bg }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.backIcon} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {routeData.name}
          </Text>
          {/* Espejo del botón de volver, para que el título quede centrado */}
          <View style={styles.headerBtn} />
        </View>
      </SafeAreaView>

      <View style={{ height: Math.round(height * MAP_RATIO) }}>
        {hasMap ? (
          <LeafletMap
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={boundsRegion(places)}
            routeMarkers={places}
            polylineCoords={geometry}
            isDark={isDark}
            interactive={false}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.noMap, { backgroundColor: colors.noMapBg }]}>
            <Ionicons name="map-outline" size={28} color={colors.noMapText} />
            <Text style={[styles.noMapText, { color: colors.noMapText }]}>{t('location_unavailable')}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('route_stops_title')}</Text>

        {places.map((place, i) => (
          <View
            key={place.id}
            style={[
              styles.stopRow,
              i < places.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
            ]}
          >
            <View style={styles.stopBadge}>
              <Text style={styles.stopBadgeText}>{i + 1}</Text>
            </View>
            <View style={styles.stopInfo}>
              <Text style={[styles.stopName, { color: colors.text }]} numberOfLines={1}>{place.name}</Text>
              {place.address && (
                <Text style={[styles.stopAddr, { color: colors.textSub }]} numberOfLines={1}>{place.address}</Text>
              )}
            </View>
            <Text style={[styles.stopDist, { color: colors.textSub }]}>
              {formatKm(legs?.[i]?.distanceMeters, language) ?? ''}
            </Text>
          </View>
        ))}

        {totalDistance && (
          <View style={[styles.summary, { borderTopColor: colors.border }]}>
            <Text style={[styles.summaryLine, { color: colors.text }]}>
              {t('total_distance', { d: totalDistance })}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.bg }]}>
        <TouchableOpacity
          style={styles.mapBtn}
          onPress={() => navigation.navigate('Mapa', { screen: 'Map', params: { routeData } })}
        >
          <Ionicons name="map" size={17} color="#fff" />
          <Text style={styles.mapBtnText}>{t('view_on_map')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 52, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600' },

  noMap: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  noMapText: { fontSize: 13 },

  list: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },

  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  stopBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#E8611A',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  stopBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stopInfo: { flex: 1 },
  stopName: { fontSize: 15, fontWeight: '600' },
  stopAddr: { fontSize: 12.5, marginTop: 2 },
  stopDist: { fontSize: 13, flexShrink: 0 },

  summary: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    marginTop: 4,
    gap: 4,
  },
  summaryLine: { fontSize: 14, fontWeight: '500' },

  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8611A',
    borderRadius: 28,
    paddingVertical: 15,
    gap: 8,
  },
  mapBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
