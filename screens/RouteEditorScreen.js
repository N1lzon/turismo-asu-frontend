import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, Image,
  TouchableOpacity, StyleSheet, ActivityIndicator,
  Keyboard, PanResponder, ScrollView, Modal, Pressable,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL, apiFetch } from '../config';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme';

const ITEM_HEIGHT = 64;
const USER_ROUTES_KEY = '@user_routes';

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

function RouteItem({ item, displayIndex, isDragging, callbacks }) {
  const { colors } = useTheme();
  const swipeRef = useRef(null);

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

export default function RouteEditorScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const existingRouteId   = route?.params?.existingRouteId   ?? null;
  const existingRouteName = route?.params?.existingRouteName ?? '';

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [routePlaces, setRoutePlaces] = useState(route?.params?.initialPlaces ?? []);
  const [loading, setLoading] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [dropIdx, setDropIdx] = useState(null);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [routeName, setRouteName] = useState(existingRouteName);

  const routeRef = useRef(routePlaces);
  useEffect(() => { routeRef.current = routePlaces; }, [routePlaces]);

  const dragState = useRef({ id: null, fromIndex: null });

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
  const hasPlaces = routePlaces.length > 0;

  const handleSearch = async (text) => {
    setQuery(text);
    if (!text.trim()) { setSearchResults([]); return; }
    setLoading(true);
    try {
      const res = await apiFetch(`${BASE_URL}/places/search?q=${encodeURIComponent(text.trim())}`);
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

  // Abre el modal para nombrar y guardar la ruta localmente
  const saveRoute = () => {
    if (routePlaces.length === 0) return;
    setRouteName(existingRouteName || t('my_route'));
    setSaveModalVisible(true);
  };

  const handleSave = async () => {
    const name = routeName.trim();
    if (!name) return;

    const routeToSave = {
      id: existingRouteId ?? Date.now(),
      name,
      places: routePlaces,
      created_at: new Date().toISOString(),
    };
    try {
      const stored = await AsyncStorage.getItem(USER_ROUTES_KEY);
      const existing = stored ? JSON.parse(stored) : [];
      const idx = existing.findIndex(
        (r) => r.id === existingRouteId || (existingRouteName && r.name === existingRouteName)
      );
      const updated = idx !== -1
        ? existing.map((r, i) => (i === idx ? routeToSave : r))
        : [...existing, routeToSave];
      await AsyncStorage.setItem(USER_ROUTES_KEY, JSON.stringify(updated));
    } catch {}
    setSaveModalVisible(false);
    navigation.goBack();
  };

  // Muestra la ruta en el mapa sin guardarla
  const viewOnMap = () => {
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
        <TouchableOpacity onPress={saveRoute} style={styles.headerBtnRight} disabled={!hasPlaces}>
          <Text numberOfLines={1} style={[styles.saveText, !hasPlaces && { opacity: 0.3 }]}>{t('save')}</Text>
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
        <ScrollView
          scrollEnabled={!draggingId}
          contentContainerStyle={
            displayItems.length === 0
              ? styles.emptyContainer
              : { paddingBottom: hasPlaces ? 80 : 24 }
          }
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

      {/* Botón "Ver en mapa" fijo abajo */}
      {hasPlaces && !isSearching && (
        <View style={[styles.viewMapBar, { borderTopColor: colors.border, backgroundColor: colors.bg }]}>
          <TouchableOpacity style={styles.viewMapBtn} onPress={viewOnMap}>
            <Ionicons name="map-outline" size={18} color="#fff" />
            <Text style={styles.viewMapBtnText}>{t('view_on_map')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de guardado */}
      <Modal
        visible={saveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSaveModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSaveModalVisible(false)}>
          <Pressable style={[styles.modalBox, { backgroundColor: colors.modalBg }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.text, borderBottomColor: colors.border }]}>
              {t('save_route_title')}
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder={t('route_name_placeholder_input')}
              placeholderTextColor={colors.placeholder}
              value={routeName}
              onChangeText={setRouteName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <View style={[styles.modalBtns, { borderTopColor: colors.border }]}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSaveModalVisible(false)}>
                <Text style={[styles.modalCancelText, { color: colors.textMuted }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleSave}>
                <Text style={styles.modalConfirmText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
  headerBtnRight: { minWidth: 64, height: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
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

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },

  // Barra inferior "Ver en mapa"
  viewMapBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  viewMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    borderRadius: 28,
    paddingVertical: 14,
    gap: 8,
  },
  viewMapBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '82%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalInput: {
    marginHorizontal: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  modalBtns: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  modalCancelText: { fontSize: 15 },
  modalConfirmBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  modalConfirmText: { fontSize: 15, fontWeight: '600', color: '#E8611A' },
});
