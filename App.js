import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from './screens/HomeScreen';
import MapScreen from './screens/MapScreen';
import MapSearchScreen from './screens/MapSearchScreen';
import OptionsScreen from './screens/OptionsScreen';
import SearchScreen from './screens/SearchScreen';
import PlaceDetailScreen from './screens/PlaceDetailScreen';

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
    </Stack.Navigator>
  );
}

function MapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Map" component={MapScreen} />
      <Stack.Screen name="MapSearch" component={MapSearchScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="PlaceDetail" component={PlaceDetailScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}

function AppTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#E8611A',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#eee',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarIconStyle: { marginTop: 0 },
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
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <AppTabs />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
