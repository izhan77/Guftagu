import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Screens - Ensure these paths are exactly correct
import SplashScreen from './src/screens/Onboarding/SplashScreen';
import AgeInputScreen from './src/screens/Onboarding/AgeGateScreen';

const Stack = createStackNavigator();

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Artificial delay to simulate asset loading
    const timer = setTimeout(() => setIsReady(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Splash"
        screenOptions={{ 
          headerShown: false,
          animationEnabled: false 
        } as any}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="AgeInput" component={AgeInputScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}