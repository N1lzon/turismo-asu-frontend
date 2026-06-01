import { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const lightColors = {
  bg: '#ffffff',
  card: '#ffffff',
  surface: '#f0f0f0',
  text: '#1a1a1a',
  textSub: '#777777',
  textMuted: '#aaaaaa',
  border: '#eeeeee',
  borderMid: '#cccccc',
  tabBg: '#ffffff',
  tabBorder: '#eeeeee',
  placeholder: '#aaaaaa',
  photoPlaceholder: '#dddddd',
  mapSearchBg: '#ffffff',
  modalBg: '#ffffff',
  modalBorder: '#eeeeee',
  noMapBg: '#f5f5f5',
  noMapText: '#bbbbbb',
  backIcon: '#333333',
  closedColor: '#999999',
  chevron: '#cccccc',
};

export const darkColors = {
  bg: '#0f0f0f',        // fondo principal de pantallas
  card: '#1c1c1c',      // tarjetas y filas de lista (más claro para contraste)
  surface: '#252525',   // barras de búsqueda e inputs
  text: '#f0f0f0',
  textSub: '#9a9a9a',
  textMuted: '#606060',
  border: '#2a2a2a',
  borderMid: '#383838',
  tabBg: '#141414',
  tabBorder: '#252525',
  placeholder: '#505050',
  photoPlaceholder: '#2e2e2e',
  mapSearchBg: '#1c1c1c',
  modalBg: '#1c1c1c',
  modalBorder: '#383838',
  noMapBg: '#161616',
  noMapText: '#555555',
  backIcon: '#e0e0e0',
  closedColor: '#777777',
  chevron: '#505050',
};

const STORAGE_KEY = '@app_theme';
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  // null = seguir al sistema; 'light'/'dark' = preferencia manual del usuario
  const [manualTheme, setManualTheme] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) setManualTheme(stored);
    });
  }, []);

  // isDark se deriva del override manual o del sistema
  const isDark = manualTheme !== null
    ? manualTheme === 'dark'
    : systemScheme === 'dark';

  async function setTheme(dark) {
    const val = dark ? 'dark' : 'light';
    setManualTheme(val);
    await AsyncStorage.setItem(STORAGE_KEY, val);
  }

  async function resetTheme() {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setManualTheme(null); // vuelve a seguir el sistema
  }

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ colors, isDark, setTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
