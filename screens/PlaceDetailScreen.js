import {
  View, Text, Image, TouchableOpacity, StyleSheet,
} from 'react-native';
import LeafletMap from '../components/LeafletMap';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme';

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

function formatDistance(meters, t) {
  if (meters == null) return null;
  return meters < 1000
    ? t('dist_meters', { n: Math.round(meters) })
    : t('dist_km', { n: (meters / 1000).toFixed(1) });
}

function getPhoto(item) {
  if (Array.isArray(item.photos) && item.photos.length > 0) return item.photos[0];
  if (typeof item.photo === 'string') return item.photo;
  return null;
}

export default function PlaceDetailScreen({ route, navigation }) {
  const { place } = route.params;
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const photo = getPhoto(place);
  const open = isOpen(place);
  const todayHours = getTodayHours(place);
  const distance = formatDistance(place.distance_meters, t);
  const hasMap = place.lat != null && place.lng != null;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <SafeAreaView edges={['top']} style={[styles.header, { backgroundColor: colors.bg }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.backIcon} />
        </TouchableOpacity>
      </SafeAreaView>

      {photo
        ? <Image source={{ uri: photo }} style={styles.photo} />
        : <View style={[styles.photo, { backgroundColor: colors.photoPlaceholder }]} />
      }

      <View style={styles.details}>
        <Text style={[styles.name, { color: colors.text }]}>{place.name}</Text>

        {open !== null && (
          <Text style={[styles.statusText, { color: open ? '#E8611A' : colors.closedColor }]}>
            {open ? t('open_status') : t('closed_status')}
          </Text>
        )}
        {todayHours && todayHours !== 'Cerrado' && (
          <Text style={[styles.metaText, { color: colors.textSub }]}>{todayHours} hs.</Text>
        )}
        {distance && (
          <Text style={[styles.metaText, { color: colors.textSub }]}>{distance}</Text>
        )}
        {place.address && (
          <Text style={[styles.metaText, { color: colors.textSub }]}>{place.address}</Text>
        )}

        {hasMap && (
          <TouchableOpacity
            style={styles.dirBtn}
            onPress={() => navigation.navigate('Mapa', { screen: 'Map', params: { destination: place } })}
          >
            <Text style={styles.dirBtnText}>{t('directions')}</Text>
            <Ionicons name="location" size={13} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {hasMap ? (
        <View style={styles.mapContainer}>
          <LeafletMap
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: place.lat, longitude: place.lng,
              latitudeDelta: 0.006, longitudeDelta: 0.006,
            }}
            markers={[{ id: place.id, lat: place.lat, lng: place.lng, name: place.name }]}
            isDark={isDark}
          />
        </View>
      ) : (
        <View style={[styles.mapContainer, styles.noMap, { backgroundColor: colors.noMapBg }]}>
          <Ionicons name="map-outline" size={28} color={colors.noMapText} />
          <Text style={[styles.noMapText, { color: colors.noMapText }]}>{t('location_unavailable')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {},
  backBtn: { padding: 14, alignSelf: 'flex-start' },
  photo: { width: '100%', height: 210 },
  details: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },
  name: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  statusText: { fontSize: 15, marginTop: 2, fontWeight: '500' },
  metaText: { fontSize: 14, marginTop: 2 },
  dirBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: '#E8611A', borderRadius: 20,
    paddingVertical: 9, paddingHorizontal: 14, gap: 5, marginTop: 14,
  },
  dirBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  mapContainer: { flex: 1 },
  noMap: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  noMapText: { fontSize: 13 },
});
