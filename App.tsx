import React from "react";
import { View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { usePreloadAssets } from "./src/hooks/usePreloadAssets";

// Screens
import SplashScreen from "./src/screens/Onboarding/SplashScreen";
import AgeInputScreen from "./src/screens/Onboarding/AgeGateScreen";
import NameInputScreen from "./src/screens/Onboarding/NameInputScreen";
import ParentConsentScreen from "./src/screens/Onboarding/ParentConsentScreen";
import ParentEmailScreen from "./src/screens/Auth/ParentEmailScreen";
import CharacterSelectScreen from "./src/screens/Main/CharacterSelectScreen";
import SessionScreen from "./src/screens/Main/SessionScreen";

const Stack = createStackNavigator();

export default function App() {
  const isReady = usePreloadAssets();

  // If assets aren't ready, keep showing the splash or a blank view
  // that matches the splash background color.
  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: "#FFFFFF" }} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={
          {
            headerShown: false,
            animationEnabled: false,
          } as any
        }
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="AgeInput" component={AgeInputScreen} />
        <Stack.Screen name="ParentConsent" component={ParentConsentScreen} />
        <Stack.Screen
          name="ParentEmail"
          component={ParentEmailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="NameInput" component={NameInputScreen} />
        <Stack.Screen
          name="CharacterSelect"
          component={CharacterSelectScreen}
        />
        <Stack.Screen name="Session" component={SessionScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
