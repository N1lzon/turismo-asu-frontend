import {
  View, Text, Image, TouchableOpacity,
  StyleSheet, Platform, Linking,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const DAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

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

function formatDistance(meters) {
  if (meters == null) return null;
  return meters < 1000
    ? `A ${Math.round(meters)}m.`
    : `A ${(meters / 1000).toFixed(1)}km.`;
}

function getPhoto(item) {
  if (Array.isArray(item.photos) && item.photos.length > 0) return item.photos[0];
  if (typeof item.photo === 'string') return item.photo;
  return null;
}

function openMaps(place) {
  const label = encodeURIComponent(place.name);
  const url = Platform.select({
    ios:     `maps:?q=${label}&ll=${place.lat},${place.lng}`,
    android: `geo:${place.lat},${place.lng}?q=${place.lat},${place.lng}(${label})`,
  });
  Linking.openURL(url);
}

export default function PlaceDetailScreen({ route, navigation }) {
  const { place } = route.params;

  const photo = getPhoto(place);
  const open = isOpen(place);
  const todayHours = getTodayHours(place);
  const distance = formatDistance(place.distance_meters);
  const hasMap = place.lat != null && place.lng != null;

  return (
    <View style={styles.container}>

      {/* Barra superior blanca (cubre la barra de notificaciones) */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Foto */}
      {photo
        ? <Image source={{ uri: photo }} style={styles.photo} />
        : <View style={[styles.photo, styles.photoPlaceholder]} />
      }

      {/* Detalles */}
      <View style={styles.details}>
        <Text style={styles.name}>{place.name}</Text>

        {open !== null && (
          <Text style={[styles.cardStatus, { color: open ? '#E8611A' : '#999' }]}>
            {open ? 'Abierto' : 'Cerrado'}
          </Text>
        )}
        {todayHours && todayHours !== 'Cerrado' && (
          <Text style={styles.cardMeta}>{todayHours} hs.</Text>
        )}
        {distance && (
          <Text style={styles.cardMeta}>{distance}</Text>
        )}
        {place.address && (
          <Text style={styles.cardMeta}>{place.address}</Text>
        )}

        {hasMap && (
          <TouchableOpacity style={styles.dirBtn} onPress={() => openMaps(place)}>
            <Text style={styles.dirBtnText}>Como llegar</Text>
            <Ionicons name="location" size={13} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Mapa */}
      {hasMap ? (
        <View style={styles.mapContainer}>
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: place.lat,
              longitude: place.lng,
              latitudeDelta: 0.006,
              longitudeDelta: 0.006,
            }}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            <Marker
              coordinate={{ latitude: place.lat, longitude: place.lng }}
              title={place.name}
              pinColor="#E8611A"
            />
          </MapView>
        </View>
      ) : (
        <View style={[styles.mapContainer, styles.noMap]}>
          <Ionicons name="map-outline" size={28} color="#ccc" />
          <Text style={styles.noMapText}>Ubicación no disponible</Text>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  /* Cabecera blanca */
  header: {
    backgroundColor: '#fff',
  },
  backBtn: {
    padding: 14,
    alignSelf: 'flex-start',
  },

  photo: {
    width: '100%',
    height: 210,
  },
  photoPlaceholder: {
    backgroundColor: '#ddd',
  },

  /* Detalles — mismos estilos que las tarjetas del inicio */
  details: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  cardStatus: {
    fontSize: 15,
    marginTop: 2,
    fontWeight: '500',
  },
  cardMeta: {
    fontSize: 14,
    color: '#777',
    marginTop: 2,
  },
  dirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E8611A',
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 14,
    gap: 5,
    marginTop: 14,
  },
  dirBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },

  /* Mapa */
  mapContainer: {
    flex: 1,
  },
  noMap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    gap: 8,
  },
  noMapText: {
    fontSize: 13,
    color: '#bbb',
  },
});
