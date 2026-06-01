import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import es from './locales/es';
import en from './locales/en';
import pt from './locales/pt';

const TRANSLATIONS = { es, en, pt };
const STORAGE_KEY = '@app_language';

const LanguageContext = createContext(null);

function detectDeviceLanguage() {
  const code = Localization.getLocales()[0]?.languageCode ?? 'en';
  return ['es', 'pt'].includes(code) ? code : 'en';
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(detectDeviceLanguage);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored && TRANSLATIONS[stored]) setLanguageState(stored);
    });
  }, []);

  async function setLanguage(lang) {
    setLanguageState(lang);
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  }

  async function resetLanguage() {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setLanguageState(detectDeviceLanguage());
  }

  function t(key, params = {}) {
    const dict = TRANSLATIONS[language] ?? TRANSLATIONS.en;
    let str = dict[key] ?? TRANSLATIONS.en[key] ?? key;
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{{${k}}}`, String(v));
    }
    return str;
  }

  return (
    <LanguageContext.Provider value={{ t, language, setLanguage, resetLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
