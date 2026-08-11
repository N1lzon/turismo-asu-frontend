import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, Image, Modal, Pressable,
  TouchableOpacity, StyleSheet, ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useLocation } from '../location';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LeafletMap from '../components/LeafletMap';
import { BASE_URL, apiFetch } from '../config';
import { fetchRoute } from '../osrm';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme';

const DAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const USER_ROUTES_KEY = '@user_routes';

// Geometrías de rutas ya resueltas, para no repegarle a OSRM en cada foco
const geometryCache = new Map();

// Todas las tarjetas de la lista miden lo mismo: la foto/mapa fija más un cuerpo
// con alto mínimo. El mínimo tiene aire de sobra sobre las 4 líneas del caso más
// largo (título + estado + horario + distancia) para que no dependa de las
// métricas de fuente del dispositivo.
const CARD_IMAGE_HEIGHT = 190;
const CARD_BODY_MIN_HEIGHT = 96;
const CARD_HEIGHT = CARD_IMAGE_HEIGHT + CARD_BODY_MIN_HEIGHT;

function getTodayHours(place) {
  if (!place.opening_hours) return null;
  const dayKey = DAYS_ES[new Date().getDay()];
  return place.opening_hours[dayKey] ?? null;
}

function isOpen(place) {
  const hours = getTodayHours(place);
  if (!hours || hours === 'Cerrado') return hours === 'Cerrado' ? false : null;
  const parts = hours.split(' - ');
  if (parts.length !== 2) return null;
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = parts[0].split(':').map(Number);
  const [ch, cm] = parts[1].split(':').map(Number);
  return minutes >= oh * 60 + om && minutes < ch * 60 + cm;
}

function formatDistance(meters, t) {
  if (meters == null) return '';
  return meters < 1000
    ? t('dist_meters', { n: Math.round(meters) })
    : t('dist_km', { n: (meters / 1000).toFixed(1) });
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getPhoto(item) {
  if (Array.isArray(item.photos) && item.photos.length > 0) return item.photos[0];
  if (typeof item.photo === 'string') return item.photo;
  return null;
}

function formatKm(meters, language) {
  if (meters == null) return null;
  const km = (meters / 1000).toFixed(1);
  return `${language === 'en' ? km : km.replace('.', ',')} km`;
}

// Encuadre inicial de la preview: caja que contiene todas las paradas, con aire
function boundsRegion(places) {
  const lats = places.map((p) => p.lat);
  const lngs = places.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.6, 0.008),
    longitudeDelta: Math.max((maxLng - minLng) * 1.6, 0.008),
  };
}

// Añade a la ruta el trazado y la distancia total. Si OSRM no responde se cae a
// tramos rectos entre paradas, para que la tarjeta igual muestre algo.
async function withGeometry(route) {
  const places = (route.places ?? []).filter((p) => p.lat != null && p.lng != null);
  if (places.length < 2) return route;

  const key = places.map((p) => p.id).join('-');
  if (geometryCache.has(key)) return { ...route, ...geometryCache.get(key) };

  const points = places.map((p) => ({ lat: p.lat, lng: p.lng }));
  const resolved = await fetchRoute(points) ?? {
    geometry: points.map((p) => ({ latitude: p.lat, longitude: p.lng })),
    distanceMeters: points.reduce(
      (acc, p, i) => (i === 0 ? 0 : acc + haversineMeters(points[i - 1].lat, points[i - 1].lng, p.lat, p.lng)),
      0,
    ),
  };
  geometryCache.set(key, resolved);
  return { ...route, ...resolved };
}

// Preview no interactiva del trazado de la ruta
function RouteMapPreview({ places, geometry, placeholder }) {
  const { isDark } = useTheme();
  const mapRef = useRef(null);

  useEffect(() => {
    if (geometry?.length > 1) {
      mapRef.current?.fitToCoordinates(geometry, { padding: [24, 24], animate: false });
    }
  }, [geometry]);

  if (!(geometry?.length > 1)) {
    return <View style={[styles.cardMap, { backgroundColor: placeholder }]} />;
  }

  return (
    <View style={styles.cardMap}>
      <LeafletMap
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={boundsRegion(places)}
        routeMarkers={places}
        polylineCoords={geometry}
        isDark={isDark}
        interactive={false}
      />
    </View>
  );
}

function RouteCard({ item, navigation, t, language, onDelete }) {
  const { colors } = useTheme();
  // Memoizado: si cambia la referencia, LeafletMap reinyecta los marcadores
  const places = useMemo(
    () => (item.places ?? []).filter((p) => p.lat != null && p.lng != null),
    [item.places],
  );
  const stops = item.places?.length ?? item.total_places ?? 0;
  const distanceText = formatKm(item.distanceMeters, language);

  return (
    <TouchableOpacity
      style={[styles.card, styles.routeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('Mapa', { screen: 'Map', params: { routeData: item } })}
    >
      <RouteMapPreview places={places} geometry={item.geometry} placeholder={colors.photoPlaceholder} />
      <View style={styles.routeCardBody}>
        <View style={styles.routeCardInfo}>
          <Text style={[styles.routeCardTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.routeCardMeta, { color: colors.textSub }]}>
            {t('stops_count', { n: stops })}
            {distanceText ? `   ·   ${distanceText}` : ''}
          </Text>
        </View>
        {onDelete && (
          <TouchableOpacity
            style={styles.routeCardAction}
            onPress={() => onDelete(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={19} color="#E8344E" />
          </TouchableOpacity>
        )}
        <Ionicons name="chevron-forward" size={20} color={colors.chevron} />
      </View>
    </TouchableOpacity>
  );
}

function PlaceCard({ item, onPress, navigation, t }) {
  const { colors } = useTheme();
  const open = isOpen(item);
  const todayHours = getTodayHours(item);
  const photo = getPhoto(item);

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.card }]} onPress={onPress} activeOpacity={0.85}>
      {photo
        ? <Image source={{ uri: photo }} style={styles.cardImg} />
        : <View style={[styles.cardImg, { backgroundColor: colors.photoPlaceholder }]} />
      }
      <View style={styles.cardBody}>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
          {open !== null && (
            <Text style={[styles.cardStatus, { color: open ? '#E8611A' : colors.closedColor }]}>
              {open ? t('open_status') : t('closed_status')}
            </Text>
          )}
          {todayHours && todayHours !== 'Cerrado' && (
            <Text style={[styles.cardMeta, { color: colors.textSub }]}>{todayHours} hs.</Text>
          )}
          {item.distance_meters != null && (
            <Text style={[styles.cardMeta, { color: colors.textSub }]}>{formatDistance(item.distance_meters, t)}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.dirBtn}
          onPress={() => navigation.navigate('Mapa', { screen: 'Map', params: { destination: item } })}
        >
          <Text style={styles.dirBtnText}>{t('directions')}</Text>
          <Ionicons name="location" size={13} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function EventCard({ item }) {
  const { colors } = useTheme();
  const photo = getPhoto(item);

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {photo
        ? <Image source={{ uri: photo }} style={styles.cardImg} />
        : <View style={[styles.cardImg, { backgroundColor: colors.photoPlaceholder }]} />
      }
      <View style={styles.cardBody}>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.cardStatus, { color: '#E8611A' }]}>{item.date}</Text>
          {item.start_time && item.end_time && (
            <Text style={[styles.cardMeta, { color: colors.textSub }]}>
              {item.start_time.slice(0, 5)} hs. – {item.end_time.slice(0, 5)} hs.
            </Text>
          )}
          {item.address && <Text style={[styles.cardMeta, { color: colors.textSub }]}>{item.address}</Text>}
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { width: screenWidth } = useWindowDimensions();
  const { t, language } = useTranslation();
  const { colors } = useTheme();

  const CATEGORIES = [
    { tKey: 'cat_gastronomy', key: 'gastronomia', icon: 'restaurant-outline' },
    { tKey: 'cat_places',     key: 'lugares',     icon: 'location-outline'   },
    { tKey: 'cat_lodging',    key: 'hoteles',      icon: 'business-outline'   },
    { tKey: 'cat_events',     key: 'events',     icon: 'calendar-outline'   },
    { tKey: 'cat_routes',     key: 'routes',     icon: 'map-outline'        },
  ];

  const { location: rawLocation, ready: locationReady } = useLocation();
  const location = useMemo(
    () => ({ lat: rawLocation.latitude, lng: rawLocation.longitude }),
    [rawLocation.latitude, rawLocation.longitude],
  );

  const [activeCategory, setActiveCategory] = useState('gastronomia');
  const [routeSubTab, setRouteSubTab] = useState('presets');
  const [deleteModalId, setDeleteModalId] = useState(null);
  const [items, setItems] = useState([]);
  const [userRoutes, setUserRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (activeCategory === 'routes') {
        const res = await apiFetch(`${BASE_URL}/routes/presets`);
        const presets = await res.json();
        const detailed = await Promise.all(
          presets.map((r) => apiFetch(`${BASE_URL}/routes/presets/${r.id}`).then((r2) => r2.json()))
        );
        data = await Promise.all(detailed.map(withGeometry));
      } else {
        const url = activeCategory === 'events'
          ? `${BASE_URL}/events`
          : `${BASE_URL}/places/nearby?lat=${location.lat}&lng=${location.lng}&radius=50000&category=${activeCategory}`;
        const res = await fetch(url);
        const text = await res.text();
        try { data = JSON.parse(text); } catch { throw new Error(text.slice(0, 120)); }
      }
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, location]);

  // No se pide nada hasta tener la ubicación del usuario, para no mostrar
  // lugares calculados desde la ubicación por defecto
  useEffect(() => {
    if (!locationReady) return;
    fetchItems();
  }, [locationReady, fetchItems]);

  const loadUserRoutes = useCallback(async () => {
    const stored = await AsyncStorage.getItem(USER_ROUTES_KEY);
    const saved = stored ? JSON.parse(stored) : [];
    setUserRoutes(await Promise.all(saved.map(withGeometry)));
  }, []);

  // Cargar rutas del usuario cuando se activa la pestaña de rutas
  useEffect(() => {
    if (activeCategory === 'routes') loadUserRoutes();
  }, [activeCategory, loadUserRoutes]);

  useFocusEffect(
    useCallback(() => {
      loadUserRoutes();
    }, [loadUserRoutes])
  );

  const deleteUserRoute = (id) => setDeleteModalId(id);

  const confirmDeleteUserRoute = async () => {
    const updated = userRoutes.filter((r) => r.id !== deleteModalId);
    setDeleteModalId(null);
    setUserRoutes(updated);
    await AsyncStorage.setItem(USER_ROUTES_KEY, JSON.stringify(updated));
  };

  const isUserTab = activeCategory === 'routes' && routeSubTab === 'user';
  const listData = isUserTab ? userRoutes : items;
  const showLoading = (loading || !locationReady) && !isUserTab;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <TouchableOpacity
        style={[styles.searchRow, { backgroundColor: colors.surface }]}
        onPress={() => navigation.navigate('Search')}
        activeOpacity={0.7}
      >
        <Ionicons name="search" size={18} color={colors.placeholder} style={{ marginRight: 8 }} />
        <Text style={[styles.searchPlaceholder, { color: colors.placeholder }]}>{t('search_placeholder')}</Text>
      </TouchableOpacity>

      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.tab, { width: screenWidth / CATEGORIES.length }]}
              onPress={() => setActiveCategory(cat.key)}
            >
              <Ionicons name={cat.icon} size={22} color={active ? '#E8611A' : colors.textSub} />
              <Text style={[styles.tabLabel, { color: active ? '#E8611A' : colors.textSub }, active && styles.tabLabelActive]}>
                {t(cat.tKey)}
              </Text>
              {active && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {activeCategory === 'routes' && (
        <View style={[styles.routeSubTabs, { borderBottomColor: colors.border }]}>
          {[
            { key: 'presets', label: t('routes_app') },
            { key: 'user',    label: t('routes_mine') },
          ].map((tab) => {
            const active = routeSubTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.routeSubTab}
                onPress={() => setRouteSubTab(tab.key)}
              >
                <Text style={[styles.routeSubTabText, { color: active ? '#E8611A' : colors.textSub }, active && styles.routeSubTabTextActive]}>
                  {tab.label}
                </Text>
                {active && <View style={styles.routeSubTabUnderline} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {showLoading
        ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#E8611A" />
        : (
          <FlatList
            data={listData}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) =>
              activeCategory === 'events'
                ? <EventCard item={item} />
                : activeCategory === 'routes'
                  ? <RouteCard
                      item={item}
                      navigation={navigation}
                      t={t}
                      language={language}
                      onDelete={isUserTab ? deleteUserRoute : undefined}
                    />
                  : <PlaceCard item={item} onPress={() => navigation.navigate('PlaceDetail', { place: item })} navigation={navigation} t={t} />
            }
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {error ? `Error: ${error}` : t(isUserTab ? 'no_user_routes' : 'no_results')}
              </Text>
            }
          />
        )
      }

      <Modal
        visible={deleteModalId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalId(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setDeleteModalId(null)}>
          <Pressable style={[styles.modalBox, { backgroundColor: colors.modalBg }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.textSub, borderBottomColor: colors.modalBorder }]}>
              {t('delete_route_title')}
            </Text>
            <View style={[styles.modalItem, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalMsg, { color: colors.textSub }]}>{t('delete_route_confirm')}</Text>
            </View>
            <TouchableOpacity
              style={[styles.modalItem, { justifyContent: 'center', borderBottomColor: colors.border }]}
              onPress={confirmDeleteUserRoute}
              activeOpacity={0.7}
            >
              <Text style={styles.modalDestructiveText}>{t('delete')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setDeleteModalId(null)}>
              <Text style={[styles.modalCancelText, { color: colors.textMuted }]}>{t('cancel')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 44,
  },
  searchPlaceholder: { flex: 1, fontSize: 15 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 3,
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  tabLabelActive: { fontWeight: '600' },
  tabUnderline: {
    position: 'absolute',
    bottom: 0, left: 6, right: 6,
    height: 2,
    backgroundColor: '#E8611A',
    borderRadius: 1,
  },
  routeSubTabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  routeSubTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  routeSubTabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  routeSubTabTextActive: { fontWeight: '700' },
  routeSubTabUnderline: {
    position: 'absolute',
    bottom: 0, left: 20, right: 20,
    height: 2,
    backgroundColor: '#E8611A',
    borderRadius: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 12,
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardImg: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
  },
  routeCard: {
    height: CARD_HEIGHT,
    borderWidth: StyleSheet.hairlineWidth,
  },
  // El mapa toma el alto que le deja el cuerpo, así la tarjeta cierra en CARD_HEIGHT
  cardMap: {
    width: '100%',
    flex: 1,
  },
  routeCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  routeCardInfo: { flex: 1 },
  routeCardTitle: { fontSize: 16, fontWeight: '600' },
  routeCardMeta: { fontSize: 12.5, marginTop: 3 },
  routeCardAction: { padding: 2 },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 10,
    paddingTop: 8,
    minHeight: CARD_BODY_MIN_HEIGHT,
  },
  cardInfo: { flex: 1, marginRight: 10 },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  cardStatus: { fontSize: 13, marginTop: 2, fontWeight: '500' },
  cardMeta: { fontSize: 12, marginTop: 1 },
  dirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8611A',
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 14,
    gap: 5,
  },
  dirBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  emptyText: { textAlign: 'center', marginTop: 60, fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '82%',
    borderRadius: 16,
    paddingTop: 20,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalMsg: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  modalDestructiveText: {
    fontSize: 16,
    color: '#E8344E',
    fontWeight: '600',
  },
  modalCancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 15 },
});
