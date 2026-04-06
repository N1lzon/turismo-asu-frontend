import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '../config';

const ASUNCION = {
  latitude: -25.2867,
  longitude: -57.647,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function MapScreen() {
  const mapRef = useRef(null);
  const [region, setRegion] = useState(ASUNCION);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPlace, setSelectedPlace] = useState(null);

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

  const fetchNearby = async (lat, lng) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${BASE_URL}/places/nearby?lat=${lat}&lng=${lng}&radius=500`
      );
      const text = await res.text();
      const data = JSON.parse(text);
      setPlaces(Array.isArray(data) ? data : []);
    } catch {
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    const q = search.trim();
    if (!q) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/places/search?q=${encodeURIComponent(q)}`);
      const text = await res.text();
      const data = JSON.parse(text);
      const results = Array.isArray(data) ? data : [];
      setPlaces(results);
      if (results.length > 0) {
        const first = results[0];
        const newRegion = {
          latitude: first.lat,
          longitude: first.lng,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 600);
      }
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
    const newRegion = {
      latitude: place.lat,
      longitude: place.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    mapRef.current?.animateToRegion(newRegion, 500);
  };

  return (
    <View style={styles.container}>
      {/* Mapa */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
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
      </MapView>

      {/* Barra de búsqueda flotante */}
      <SafeAreaView edges={['top']} style={styles.searchWrapper}>
        <View style={styles.searchRow}>
          <Ionicons name="menu" size={22} color="#666" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar"
            placeholderTextColor="#aaa"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity onPress={handleSearch}>
            <Ionicons name="search" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Indicador de carga */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#E8611A" />
        </View>
      )}

      {/* Botones inferiores derecha */}
      <View style={styles.newRouteWrapper}>
        <TouchableOpacity style={styles.locateBtn} onPress={centerOnUser}>
          <Ionicons name="locate" size={20} color="#E8611A" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.newRouteBtn}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.newRouteBtnText}>Nueva ruta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    elevation: 4,
  },
  newRouteWrapper: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    alignItems: 'flex-end',
    gap: 10,
  },
  locateBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  newRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8611A',
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 28,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  newRouteBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
