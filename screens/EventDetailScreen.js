import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LeafletMap from '../components/LeafletMap';
import { getPhoto, formatEventDate, formatEventTime } from '../place';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme';

function InfoRow({ icon, text, colors }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color="#E8611A" />
      <Text style={[styles.infoText, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

export default function EventDetailScreen({ route, navigation }) {
  const { event } = route.params;
  const { t, language } = useTranslation();
  const { colors, isDark } = useTheme();

  const photo = getPhoto(event);
  const time = formatEventTime(event, t);
  const hasLocation = event.lat != null && event.lng != null;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.bg }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.backIcon} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {t('cat_events')}
          </Text>
          {/* Espejo del botón de volver, para que el título quede centrado */}
          <View style={styles.headerBtn} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {photo
          ? <Image source={{ uri: photo }} style={styles.photo} />
          : <View style={[styles.photo, { backgroundColor: colors.photoPlaceholder }]} />
        }

        <View style={styles.details}>
          <Text style={[styles.name, { color: colors.text }]}>{event.name}</Text>

          <View style={styles.infoList}>
            <InfoRow icon="calendar-outline" text={formatEventDate(event.date, t, language)} colors={colors} />
            {time && <InfoRow icon="time-outline" text={time} colors={colors} />}
            {event.address && <InfoRow icon="location-outline" text={event.address} colors={colors} />}
          </View>

          {event.description ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('description_title')}</Text>
              <Text style={[styles.description, { color: colors.textSub }]}>{event.description}</Text>
            </>
          ) : null}
        </View>

        {hasLocation && (
          <View style={styles.mapContainer}>
            <LeafletMap
              style={StyleSheet.absoluteFill}
              initialRegion={{
                latitude: event.lat, longitude: event.lng,
                latitudeDelta: 0.006, longitudeDelta: 0.006,
              }}
              markers={[{ id: event.id, lat: event.lat, lng: event.lng, name: event.name }]}
              isDark={isDark}
              interactive={false}
            />
          </View>
        )}
      </ScrollView>

      {hasLocation && (
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.bg }]}>
          <TouchableOpacity
            style={styles.dirBtn}
            onPress={() => navigation.navigate('Mapa', { screen: 'Map', params: { destination: event } })}
            activeOpacity={0.85}
          >
            <Ionicons name="navigate" size={17} color="#fff" />
            <Text style={styles.dirBtnText}>{t('directions')}</Text>
          </TouchableOpacity>
        </View>
      )}
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

  scroll: { paddingBottom: 24 },
  photo: { width: '100%', height: 230 },
  details: { paddingHorizontal: 16, paddingTop: 16 },
  name: { fontSize: 22, fontWeight: '700' },

  infoList: { marginTop: 14, gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoText: { flex: 1, fontSize: 15 },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 22, marginBottom: 6 },
  description: { fontSize: 14.5, lineHeight: 21 },

  mapContainer: {
    height: 180,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 14,
    overflow: 'hidden',
  },

  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8611A',
    borderRadius: 28,
    paddingVertical: 15,
    gap: 8,
  },
  dirBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
