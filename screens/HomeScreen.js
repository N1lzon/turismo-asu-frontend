import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, Image,
  TouchableOpacity, StyleSheet, ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '../config';

const ASUNCION = { lat: -25.2867, lng: -57.647 };

const CATEGORIES = [
  { label: 'Gastronomía', key: 'restaurant', icon: 'restaurant-outline' },
  { label: 'Lugares',     key: 'museum',     icon: 'location-outline'   },
  { label: 'Hospedaje',   key: 'hotel',      icon: 'business-outline'   },
  { label: 'Rutas',       key: 'routes',     icon: 'map-outline'        },
];

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
  if (meters == null) return '';
  return meters < 1000
    ? `A ${Math.round(meters)}m.`
    : `A ${(meters / 1000).toFixed(1)}km.`;
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


function CollageImage({ photos }) {
  const imgs = photos.slice(0, 3);
  if (imgs.length === 0) {
    return <View style={[styles.cardImage, styles.cardImagePlaceholder]} />;
  }
  if (imgs.length === 1) {
    return <Image source={{ uri: imgs[0] }} style={styles.cardImage} />;
  }
  if (imgs.length === 2) {
    return (
      <View style={[styles.cardImage, { flexDirection: 'row', gap: 2, overflow: 'hidden', borderRadius: 14 }]}>
        <Image source={{ uri: imgs[0] }} style={{ flex: 1, height: '100%' }} />
        <Image source={{ uri: imgs[1] }} style={{ flex: 1, height: '100%' }} />
      </View>
    );
  }
  return (
    <View style={[styles.cardImage, { flexDirection: 'row', gap: 2, overflow: 'hidden', borderRadius: 14 }]}>
      <Image source={{ uri: imgs[0] }} style={{ flex: 1, height: '100%' }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Image source={{ uri: imgs[1] }} style={{ flex: 1, width: '100%' }} />
        <Image source={{ uri: imgs[2] }} style={{ flex: 1, width: '100%' }} />
      </View>
    </View>
  );
}

function RouteCard({ item, navigation }) {
  const photos = (item.places ?? [])
    .slice(0, 3)
    .map((p) => p.photos?.[0])
    .filter(Boolean);
  const startTime = item.start_time ? item.start_time.slice(0, 5) + ' hs.' : null;
  const distanceText = item.distance_meters != null ? formatDistance(item.distance_meters) : null;

  return (
    <View style={styles.card}>
      <CollageImage photos={photos} />
      <View style={styles.cardBody}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          {startTime && (
            <Text style={[styles.cardStatus, { color: '#E8611A' }]}>
              Inicia a las {startTime}
            </Text>
          )}
          {distanceText && (
            <Text style={styles.cardMeta}>{distanceText} al punto de inicio</Text>
          )}
          {item.total_places != null && (
            <Text style={styles.cardMeta}>{item.total_places} lugares</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.dirBtn}
          onPress={() => navigation.navigate('Mapa', { screen: 'Map', params: { routeData: item } })}
        >
          <Text style={styles.dirBtnText}>Ver en mapa</Text>
          <Ionicons name="map" size={13} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PlaceCard({ item, onPress, navigation }) {
  const open = isOpen(item);
  const todayHours = getTodayHours(item);
  const photo = getPhoto(item);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {photo
        ? <Image source={{ uri: photo }} style={styles.cardImage} />
        : <View style={[styles.cardImage, styles.cardImagePlaceholder]} />
      }
      <View style={styles.cardBody}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          {open !== null && (
            <Text style={[styles.cardStatus, { color: open ? '#E8611A' : '#999' }]}>
              {open ? 'Abierto' : 'Cerrado'}
            </Text>
          )}
          {todayHours && todayHours !== 'Cerrado' && (
            <Text style={styles.cardMeta}>{todayHours} hs.</Text>
          )}
          {item.distance_meters != null && (
            <Text style={styles.cardMeta}>{formatDistance(item.distance_meters)}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.dirBtn}
          onPress={() => navigation.navigate('Mapa', { screen: 'Map', params: { destination: item } })}
        >
          <Text style={styles.dirBtnText}>Como llegar</Text>
          <Ionicons name="location" size={13} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function EventCard({ item }) {
  const photo = getPhoto(item);
  return (
    <View style={styles.card}>
      {photo
        ? <Image source={{ uri: photo }} style={styles.cardImage} />
        : <View style={[styles.cardImage, styles.cardImagePlaceholder]} />
      }
      <View style={styles.cardBody}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={[styles.cardStatus, { color: '#E8611A' }]}>{item.date}</Text>
          {item.start_time && item.end_time && (
            <Text style={styles.cardMeta}>
              {item.start_time.slice(0, 5)} hs. – {item.end_time.slice(0, 5)} hs.
            </Text>
          )}
          {item.address && <Text style={styles.cardMeta}>{item.address}</Text>}
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { width: screenWidth } = useWindowDimensions();
  const [activeCategory, setActiveCategory] = useState('restaurant');
  const [location, setLocation] = useState(ASUNCION);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    })();
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (activeCategory === 'routes') {
        const res = await fetch(`${BASE_URL}/routes/presets`);
        const presets = await res.json();
        const detailed = await Promise.all(
          presets.map((r) =>
            fetch(`${BASE_URL}/routes/presets/${r.id}`).then((r2) => r2.json())
          )
        );
        data = detailed.map((route) => {
          const firstPlace = route.places?.[0];
          const distance_meters =
            firstPlace?.lat != null
              ? haversineMeters(location.lat, location.lng, firstPlace.lat, firstPlace.lng)
              : null;
          return { ...route, distance_meters };
        });
      } else {
        const url = activeCategory === 'events'
          ? `${BASE_URL}/events`
          : `${BASE_URL}/places/nearby?lat=${location.lat}&lng=${location.lng}&radius=50000&category=${activeCategory}`;
        const res = await fetch(url);
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(text.slice(0, 120));
        }
      }
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, location]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const selectCategory = (key) => setActiveCategory(key);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Barra de búsqueda */}
      <TouchableOpacity style={styles.searchRow} onPress={() => navigation.navigate('Search')} activeOpacity={0.7}>
        <Ionicons name="search" size={18} color="#aaa" style={{ marginRight: 8 }} />
        <Text style={styles.searchPlaceholder}>Buscar lugares...</Text>
      </TouchableOpacity>

      {/* Pestañas de categoría */}
      <View style={styles.tabs}>
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat.key;
          return (
            <TouchableOpacity key={cat.key} style={[styles.tab, { width: screenWidth / CATEGORIES.length }]} onPress={() => selectCategory(cat.key)}>
              <Ionicons name={cat.icon} size={22} color={active ? '#E8611A' : '#888'} />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{cat.label}</Text>
              {active && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Contenido */}
      {loading
        ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#E8611A" />
        : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) =>
              activeCategory === 'events'
                ? <EventCard item={item} />
                : activeCategory === 'routes'
                  ? <RouteCard item={item} navigation={navigation} />
                  : <PlaceCard item={item} onPress={() => navigation.navigate('PlaceDetail', { place: item })} navigation={navigation} />
            }
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {error ? `Error: ${error}` : 'No se encontraron resultados.'}
              </Text>
            }
          />
        )
      }
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 44,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: '#aaa',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 3,
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#E8611A',
    fontWeight: '600',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 6,
    right: 6,
    height: 2,
    backgroundColor: '#E8611A',
    borderRadius: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  card: {
    marginBottom: 24,
  },
  cardImage: {
    width: '100%',
    height: 190,
    borderRadius: 14,
  },
  cardImagePlaceholder: {
    backgroundColor: '#ddd',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10,
    paddingHorizontal: 2,
  },
  cardInfo: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  cardStatus: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  cardMeta: {
    fontSize: 12,
    color: '#777',
    marginTop: 1,
  },
  dirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8611A',
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 14,
    gap: 5,
  },
  dirBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#aaa',
    marginTop: 60,
    fontSize: 14,
  },
});
