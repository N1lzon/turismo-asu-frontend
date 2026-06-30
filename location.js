import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as Location from 'expo-location';

const DEFAULT = { latitude: -25.2867, longitude: -57.647 };

const LocationContext = createContext({ location: DEFAULT, locationRef: { current: null }, setLocation: () => {} });

export function LocationProvider({ children }) {
  const [location, _setLocation] = useState(DEFAULT);
  const locationRef = useRef(null);

  const setLocation = useCallback((loc) => {
    locationRef.current = loc;
    _setLocation(loc);
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    })();
  }, [setLocation]);

  const contextValue = useMemo(
    () => ({ location, locationRef, setLocation }),
    [location, setLocation],
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
