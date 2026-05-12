import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { usePreloadAssets } from './src/hooks/usePreloadAssets'; 

// Screens
import SplashScreen from './src/screens/Onboarding/SplashScreen';
import AgeInputScreen from './src/screens/Onboarding/AgeGateScreen';

const Stack = createStackNavigator();

export default function App() {
  const isReady = usePreloadAssets();

  // If assets aren't ready, keep showing the splash or a blank view 
  // that matches the splash background color.
  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Splash"
        screenOptions={{ 
          headerShown: false,
          // 'none' prevents the "sliding" animation which can highlight the pop-in
          animationEnabled: false 
        } as any}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="AgeInput" component={AgeInputScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}