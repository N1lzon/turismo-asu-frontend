import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, Image,
  TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '../config';

function getPhoto(item) {
  if (Array.isArray(item.photos) && item.photos.length > 0) return item.photos[0];
  if (typeof item.photo === 'string') return item.photo;
  return null;
}

export default function MapSearchScreen({ navigation }) {
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
        style={styles.item}
        onPress={() => navigation.navigate('PlaceDetail', { place: item })}
        activeOpacity={0.75}
      >
        {photo
          ? <Image source={{ uri: photo }} style={styles.itemPhoto} />
          : <View style={[styles.itemPhoto, styles.itemPhotoPlaceholder]} />
        }
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          {item.address && (
            <Text style={styles.itemAddress} numberOfLines={1}>{item.address}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.mapBtn}
          onPress={() => navigation.navigate('Map', { destination: item })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="location" size={14} color="#fff" />
          <Text style={styles.mapBtnText}>Como llegar</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Buscar lugares..."
          placeholderTextColor="#aaa"
          value={query}
          onChangeText={handleChange}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setItems([]); }}>
            <Ionicons name="close-circle" size={18} color="#aaa" />
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
                ? <Text style={styles.emptyText}>Sin resultados.</Text>
                : null
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 24,
    paddingHorizontal: 12,
    height: 44,
  },
  backBtn: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  itemPhoto: {
    width: 52,
    height: 52,
    borderRadius: 10,
    flexShrink: 0,
  },
  itemPhotoPlaceholder: {
    backgroundColor: '#ddd',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  itemAddress: {
    fontSize: 12,
    color: '#888',
    marginTop: 3,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8611A',
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 10,
    gap: 4,
    flexShrink: 0,
  },
  mapBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#aaa',
    marginTop: 60,
    fontSize: 14,
  },
});
