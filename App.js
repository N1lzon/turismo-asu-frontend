import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { LanguageProvider, useTranslation } from './i18n';
import { ThemeProvider, useTheme } from './theme';
import { LocationProvider } from './location';
import HomeScreen from './screens/HomeScreen';
import MapScreen from './screens/MapScreen';
import MapSearchScreen from './screens/MapSearchScreen';
import RouteEditorScreen from './screens/RouteEditorScreen';
import OptionsScreen from './screens/OptionsScreen';
import SearchScreen from './screens/SearchScreen';
import PlaceDetailScreen from './screens/PlaceDetailScreen';
import RouteDetailScreen from './screens/RouteDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = {
  Inicio:   ['home',    'home-outline'   ],
  Mapa:     ['map',     'map-outline'    ],
  Opciones: ['options', 'options-outline'],
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="PlaceDetail" component={PlaceDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="RouteDetail" component={RouteDetailScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}

function MapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Map" component={MapScreen} />
      <Stack.Screen name="MapSearch" component={MapSearchScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="RouteEditor" component={RouteEditorScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="PlaceDetail" component={PlaceDetailScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}

function AppTabs() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const TAB_LABELS = {
    Inicio:   t('tab_home'),
    Mapa:     t('tab_map'),
    Opciones: t('tab_options'),
  };

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#E8611A',
          tabBarInactiveTintColor: isDark ? '#666' : '#888',
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: colors.tabBorder,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            backgroundColor: colors.tabBg,
          },
          tabBarLabel: TAB_LABELS[route.name],
          tabBarIcon: ({ focused, color, size }) => {
            const [filledIcon, outlineIcon] = TAB_ICONS[route.name];
            return <Ionicons name={focused ? filledIcon : outlineIcon} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Inicio"   component={HomeStack}    />
        <Tab.Screen name="Mapa"     component={MapStack}     />
        <Tab.Screen name="Opciones" component={OptionsScreen} />
      </Tab.Navigator>
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <ThemeProvider>
            <LocationProvider>
              <NavigationContainer>
                <AppTabs />
              </NavigationContainer>
            </LocationProvider>
          </ThemeProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
