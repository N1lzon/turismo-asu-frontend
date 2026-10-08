import { useRef, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, Image,
  TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePlaceSearch } from '../search';
import { getPhoto } from '../place';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme';

export default function MapSearchScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { query, setQuery, results: items, loading, searched, tooShort, clear } = usePlaceSearch();
  const inputRef = useRef(null);

  useEffect(() => {
    const timeout = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timeout);
  }, []);

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
          {item.address && (
            <Text style={[styles.itemAddress, { color: colors.textSub }]} numberOfLines={1}>{item.address}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.mapBtn}
          onPress={() => navigation.navigate('Map', { destination: item })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="location" size={14} color="#fff" />
          <Text style={styles.mapBtnText}>{t('directions')}</Text>
        </TouchableOpacity>
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
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
        />
        {loading && items.length > 0 && (
          <ActivityIndicator size="small" color="#E8611A" style={styles.headerSpinner} />
        )}
        {query.length > 0 && (
          <TouchableOpacity onPress={clear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading && items.length === 0
        ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#E8611A" />
        : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              query.trim() && tooShort
                ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('search_min_chars')}</Text>
                : searched
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
  headerSpinner: { marginRight: 8 },
  input: { flex: 1, fontSize: 15 },
  list: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 20 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, gap: 12,
  },
  itemPhoto: { width: 52, height: 52, borderRadius: 10, flexShrink: 0 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '500' },
  itemAddress: { fontSize: 12, marginTop: 3 },
  mapBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E8611A', borderRadius: 16,
    paddingVertical: 7, paddingHorizontal: 10, gap: 4, flexShrink: 0,
  },
  mapBtnText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  emptyText: { textAlign: 'center', marginTop: 60, fontSize: 14 },
});
