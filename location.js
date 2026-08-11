import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as Location from 'expo-location';

const DEFAULT = { latitude: -25.2867, longitude: -57.647 };

// Tope de espera del GPS al arrancar: pasado esto se sigue con lo que haya
const FIX_TIMEOUT_MS = 8000;
// Antigüedad máxima aceptada para la última posición conocida
const LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;
// Si el fix preciso queda a menos de esto del que ya teníamos, no se actualiza
// (evita que las pantallas vuelvan a pedir datos por unos pocos metros)
const MIN_UPDATE_METERS = 50;

function metersBetween(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('location timeout')), ms)),
  ]);
}

const toLatLng = (pos) => ({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });

// Resuelve la ubicación en dos pasos y avisa por cada fix conseguido: primero la
// última posición conocida (instantánea) y después la precisa. Lanza si no hay
// permiso o si el GPS no responde dentro del tope de espera.
export async function resolvePosition(onFix) {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('location permission denied');

  const last = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS });
  if (last) onFix(toLatLng(last), false);

  const precise = await withTimeout(
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    FIX_TIMEOUT_MS,
  );
  onFix(toLatLng(precise), true);
}

const LocationContext = createContext({
  location: DEFAULT,
  locationRef: { current: null },
  setLocation: () => {},
  ready: false,
});

export function LocationProvider({ children }) {
  const [location, _setLocation] = useState(DEFAULT);
  // false hasta que se resuelve la ubicación inicial (o se agota el intento)
  const [ready, setReady] = useState(false);
  const locationRef = useRef(null);

  const setLocation = useCallback((loc) => {
    locationRef.current = loc;
    _setLocation(loc);
  }, []);

  useEffect(() => {
    let cancelled = false;

    resolvePosition((loc, isPrecise) => {
      if (cancelled) return;
      // El fix rápido ya alcanza para dejar de bloquear las pantallas
      if (!isPrecise) {
        setLocation(loc);
        setReady(true);
        return;
      }
      // El preciso sólo se aplica si mueve la aguja, para no disparar refetches
      if (!locationRef.current || metersBetween(locationRef.current, loc) > MIN_UPDATE_METERS) {
        setLocation(loc);
      }
    })
      // Permiso denegado, GPS lento o error: se sigue con la ubicación que haya
      .catch(() => {})
      .finally(() => { if (!cancelled) setReady(true); });

    return () => { cancelled = true; };
  }, [setLocation]);

  const contextValue = useMemo(
    () => ({ location, locationRef, setLocation, ready }),
    [location, setLocation, ready],
  );

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}
