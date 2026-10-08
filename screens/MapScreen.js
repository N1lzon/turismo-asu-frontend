import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, Linking, Image, Alert,
} from 'react-native';
import LeafletMap from '../components/LeafletMap';
import RouteSheet, { SHEET_COLLAPSED_HEIGHT } from '../components/RouteSheet';
import { useLocation, resolvePosition } from '../location';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BASE_URL, apiFetch } from '../config';
import { OSRM_BASE } from '../osrm';
import { getPhoto, isOpen, formatTodayHours, formatDistance } from '../place';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme';

const ASUNCION = {
  latitude: -25.2867,
  longitude: -57.647,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// Tarjeta inferior con el lugar tocado en el mapa
function PlacePreviewCard({ place, onClose, onDetails, onDirections }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const photo = getPhoto(place);
  const open = isOpen(place);
  const hours = formatTodayHours(place, t);
  const distance = formatDistance(place.distance_meters, t);
  const meta = [hours, distance].filter(Boolean).join('  ·  ');

  return (
    <View style={[styles.previewCard, { backgroundColor: colors.modalBg }]}>
      <TouchableOpacity style={styles.previewTop} onPress={onDetails} activeOpacity={0.8}>
        {photo
          ? <Image source={{ uri: photo }} style={styles.previewPhoto} />
          : (
            <View style={[styles.previewPhoto, styles.previewPhotoEmpty, { backgroundColor: colors.photoPlaceholder }]}>
              <Ionicons name="image-outline" size={22} color={colors.textMuted} />
            </View>
          )
        }
        <View style={styles.previewInfo}>
          <Text style={[styles.previewName, { color: colors.text }]} numberOfLines={2}>{place.name}</Text>
          {open !== null && (
            <Text style={[styles.previewStatus, { color: open ? '#E8611A' : colors.closedColor }]}>
              {open ? t('open_status') : t('closed_status')}
            </Text>
          )}
          {meta ? (
            <Text style={[styles.previewMeta, { color: colors.textSub }]} numberOfLines={1}>{meta}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.previewClose}
        >
          <Ionicons name="close" size={20} color={colors.textSub} />
        </TouchableOpacity>
      </TouchableOpacity>

      <View style={styles.previewBtns}>
        <TouchableOpacity
          style={[styles.previewBtn, styles.previewBtnOutline, { borderColor: colors.borderMid }]}
          onPress={onDetails}
          activeOpacity={0.85}
        >
          <Ionicons name="information-circle-outline" size={17} color={colors.text} />
          <Text style={[styles.previewBtnText, { color: colors.text }]}>{t('view_details')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.previewBtn, styles.previewBtnPrimary]}
          onPress={onDirections}
          activeOpacity={0.85}
        >
          <Ionicons name="navigate" size={16} color="#fff" />
          <Text style={[styles.previewBtnText, { color: '#fff' }]}>{t('directions')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MapScreen({ route, navigation }) {
  const mapRef = useRef(null);
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [region, setRegion] = useState(ASUNCION);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [routePolyline, setRoutePolyline] = useState([]);
  const [routePlaces, setRoutePlaces] = useState([]);
  const [currentRouteData, setCurrentRouteData] = useState(null);
  const [locating, setLocating] = useState(false);
  const {
    location: userLocation,
    locationRef: userLocationRef,
    setLocation: setUserLocation,
    ready: locationReady,
  } = useLocation();
  // Último routeData cargado. Se compara por referencia: cada navegación trae un
  // objeto nuevo (p. ej. la misma ruta recién editada) y hay que volver a pintarla
  const lastLoadedRouteRef = useRef(null);
  const didInitRef = useRef(false);
  const locatingRef = useRef(false);

  // Espejo de routePlaces para poder consultarlo desde efectos y callbacks
  // sin volver a crearlos en cada cambio
  const routePlacesRef = useRef(routePlaces);
  routePlacesRef.current = routePlaces;

  // Centrado inicial + carga de cercanos: una sola vez, cuando la ubicación ya
  // está resuelta. Las actualizaciones posteriores (botón de centrar) no deben
  // repetir esto, o pisarían el zoom y los marcadores de la ruta en curso.
  useEffect(() => {
    if (!locationReady || didInitRef.current) return;
    didInitRef.current = true;

    const hasRoute = routePlacesRef.current.length > 0
      || route?.params?.routeData?.places?.length > 0
      || route?.params?.destination != null;
    if (hasRoute) return;

    const loc = userLocationRef.current;
    if (loc) {
      const userRegion = { ...loc, latitudeDelta: 0.05, longitudeDelta: 0.05 };
      setRegion(userRegion);
      mapRef.current?.animateToRegion(userRegion, 500);
      fetchNearby(loc.latitude, loc.longitude);
    } else {
      fetchNearby(ASUNCION.latitude, ASUNCION.longitude);
    }
  }, [locationReady]);

  useFocusEffect(
    useCallback(() => {
      mapRef.current?.invalidateSize();
      const routeData = route?.params?.routeData;
      if (routeData?.places?.length > 0 && lastLoadedRouteRef.current !== routeData) {
        lastLoadedRouteRef.current = routeData;
        setSelectedPlace(null);
        setRoutePlaces(routeData.places);
        setCurrentRouteData(routeData);
        setPlaces([]);
        loadRouteOnMap(routeData.places);
      }
    }, [route?.params?.routeData])
  );

  useEffect(() => {
    const destination = route?.params?.destination;
    if (destination?.lat != null) {
      navigation.setParams({ destination: null });
      routeToDestination(destination);
    }
  }, [route?.params?.destination]);

  const routeToDestination = async (dest) => {
    setSelectedPlace(null);
    setCurrentRouteData(null);
    setLoading(true);
    setPlaces([]);
    setRoutePolyline([]);
    setRoutePlaces([dest]);

    let originLat = ASUNCION.latitude;
    let originLng = ASUNCION.longitude;
    if (userLocationRef.current) {
      originLat = userLocationRef.current.latitude;
      originLng = userLocationRef.current.longitude;
    }

    const origin = { lat: originLat, lng: originLng };
    const pts = [origin, { lat: dest.lat, lng: dest.lng }];
    const coordStr = pts.map((p) => `${p.lng},${p.lat}`).join(';');
    try {
      const res = await fetch(`${OSRM_BASE}/${coordStr}?overview=full&geometries=geojson`);
      const data = await res.json();
      if (data.routes?.[0]?.geometry?.coordinates) {
        setRoutePolyline(data.routes[0].geometry.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng })));
      }
    } catch {
      setRoutePolyline(pts.map((p) => ({ latitude: p.lat, longitude: p.lng })));
    } finally {
      setLoading(false);
    }
    setTimeout(() => {
      mapRef.current?.invalidateSize();
      mapRef.current?.fitToCoordinates(
        pts.map((p) => ({ latitude: p.lat, longitude: p.lng })),
        { edgePadding: { top: 80, right: 50, bottom: 120, left: 50 }, animated: true }
      );
    }, 300);
  };

  const loadRouteOnMap = async (pts) => {
    const validPts = pts.filter((p) => p.lat != null && p.lng != null);
    if (validPts.length < 2) {
      setLoading(false);
      return;
    }

    const userLoc = userLocationRef.current;
    const osrmPts = userLoc
      ? [{ lat: userLoc.latitude, lng: userLoc.longitude }, ...validPts]
      : validPts;

    const coordStr = osrmPts.map((p) => `${p.lng},${p.lat}`).join(';');
    setLoading(true);
    try {
      const res = await fetch(`${OSRM_BASE}/${coordStr}?overview=full&geometries=geojson`);
      const data = await res.json();
      if (data.routes?.[0]?.geometry?.coordinates) {
        setRoutePolyline(data.routes[0].geometry.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng })));
      }
    } catch {
      setRoutePolyline(osrmPts.map((p) => ({ latitude: p.lat, longitude: p.lng })));
    } finally {
      setLoading(false);
    }

    const fitPts = osrmPts.map((p) => ({ latitude: p.lat, longitude: p.lng }));
    setTimeout(() => {
      mapRef.current?.invalidateSize();
      mapRef.current?.fitToCoordinates(fitPts, {
        edgePadding: { top: 80, right: 50, bottom: 120, left: 50 }, animated: true,
      });
    }, 300);
  };

  const clearRoute = () => {
    setRoutePolyline([]);
    setRoutePlaces([]);
    setCurrentRouteData(null);
    lastLoadedRouteRef.current = null;
    navigation.setParams({ routeData: null });
  };

  const openInExternalApp = () => {
    let url;
    if (routePlaces.length > 1) {
      const stops = routePlaces.map((p) => `${p.lat},${p.lng}`).join('/');
      url = `https://www.google.com/maps/dir/${stops}`;
    } else {
      const dest = routePlaces[0];
      const label = encodeURIComponent(dest.name ?? '');
      url = `geo:${dest.lat},${dest.lng}?q=${dest.lat},${dest.lng}(${label})`;
    }
    Linking.openURL(url).catch(() => Alert.alert(t('open_external_error')));
  };

  const fetchNearby = async (lat, lng) => {
    setLoading(true);
    try {
      const res = await apiFetch(`${BASE_URL}/places/nearby?lat=${lat}&lng=${lng}&radius=500`);
      const data = JSON.parse(await res.text());
      setPlaces(Array.isArray(data) ? data : []);
    } catch {
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  const centerMapOn = (loc) =>
    mapRef.current?.animateToRegion({ ...loc, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 500);

  const centerOnUser = async () => {
    // Con una ruta en pantalla el botón sólo mueve la cámara: no se vuelve a
    // pedir el GPS ni se toca la ubicación compartida, así la ruta y el punto
    // azul quedan como están
    if (routePlacesRef.current.length > 0 && userLocationRef.current) {
      centerMapOn(userLocationRef.current);
      return;
    }

    if (locatingRef.current) return;
    locatingRef.current = true;
    setLocating(true);
    try {
      // Centra con el fix rápido y vuelve a centrar cuando llega el preciso
      await resolvePosition((loc) => {
        setUserLocation(loc);
        centerMapOn(loc);
      });
    } catch {
      // Sin permiso o el GPS no respondió a tiempo: el mapa se queda donde está
    } finally {
      locatingRef.current = false;
      setLocating(false);
      // Los cercanos sólo se refrescan fuera del modo ruta, para no tapar la ruta
      const loc = userLocationRef.current;
      if (loc && routePlacesRef.current.length === 0) fetchNearby(loc.latitude, loc.longitude);
    }
  };

  const focusPlace = (place) => {
    setSelectedPlace(place);
    mapRef.current?.animateToRegion({
      latitude: place.lat, longitude: place.lng,
      latitudeDelta: 0.01, longitudeDelta: 0.01,
    }, 500);
  };

  const handleMarkerPress = useCallback((id) => {
    const place = places.find((p) => String(p.id) === String(id));
    if (place) focusPlace(place);
  }, [places]);

  const openRouteEditor = () => navigation.navigate('RouteEditor', {
    initialPlaces: routePlaces,
    // Sólo las rutas guardadas del usuario se editan en el lugar; predefinidas y
    // borradores se guardan como una ruta nueva
    ...(currentRouteData && !currentRouteData.is_preset && !currentRouteData.is_draft
      ? { existingRouteId: currentRouteData.id, existingRouteName: currentRouteData.name }
      : {}),
  });

  const showingRoute = routePlaces.length > 0;

  return (
    <View style={styles.container}>
      <LeafletMap
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        markers={places}
        routeMarkers={routePlaces}
        polylineCoords={routePolyline}
        userLocation={userLocation}
        isDark={isDark}
        onMarkerPress={handleMarkerPress}
        onMapPress={() => setSelectedPlace(null)}
      />

      <SafeAreaView edges={['top']} style={styles.searchWrapper} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.searchRow, { backgroundColor: colors.mapSearchBg }]}
          onPress={() => navigation.navigate('MapSearch')}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={18} color={colors.placeholder} style={{ marginRight: 8 }} />
          <Text style={[styles.searchPlaceholder, { color: colors.placeholder }]}>{t('search_placeholder')}</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {loading && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.mapSearchBg }]}>
          <ActivityIndicator color="#E8611A" />
        </View>
      )}

      {showingRoute ? (
        <>
          {/* El botón de centrar queda por encima del panel plegado */}
          <View style={[styles.locateFloating, { bottom: SHEET_COLLAPSED_HEIGHT + 16 }]}>
            <TouchableOpacity
              style={[styles.locateBtn, { backgroundColor: colors.mapSearchBg }]}
              onPress={centerOnUser}
              disabled={locating}
            >
              {locating
                ? <ActivityIndicator size="small" color="#E8611A" />
                : <Ionicons name="locate" size={20} color="#E8611A" />
              }
            </TouchableOpacity>
          </View>

          <RouteSheet
            title={currentRouteData?.name ?? routePlaces[0]?.name ?? t('new_route')}
            places={routePlaces}
            onEdit={openRouteEditor}
            onClear={clearRoute}
            onOpenExternal={openInExternalApp}
          />
        </>
      ) : (
        <View style={styles.bottomRow} pointerEvents="box-none">
          <View style={styles.rightBtns}>
            <TouchableOpacity
              style={[styles.locateBtn, { backgroundColor: colors.mapSearchBg }]}
              onPress={centerOnUser}
              disabled={locating}
            >
              {locating
                ? <ActivityIndicator size="small" color="#E8611A" />
                : <Ionicons name="locate" size={20} color="#E8611A" />
              }
            </TouchableOpacity>
            {!selectedPlace && (
              <TouchableOpacity style={styles.newRouteBtn} onPress={openRouteEditor}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.newRouteBtnText}>{t('new_route')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {selectedPlace && (
            <PlacePreviewCard
              place={selectedPlace}
              onClose={() => setSelectedPlace(null)}
              onDetails={() => navigation.navigate('PlaceDetail', { place: selectedPlace })}
              onDirections={() => routeToDestination(selectedPlace)}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrapper: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    borderRadius: 20,
    padding: 8,
    elevation: 4,
  },
  bottomRow: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    gap: 12,
  },
  rightBtns: { alignItems: 'flex-end', gap: 10, marginRight: 4 },

  previewCard: {
    borderRadius: 18,
    padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
  },
  previewTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  previewPhoto: { width: 72, height: 72, borderRadius: 12 },
  previewPhotoEmpty: { alignItems: 'center', justifyContent: 'center' },
  previewInfo: { flex: 1, paddingTop: 2 },
  previewName: { fontSize: 16, fontWeight: '700' },
  previewStatus: { fontSize: 13, fontWeight: '600', marginTop: 3 },
  previewMeta: { fontSize: 12.5, marginTop: 2 },
  previewClose: { padding: 2 },
  previewBtns: { flexDirection: 'row', gap: 10, marginTop: 12 },
  previewBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 22, paddingVertical: 11,
  },
  previewBtnOutline: { borderWidth: 1 },
  previewBtnPrimary: { backgroundColor: '#E8611A' },
  previewBtnText: { fontSize: 14, fontWeight: '600' },
  locateFloating: { position: 'absolute', right: 20 },
  locateBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
  },
  newRouteBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E8611A', borderRadius: 28,
    paddingVertical: 14, paddingHorizontal: 28, gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 5, elevation: 5,
  },
  newRouteBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
