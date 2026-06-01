import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, Image,
  TouchableOpacity, StyleSheet, ActivityIndicator,
  Keyboard, PanResponder, ScrollView,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../config';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme';

// Altura fija por ítem — debe coincidir con el estilo routeItem
const ITEM_HEIGHT = 64;

function getPhoto(item) {
  if (Array.isArray(item.photos) && item.photos.length > 0) return item.photos[0];
  if (typeof item.photo === 'string') return item.photo;
  return null;
}

function DeleteBackground() {
  return (
    <View style={deleteStyle.bg}>
      <Ionicons name="trash-outline" size={22} color="#fff" />
    </View>
  );
}
const deleteStyle = StyleSheet.create({
  bg: { width: 80, backgroundColor: '#E8344E', justifyContent: 'center', alignItems: 'center' },
});

// Handle de arrastre con su propio PanResponder estable
function DragHandle({ itemId, indexRef, callbacks }) {
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        callbacks.current.start(itemId, indexRef.current);
      },
      onPanResponderMove: (_, { dy }) => {
        callbacks.current.move(dy);
      },
      onPanResponderRelease: (_, { dy }) => {
        callbacks.current.end(dy);
      },
      onPanResponderTerminate: (_, { dy }) => {
        callbacks.current.end(dy);
      },
    })
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      style={dragHandleStyle.wrap}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="reorder-three-outline" size={28} color="#999" />
    </View>
  );
}
const dragHandleStyle = StyleSheet.create({ wrap: { padding: 10 } });

// Ítem de la ruta: swipeable (derecha = borrar) + drag handle
function RouteItem({ item, displayIndex, isDragging, callbacks }) {
  const { colors } = useTheme();
  const swipeRef = useRef(null);

  // indexRef siempre actualizado para que el PanResponder del handle use el índice correcto
  const indexRef = useRef(displayIndex);
  useEffect(() => { indexRef.current = displayIndex; }, [displayIndex]);

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={() => <DeleteBackground />}
      leftThreshold={60}
      friction={1.5}
      onSwipeableOpen={(dir) => {
        if (dir === 'left') {
          swipeRef.current?.close();
          callbacks.current.delete(item.id);
        }
      }}
    >
      <View style={[
        styles.routeItem,
        { backgroundColor: colors.card, borderBottomColor: colors.border },
        isDragging && { opacity: 0.6 },
      ]}>
        <Text style={[styles.routeIdx, { color: colors.textMuted }]}>{displayIndex + 1}</Text>
        <View style={styles.routeInfo}>
          <Text style={[styles.routeName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          {item.address && (
            <Text style={[styles.routeAddr, { color: colors.textSub }]} numberOfLines={1}>{item.address}</Text>
          )}
        </View>
        <DragHandle itemId={item.id} indexRef={indexRef} callbacks={callbacks} />
      </View>
    </Swipeable>
  );
}

export default function RouteEditorScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [routePlaces, setRoutePlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [dropIdx, setDropIdx] = useState(null);

  // Refs para que los callbacks del PanResponder siempre accedan al estado actual
  const routeRef = useRef(routePlaces);
  useEffect(() => { routeRef.current = routePlaces; }, [routePlaces]);

  const dragState = useRef({ id: null, fromIndex: null });

  // Objeto de callbacks estable — el PanResponder lo captura una sola vez
  const callbacks = useRef({
    start: (itemId, fromIndex) => {
      dragState.current = { id: itemId, fromIndex };
      setDraggingId(itemId);
      setDropIdx(fromIndex);
    },
    move: (dy) => {
      const { fromIndex } = dragState.current;
      if (fromIndex === null) return;
      const len = routeRef.current.length;
      const newDrop = Math.max(0, Math.min(len - 1, Math.round(fromIndex + dy / ITEM_HEIGHT)));
      setDropIdx(newDrop);
    },
    end: (dy) => {
      const { fromIndex } = dragState.current;
      if (fromIndex === null) return;
      const items = routeRef.current;
      const toIndex = Math.max(0, Math.min(items.length - 1, Math.round(fromIndex + dy / ITEM_HEIGHT)));
      if (toIndex !== fromIndex) {
        const next = [...items];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        setRoutePlaces(next);
      }
      dragState.current = { id: null, fromIndex: null };
      setDraggingId(null);
      setDropIdx(null);
    },
    delete: (itemId) => {
      setRoutePlaces((prev) => prev.filter((p) => p.id !== itemId));
    },
  });

  // Vista previa del orden mientras se arrastra
  function getDisplayItems() {
    if (draggingId === null || dropIdx === null) return routePlaces;
    const from = routePlaces.findIndex((p) => p.id === draggingId);
    if (from === -1 || from === dropIdx) return routePlaces;
    const next = [...routePlaces];
    const [moved] = next.splice(from, 1);
    next.splice(dropIdx, 0, moved);
    return next;
  }

  const displayItems = getDisplayItems();
  const isSearching = query.trim().length > 0;

  const handleSearch = async (text) => {
    setQuery(text);
    if (!text.trim()) { setSearchResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/places/search?q=${encodeURIComponent(text.trim())}`);
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const addPlace = (place) => {
    if (routePlaces.some((p) => p.id === place.id)) return;
    setRoutePlaces((prev) => [...prev, place]);
    setQuery('');
    setSearchResults([]);
    Keyboard.dismiss();
  };

  const saveRoute = () => {
    if (routePlaces.length === 0) return;
    navigation.navigate('Map', {
      routeData: { id: Date.now(), name: t('new_route'), places: routePlaces, is_preset: false },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>

      {/* Cabecera */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.backIcon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('new_route')}</Text>
        <TouchableOpacity onPress={saveRoute} style={styles.headerBtn} disabled={routePlaces.length === 0}>
          <Text style={[styles.saveText, routePlaces.length === 0 && { opacity: 0.3 }]}>{t('save')}</Text>
        </TouchableOpacity>
      </View>

      {/* Barra de búsqueda */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={18} color={colors.placeholder} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t('search_placeholder')}
          placeholderTextColor={colors.placeholder}
          value={query}
          onChangeText={handleSearch}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setSearchResults([]); }}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Resultados de búsqueda */}
      {isSearching ? (
        loading
          ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#E8611A" />
          : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 24 }}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('no_results_short')}</Text>
              }
              renderItem={({ item }) => {
                const photo = getPhoto(item);
                const already = routePlaces.some((p) => p.id === item.id);
                return (
                  <TouchableOpacity
                    style={[styles.resultItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
                    onPress={() => addPlace(item)}
                    activeOpacity={already ? 1 : 0.7}
                    disabled={already}
                  >
                    {photo
                      ? <Image source={{ uri: photo }} style={styles.resultPhoto} />
                      : <View style={[styles.resultPhoto, { backgroundColor: colors.photoPlaceholder }]} />
                    }
                    <View style={styles.resultInfo}>
                      <Text style={[styles.resultName, { color: already ? colors.textMuted : colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.address && (
                        <Text style={[styles.resultAddr, { color: colors.textSub }]} numberOfLines={1}>{item.address}</Text>
                      )}
                    </View>
                    <Ionicons
                      name={already ? 'checkmark-circle' : 'add-circle-outline'}
                      size={22}
                      color={already ? colors.textMuted : '#E8611A'}
                    />
                  </TouchableOpacity>
                );
              }}
            />
          )
      ) : (
        /* Lista de la ruta arrastrable */
        <ScrollView
          scrollEnabled={!draggingId}
          contentContainerStyle={displayItems.length === 0 ? styles.emptyContainer : { paddingBottom: 24 }}
        >
          {displayItems.length === 0 ? (
            <>
              <Ionicons name="map-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted, marginTop: 12 }]}>{t('route_empty')}</Text>
            </>
          ) : (
            displayItems.map((item, index) => (
              <RouteItem
                key={item.id}
                item={item}
                displayIndex={index}
                isDragging={item.id === draggingId}
                callbacks={callbacks}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
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
  saveText: { color: '#E8611A', fontSize: 16, fontWeight: '600' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 15 },

  // Resultado de búsqueda
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  resultPhoto: { width: 48, height: 48, borderRadius: 10, flexShrink: 0 },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '500' },
  resultAddr: { fontSize: 12, marginTop: 2 },

  // Ítem de ruta
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ITEM_HEIGHT,
    paddingLeft: 16,
    paddingRight: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  routeIdx: { width: 22, fontSize: 14, fontWeight: '700', marginRight: 14, textAlign: 'center' },
  routeInfo: { flex: 1, marginRight: 4 },
  routeName: { fontSize: 15, fontWeight: '500' },
  routeAddr: { fontSize: 12, marginTop: 2 },

  // Estado vacío
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
