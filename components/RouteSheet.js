import { useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, PanResponder, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n';
import { useTheme } from '../theme';

// Alto visible cuando el panel está plegado: asa, título y la primera parada
export const SHEET_COLLAPSED_HEIGHT = 172;

// Proporción de la pantalla que ocupa el panel desplegado
const SHEET_RATIO = 0.72;

// Umbral de velocidad para que el gesto decida el destino sin mirar la posición
const FLING_VELOCITY = 0.5;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function StopRow({ place, index, isLast, colors }) {
  return (
    <View style={[styles.stopRow, !isLast && styles.stopRowGap]}>
      <View style={styles.stopRail}>
        <View style={styles.stopBadge}>
          <Text style={styles.stopBadgeText}>{index + 1}</Text>
        </View>
        {!isLast && (
          <View style={styles.connector}>
            {[0, 1, 2].map((d) => (
              <View key={d} style={[styles.connectorDot, { backgroundColor: colors.borderMid }]} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.stopInfo}>
        <Text style={[styles.stopName, { color: colors.text }]} numberOfLines={1}>{place.name}</Text>
        {place.address && (
          <Text style={[styles.stopSub, { color: colors.textSub }]} numberOfLines={1}>{place.address}</Text>
        )}
      </View>

      <View style={styles.stopIcon}>
        <Ionicons name="list-outline" size={18} color={colors.chevron} />
      </View>
    </View>
  );
}

export default function RouteSheet({ title, places, onEdit, onClear, onOpenExternal }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { height } = useWindowDimensions();

  const sheetHeight = Math.round(height * SHEET_RATIO);
  const collapsedY = Math.max(0, sheetHeight - SHEET_COLLAPSED_HEIGHT);

  const translateY = useRef(new Animated.Value(collapsedY)).current;
  // Posición ya asentada del panel, para saber desde dónde arranca cada gesto
  const restingY = useRef(collapsedY);
  const grabbedY = useRef(collapsedY);

  const snapTo = (target) => {
    restingY.current = target;
    Animated.spring(translateY, {
      toValue: target,
      useNativeDriver: true,
      bounciness: 0,
      speed: 14,
    }).start();
  };

  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderGrant: () => { grabbedY.current = restingY.current; },
      onPanResponderMove: (_, g) => {
        translateY.setValue(clamp(grabbedY.current + g.dy, 0, collapsedY));
      },
      onPanResponderRelease: (_, g) => {
        // Toque sin arrastre: alterna entre plegado y desplegado
        if (Math.abs(g.dy) < 5) {
          snapTo(restingY.current > 0 ? 0 : collapsedY);
          return;
        }
        if (g.vy > FLING_VELOCITY) return snapTo(collapsedY);
        if (g.vy < -FLING_VELOCITY) return snapTo(0);
        const landed = clamp(grabbedY.current + g.dy, 0, collapsedY);
        snapTo(landed > collapsedY / 2 ? collapsedY : 0);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collapsedY],
  );

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          height: sheetHeight,
          backgroundColor: colors.modalBg,
          transform: [{ translateY }],
        },
      ]}
    >
      {/* Sólo esta zona arrastra: así el scroll de abajo no compite con el gesto */}
      <View {...panResponder.panHandlers} style={styles.grabArea}>
        <View style={[styles.handle, { backgroundColor: colors.borderMid }]} />
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {places.map((place, i) => (
          <StopRow
            key={`${place.id ?? i}_${i}`}
            place={place}
            index={i}
            isLast={i === places.length - 1}
            colors={colors}
          />
        ))}

        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={onEdit} activeOpacity={0.85}>
          <Ionicons name="pencil" size={16} color="#fff" />
          <Text style={styles.btnPrimaryText}>{t('edit_route')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnOutline, { borderColor: colors.borderMid }]}
          onPress={onClear}
          activeOpacity={0.85}
        >
          <Ionicons name="close" size={17} color={colors.text} />
          <Text style={[styles.btnOutlineText, { color: colors.text }]}>{t('clear_route')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.btnDark]} onPress={onOpenExternal} activeOpacity={0.85}>
          <Ionicons name="open-outline" size={16} color="#fff" />
          <Text style={styles.btnPrimaryText}>{t('open_in')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 12,
  },

  grabArea: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 20, fontWeight: '700' },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },

  stopRow: { flexDirection: 'row' },
  stopRowGap: { paddingBottom: 6 },
  stopRail: { width: 30, alignItems: 'center' },
  stopBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#E8611A',
    alignItems: 'center', justifyContent: 'center',
  },
  stopBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  connector: {
    flex: 1,
    minHeight: 14,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 4,
  },
  connectorDot: { width: 3, height: 3, borderRadius: 1.5 },

  stopInfo: { flex: 1, paddingLeft: 10, paddingBottom: 12 },
  stopName: { fontSize: 15.5, fontWeight: '600' },
  stopSub: { fontSize: 13, marginTop: 2 },
  stopIcon: { paddingTop: 4, paddingLeft: 8 },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    paddingVertical: 14,
    gap: 8,
    marginTop: 10,
  },
  btnPrimary: { backgroundColor: '#E8611A', marginTop: 6 },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnOutline: { borderWidth: 1, backgroundColor: 'transparent' },
  btnOutlineText: { fontSize: 15, fontWeight: '600' },
  btnDark: { backgroundColor: '#3A3A3A' },
});
