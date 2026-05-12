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
import ParentSignupScreen from "./src/screens/Auth/ParentSignupScreen";
import CharacterSelectScreen from "./src/screens/Main/CharacterSelectScreen";

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
            // 'none' prevents the "sliding" animation which can highlight the pop-in
            animationEnabled: false,
          } as any
        }
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="AgeInput" component={AgeInputScreen} />
        <Stack.Screen name="ParentConsent" component={ParentConsentScreen} />
        <Stack.Screen name="ParentSignup" component={ParentSignupScreen} />
        <Stack.Screen name="NameInput" component={NameInputScreen} />
        <Stack.Screen name="CharacterSelect" component={CharacterSelectScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
