import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, Linking,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BASE_URL, apiFetch } from '../config';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme';

const ASUNCION = {
  latitude: -25.2867,
  longitude: -57.647,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

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

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const userRegion = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
        setRegion(userRegion);
        mapRef.current?.animateToRegion(userRegion, 500);
        fetchNearby(loc.coords.latitude, loc.coords.longitude);
      } else {
        fetchNearby(ASUNCION.latitude, ASUNCION.longitude);
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const routeData = route?.params?.routeData;
      if (routeData?.places?.length > 0) {
        setRoutePlaces(routeData.places);
        setCurrentRouteData(routeData);
        setPlaces([]);
        loadRouteOnMap(routeData.places);
      }
      const destination = route?.params?.destination;
      if (destination?.lat != null) {
        navigation.setParams({ destination: null });
        routeToDestination(destination);
      }
    }, [route?.params?.routeData, route?.params?.destination])
  );

  const routeToDestination = async (dest) => {
    setLoading(true);
    setPlaces([]);
    setRoutePolyline([]);
    setRoutePlaces([dest]);

    let originLat = ASUNCION.latitude;
    let originLng = ASUNCION.longitude;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        originLat = loc.coords.latitude;
        originLng = loc.coords.longitude;
      }
    } catch { /* usa fallback */ }

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
      mapRef.current?.fitToCoordinates(
        pts.map((p) => ({ latitude: p.lat, longitude: p.lng })),
        { edgePadding: { top: 80, right: 50, bottom: 120, left: 50 }, animated: true }
      );
    }, 300);
  };

  const loadRouteOnMap = async (pts) => {
    const validPts = pts.filter((p) => p.lat != null && p.lng != null);
    if (validPts.length < 2) return;
    const coordStr = validPts.map((p) => `${p.lng},${p.lat}`).join(';');
    try {
      const res = await fetch(`${OSRM_BASE}/${coordStr}?overview=full&geometries=geojson`);
      const data = await res.json();
      if (data.routes?.[0]?.geometry?.coordinates) {
        setRoutePolyline(data.routes[0].geometry.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng })));
      }
    } catch {
      setRoutePolyline(validPts.map((p) => ({ latitude: p.lat, longitude: p.lng })));
    }
    setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        validPts.map((p) => ({ latitude: p.lat, longitude: p.lng })),
        { edgePadding: { top: 80, right: 50, bottom: 120, left: 50 }, animated: true }
      );
    }, 300);
  };

  const clearRoute = () => {
    setRoutePolyline([]);
    setRoutePlaces([]);
    setCurrentRouteData(null);
    navigation.setParams({ routeData: null });
  };

  const openInExternalApp = () => {
    if (routePlaces.length > 1) {
      const stops = routePlaces.map((p) => `${p.lat},${p.lng}`).join('/');
      Linking.openURL(`https://www.google.com/maps/dir/${stops}`);
    } else {
      const dest = routePlaces[0];
      const label = encodeURIComponent(dest.name ?? '');
      Linking.openURL(`geo:${dest.lat},${dest.lng}?q=${dest.lat},${dest.lng}(${label})`);
    }
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

  const centerOnUser = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    mapRef.current?.animateToRegion({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 500);
  };

  const focusPlace = (place) => {
    setSelectedPlace(place);
    mapRef.current?.animateToRegion({
      latitude: place.lat, longitude: place.lng,
      latitudeDelta: 0.01, longitudeDelta: 0.01,
    }, 500);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
      >
        {places.map((place) => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.lat, longitude: place.lng }}
            title={place.name}
            description={place.address}
            pinColor="#E8611A"
            onPress={() => focusPlace(place)}
          />
        ))}
        {routePolyline.length > 0 && (
          <Polyline coordinates={routePolyline} strokeColor="#E8611A" strokeWidth={4} />
        )}
        {routePlaces.map((place, index) => (
          <Marker
            key={`rp-${place.id}`}
            coordinate={{ latitude: place.lat, longitude: place.lng }}
            title={`${index + 1}. ${place.name}`}
            description={place.address}
          >
            <View style={styles.routeMarker}>
              <Text style={styles.routeMarkerText}>{index + 1}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

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

      <View style={styles.bottomRow}>
        {routePlaces.length > 0 && (
          <View style={styles.leftBtns}>
            <TouchableOpacity style={styles.openInBtn} onPress={openInExternalApp}>
              <Ionicons name="open-outline" size={15} color="#fff" />
              <Text style={styles.openInBtnText}>{t('open_in')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearRouteBtn} onPress={clearRoute}>
              <Ionicons name="close" size={15} color="#fff" />
              <Text style={styles.clearRouteBtnText}>{t('clear_route')}</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.rightBtns}>
          <TouchableOpacity style={[styles.locateBtn, { backgroundColor: colors.mapSearchBg }]} onPress={centerOnUser}>
            <Ionicons name="locate" size={20} color="#E8611A" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.newRouteBtn}
            onPress={() => navigation.navigate('RouteEditor', {
              initialPlaces: routePlaces,
              ...(currentRouteData && !currentRouteData.is_preset
                ? { existingRouteId: currentRouteData.id, existingRouteName: currentRouteData.name }
                : {}),
            })}
          >
            {routePlaces.length > 0 ? (
              <>
                <Ionicons name="pencil" size={16} color="#fff" />
                <Text style={styles.newRouteBtnText}>{t('edit')}</Text>
              </>
            ) : (
              <>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.newRouteBtnText}>{t('new_route')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
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
  routeMarker: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#E8611A',
    borderWidth: 2, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 3,
    elevation: 4,
  },
  routeMarkerText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  leftBtns: { alignItems: 'flex-start', gap: 8 },
  openInBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#444', borderRadius: 20,
    paddingVertical: 10, paddingHorizontal: 16, gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  openInBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  bottomRow: {
    position: 'absolute', bottom: 24, left: 20, right: 20,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
  },
  rightBtns: { alignItems: 'flex-end', gap: 10, marginLeft: 'auto' },
  clearRouteBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#555', borderRadius: 20,
    paddingVertical: 10, paddingHorizontal: 16, gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  clearRouteBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
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
