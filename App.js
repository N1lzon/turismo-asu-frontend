import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './screens/HomeScreen';
import MapScreen from './screens/MapScreen';
import OptionsScreen from './screens/OptionsScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Inicio:   ['home',        'home-outline'       ],
  Mapa:     ['map',         'map-outline'        ],
  Opciones: ['options',     'options-outline'    ],
};

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#E8611A',
          tabBarInactiveTintColor: '#888',
          tabBarStyle: { borderTopWidth: 1, borderTopColor: '#eee', height: 60 },
          tabBarIconStyle: { marginTop: 0 },
          tabBarIcon: ({ focused, color, size }) => {
            const [filledIcon, outlineIcon] = TAB_ICONS[route.name];
            return (
              <Ionicons
                name={focused ? filledIcon : outlineIcon}
                size={size}
                color={color}
              />
            );
          },
        })}
      >
        <Tab.Screen name="Inicio"   component={HomeScreen}    />
        <Tab.Screen name="Mapa"     component={MapScreen}     />
        <Tab.Screen name="Opciones" component={OptionsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
