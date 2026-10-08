import { useState, useMemo } from 'react';
import {
  View, Text, Image, StyleSheet,
  TouchableOpacity, Modal, Pressable, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme';

const REPO_URL = 'https://github.com/N1lzon/turismo-asu-frontend';
const DEVS = [
  { username: 'N1lzon',  avatar: 'https://github.com/N1lzon.png'  },
  { username: 'JoMaiky', avatar: 'https://github.com/JoMaiky.png' },
];

const LOGO = require('../assets/logo.png');

// Misma clave que usan HomeScreen y RouteEditorScreen para las rutas del usuario
const USER_ROUTES_KEY = '@user_routes';

const LANGUAGES = [
  { code: 'es', nativeName: 'Español' },
  { code: 'en', nativeName: 'English' },
  { code: 'pt', nativeName: 'Português' },
];

export default function OptionsScreen() {
  const { t, language, setLanguage, resetLanguage } = useTranslation();
  const { colors, themeMode, setThemeMode, resetTheme } = useTheme();
  const [langModalVisible,  setLangModalVisible]  = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [clearModalVisible, setClearModalVisible] = useState(false);
  const styles = useMemo(() => getStyles(colors), [colors]);

  const THEMES = [
    { mode: 'system', label: t('theme_system'), icon: 'phone-portrait-outline' },
    { mode: 'light',  label: t('theme_light'),  icon: 'sunny-outline'          },
    { mode: 'dark',   label: t('theme_dark'),   icon: 'moon-outline'           },
  ];

  const OPTIONS = [
    { key: 'language', label: t('opt_language'),   onPress: () => setLangModalVisible(true)  },
    { key: 'theme',    label: t('opt_theme'),       onPress: () => setThemeModalVisible(true) },
    { key: 'clear',    label: t('opt_clear_data'),  onPress: () => setClearModalVisible(true)  },
    { key: 'about',    label: t('opt_about'),       onPress: () => setAboutModalVisible(true) },
  ];

  // No hace falta reiniciar la app: idioma y tema se aplican al instante y la
  // lista de "Mis rutas" se vuelve a leer al enfocar Inicio
  async function handleClearConfirm() {
    setClearModalVisible(false);
    try {
      await Promise.all([
        AsyncStorage.removeItem(USER_ROUTES_KEY),
        resetLanguage(),
        resetTheme(),
      ]);
      Alert.alert(t('data_cleared'));
    } catch {
      Alert.alert(t('data_clear_error'));
    }
  }

return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={LOGO} style={styles.logo} />
        </View>
        <Text style={styles.appName}>Jahapa</Text>
        <Text style={styles.version}>{t('version', { v: '1.0.0' })}</Text>
      </View>

      <View style={styles.listCard}>
        {OPTIONS.map((item, index) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.item, index < OPTIONS.length - 1 && styles.itemBorder]}
            activeOpacity={item.onPress ? 0.6 : 1}
            onPress={item.onPress ?? undefined}
          >
            <Text style={styles.itemText}>{item.label}</Text>
            {item.onPress && (
              <Ionicons name="chevron-forward" size={16} color={colors.chevron} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Modal: Borrar datos ── */}
      <Modal visible={clearModalVisible} transparent animationType="fade" onRequestClose={() => setClearModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setClearModalVisible(false)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t('clear_data_title')}</Text>
            <View style={styles.modalItem}>
              <Text style={styles.clearMsg}>{t('clear_data_msg')}</Text>
            </View>
            <TouchableOpacity style={[styles.modalItem, { justifyContent: 'center' }]} onPress={handleClearConfirm} activeOpacity={0.7}>
              <Text style={styles.clearConfirmText}>{t('clear_data_confirm')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setClearModalVisible(false)}>
              <Text style={styles.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal: Idioma ── */}
      <Modal visible={langModalVisible} transparent animationType="fade" onRequestClose={() => setLangModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setLangModalVisible(false)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t('select_language')}</Text>
            {LANGUAGES.map((lang) => {
              const selected = language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={styles.modalItem}
                  onPress={() => { setLanguage(lang.code); setLangModalVisible(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalItemText, selected && styles.modalItemActive]}>{lang.nativeName}</Text>
                  {selected && <Ionicons name="checkmark" size={18} color="#E8611A" />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setLangModalVisible(false)}>
              <Text style={styles.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal: Tema ── */}
      <Modal visible={themeModalVisible} transparent animationType="fade" onRequestClose={() => setThemeModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setThemeModalVisible(false)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t('select_theme')}</Text>
            {THEMES.map((item) => {
              const selected = themeMode === item.mode;
              return (
                <TouchableOpacity
                  key={item.mode}
                  style={styles.modalItem}
                  onPress={() => { setThemeMode(item.mode); setThemeModalVisible(false); }}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowLeft}>
                    <Ionicons name={item.icon} size={18} color={selected ? '#E8611A' : colors.textSub} style={{ marginRight: 10 }} />
                    <Text style={[styles.modalItemText, selected && styles.modalItemActive]}>{item.label}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark" size={18} color="#E8611A" />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setThemeModalVisible(false)}>
              <Text style={styles.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal: Acerca de ── */}
      <Modal visible={aboutModalVisible} transparent animationType="fade" onRequestClose={() => setAboutModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAboutModalVisible(false)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>

            {/* Título: nombre del repo */}
            <Text style={styles.modalTitle}>turismo-asu-frontend</Text>

            {/* Descripción + badge */}
            <View style={styles.modalItem}>
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={styles.aboutDesc}>{t('about_description')}</Text>
                <View style={styles.aboutBadge}>
                  <Text style={styles.aboutBadgeText}>{t('about_stack')}</Text>
                </View>
              </View>
            </View>

            {/* Sección: Desarrolladores */}
            <Text style={styles.sectionLabel}>{t('about_devs')}</Text>
            {DEVS.map((dev) => (
              <TouchableOpacity
                key={dev.username}
                style={styles.modalItem}
                onPress={() => Linking.openURL(`https://github.com/${dev.username}`)}
                activeOpacity={0.7}
              >
                <View style={styles.rowLeft}>
                  <Image source={{ uri: dev.avatar }} style={styles.devAvatar} />
                  <Text style={styles.modalItemText}>{dev.username}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.chevron} />
              </TouchableOpacity>
            ))}

            {/* Ver en GitHub */}
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => Linking.openURL(REPO_URL)}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="logo-github" size={18} color="#E8611A" style={{ marginRight: 10 }} />
                <Text style={[styles.modalItemText, { color: '#E8611A' }]}>{t('about_view_github')}</Text>
              </View>
              <Ionicons name="open-outline" size={16} color="#E8611A" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setAboutModalVisible(false)}>
              <Text style={styles.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>

          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function getStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
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
      color: colors.text,
      marginBottom: 2,
    },
    version: {
      fontSize: 14,
      color: colors.textSub,
    },

    // Lista principal
    listCard: {
      marginHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: 14,
      overflow: 'hidden',
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 15,
      paddingHorizontal: 16,
    },
    itemBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderMid,
    },
    itemText: {
      fontSize: 16,
      color: colors.text,
    },

    // Modal base (compartido por los 3 modales)
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalBox: {
      width: '82%',
      backgroundColor: colors.modalBg,
      borderRadius: 16,
      paddingTop: 20,
      paddingBottom: 8,
      overflow: 'hidden',
    },
    modalTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSub,
      textAlign: 'center',
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.modalBorder,
      marginHorizontal: 20,
    },
    modalItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    modalItemText: {
      fontSize: 16,
      color: colors.text,
    },
    modalItemActive: {
      color: '#E8611A',
      fontWeight: '600',
    },
    cancelBtn: {
      paddingVertical: 14,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 15,
      color: colors.textMuted,
    },

    // Borrar datos
    clearMsg: {
      fontSize: 13,
      color: colors.textSub,
      lineHeight: 18,
      flex: 1,
    },
    clearConfirmText: {
      fontSize: 16,
      color: '#E8344E',
      fontWeight: '600',
      textAlign: 'center',
    },

    // About — elementos propios
    aboutDesc: {
      fontSize: 13,
      color: colors.textSub,
      lineHeight: 18,
    },
    aboutBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    aboutBadgeText: {
      fontSize: 11,
      color: colors.textSub,
      fontWeight: '500',
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      paddingHorizontal: 24,
      paddingTop: 14,
      paddingBottom: 6,
    },
    devAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.photoPlaceholder,
      marginRight: 12,
    },
  });
}
