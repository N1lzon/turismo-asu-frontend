import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';

import HomeScreen from './screens/HomeScreen';
import MapScreen from './screens/MapScreen';
import OptionsScreen from './screens/OptionsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Tab.Navigator>
        <Tab.Screen name="Inicio" component={HomeScreen} />
        <Tab.Screen name="Mapa" component={MapScreen} />
        <Tab.Screen name="Opciones" component={OptionsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
