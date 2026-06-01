import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, Image,
  TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '../config';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme';

function formatDistance(meters, t) {
  if (meters == null) return '';
  return meters < 1000
    ? t('dist_meters', { n: Math.round(meters) })
    : t('dist_km', { n: (meters / 1000).toFixed(1) });
}

function getPhoto(item) {
  if (Array.isArray(item.photos) && item.photos.length > 0) return item.photos[0];
  if (typeof item.photo === 'string') return item.photo;
  return null;
}

export default function SearchScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const timeout = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timeout);
  }, []);

  const handleChange = async (text) => {
    setQuery(text);
    if (!text.trim()) { setItems([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/places/search?q=${encodeURIComponent(text.trim())}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const photo = getPhoto(item);
    return (
      <TouchableOpacity
        style={[styles.item, { borderBottomColor: colors.border }]}
        onPress={() => navigation.navigate('PlaceDetail', { place: item })}
        activeOpacity={0.75}
      >
        {photo
          ? <Image source={{ uri: photo }} style={styles.itemPhoto} />
          : <View style={[styles.itemPhoto, { backgroundColor: colors.photoPlaceholder }]} />
        }
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          {item.distance_meters != null && (
            <Text style={[styles.itemDistance, { color: colors.textSub }]}>{formatDistance(item.distance_meters, t)}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.backIcon} />
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.text }]}
          placeholder={t('search_placeholder')}
          placeholderTextColor={colors.placeholder}
          value={query}
          onChangeText={handleChange}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setItems([]); }}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading
        ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#E8611A" />
        : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              query.trim()
                ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('no_results_short')}</Text>
                : null
            }
          />
        )
      }
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 12, marginTop: 10, marginBottom: 8,
    borderRadius: 24, paddingHorizontal: 12, height: 44,
  },
  backBtn: { marginRight: 6 },
  input: { flex: 1, fontSize: 15 },
  list: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 20 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1,
  },
  itemPhoto: { width: 56, height: 56, borderRadius: 10, marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '500' },
  itemDistance: { fontSize: 12, marginTop: 3 },
  emptyText: { textAlign: 'center', marginTop: 60, fontSize: 14 },
});
