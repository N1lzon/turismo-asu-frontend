import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LOGO = require('../assets/logo.png');

const OPTIONS = [
  { key: 'idioma', label: 'Idioma' },
  { key: 'tema',   label: 'Tema' },
  { key: 'borrar', label: 'Borrar datos' },
  { key: 'acerca', label: 'Acerca de' },
];

export default function OptionsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={LOGO} style={styles.logo} />
        </View>
        <Text style={styles.appName}>Jahapa</Text>
        <Text style={styles.version}>Versión 1.0.0</Text>
      </View>

      <View style={styles.list}>
        {OPTIONS.map((item) => (
          <TouchableOpacity key={item.key} style={styles.item} activeOpacity={0.6}>
            <Text style={styles.itemText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 36,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 14,
  },
  logo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  appName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#222',
    marginBottom: 2,
  },
  version: {
    fontSize: 14,
    color: '#888',
  },
  list: {
    marginHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
  },
  item: {
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  itemText: {
    fontSize: 16,
    color: '#222',
  },
});
