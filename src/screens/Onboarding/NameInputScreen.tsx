import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

// Import Firebase function
import { saveChildProfile } from "../../services/onboardingLogic";
import { getUserSession } from "../../services/asyncStorage";

export default function NameInputScreen({ navigation, route }: any) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { ageGroup, coppaRequired, initialName } = route.params || {};

  useFocusEffect(
    useCallback(() => {
      const fromParams =
        typeof initialName === "string" ? initialName.trim() : "";
      if (fromParams.length > 0) {
        setName(fromParams);
        return;
      }
      let cancelled = false;
      getUserSession().then((session) => {
        if (cancelled) return;
        const saved = session?.nickname?.trim();
        if (saved)
          setName((prev) => (prev.trim().length > 0 ? prev : saved));
      });
      return () => {
        cancelled = true;
      };
    }, [initialName])
  );

  //  Now saves nickname to Firestore before navigating
  const handleContinue = async () => {
    if (name.length <= 2) return;

    setIsLoading(true);
    try {
      await saveChildProfile(name.trim());
      console.log(" Nickname saved to Firestore:", name);

      navigation.navigate("CharacterSelect", {
        name,
        ageGroup,
        ...(typeof coppaRequired === "boolean" ? { coppaRequired } : {}),
      });
    } catch (error) {
      console.error(" Error saving nickname:", error);
      Alert.alert(
        "Error",
        "Could not save your nickname. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#EEE6FF", "#FFFFFF"]} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity
          style={styles.backBtnContainer}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title}>What should we{"\n"}call you?</Text>
          <Text style={styles.subtitle}>
            Pick a cool nickname for our adventures!
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your name..."
            placeholderTextColor="#AAA"
            value={name}
            onChangeText={setName}
            autoFocus
            editable={!isLoading}
          />

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor:
                  name.length > 2 && !isLoading ? "#7C5CBF" : "#D1D1D1",
              },
            ]}
            onPress={handleContinue}
            disabled={name.length <= 2 || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Start My Journey</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  backBtnContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#7C5CBF",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
    marginLeft: 24,
    shadowColor: "#7C5CBF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  content: { padding: 24, flex: 1, justifyContent: "center" },
  title: { fontSize: 36, fontFamily: "Poppins-ExtraBold", color: "#2D2D2D" },
  subtitle: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#8A8A8A",
    marginTop: 10,
  },
  input: {
    borderBottomWidth: 3,
    borderBottomColor: "#7C5CBF",
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#2D2D2D",
    marginTop: 40,
    paddingBottom: 10,
  },
  button: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 50,
  },
  buttonText: { color: "white", fontSize: 18, fontFamily: "Poppins-Bold" },
});
