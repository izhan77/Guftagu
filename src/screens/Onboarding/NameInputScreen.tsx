// src/screens/Onboarding/NameInputScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Keyboard,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { saveChildProfile } from "../../services/onboardingLogic";

const { width, height } = Dimensions.get("window");

export default function NameInputScreen({ navigation, route }: any) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const { ageGroup } = route.params;

  // Monitor keyboard visibility with animation
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setIsKeyboardVisible(true);
      // Animate header when keyboard appears
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
      // Animate header back
      Animated.timing(headerAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleContinue = async () => {
    if (name.length <= 2 || isLoading) return;
    
    setIsLoading(true);
    try {
      await saveChildProfile(name.trim());
      navigation.navigate("CharacterSelect", {
        name: name.trim(),
        ageGroup,
        fromOnboarding: true,
      });
    } catch (error) {
      console.error('Error saving nickname:', error);
      Alert.alert("Error", "Could not save your nickname. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Animated styles for back button
  const backButtonTranslateY = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],
  });

  const backButtonOpacity = headerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.5, 0],
  });

  const contentTranslateY = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  return (
    <LinearGradient colors={["#EEE6FF", "#FFFFFF"]} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Animated Back Button */}
            {!isLoading && (
              <Animated.View style={[
                styles.backBtnWrapper,
                {
                  transform: [{ translateY: backButtonTranslateY }],
                  opacity: backButtonOpacity,
                }
              ]}>
                <TouchableOpacity
                  style={styles.backBtnContainer}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </Animated.View>
            )}

            <Animated.View style={[
              styles.content,
              isKeyboardVisible && styles.contentKeyboardVisible,
              { transform: [{ translateY: contentTranslateY }] }
            ]}>
              <Text style={styles.title}>What should we{"\n"}call you?</Text>
              <Text style={styles.subtitle}>
                Pick a cool nickname for our adventures!
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  placeholder="Enter your name..."
                  placeholderTextColor="#AAA"
                  value={name}
                  onChangeText={setName}
                  autoFocus={Platform.OS !== "ios"}
                  editable={!isLoading}
                  maxLength={20}
                  returnKeyType="done"
                  onSubmitEditing={handleContinue}
                />
                {name.length > 0 && !isLoading && (
                  <TouchableOpacity 
                    style={styles.clearButton}
                    onPress={() => setName("")}
                  >
                    <Ionicons name="close-circle" size={20} color="#AAA" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Character counter */}
              {name.length > 0 && (
                <Text style={[
                  styles.counter,
                  name.length < 3 && styles.counterWarning
                ]}>
                  {name.length}/20 characters
                </Text>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: name.length > 2 && !isLoading ? "#7C5CBF" : "#D1D1D1" },
                ]}
                onPress={handleContinue}
                disabled={name.length <= 2 || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Start My Journey</Text>
                )}
              </TouchableOpacity>

              {/* Extra space when keyboard is visible */}
              {isKeyboardVisible && <View style={styles.keyboardSpacer} />}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  backBtnWrapper: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    left: 20,
    zIndex: 100,
  },
  backBtnContainer: {
    width: width > 400 ? 45 : 40,
    height: width > 400 ? 45 : 40,
    borderRadius: (width > 400 ? 45 : 40) / 2,
    backgroundColor: "#7C5CBF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#7C5CBF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  content: {
    paddingHorizontal: width > 400 ? 32 : 24,
    paddingVertical: 40,
    flex: 1,
    justifyContent: "center",
  },
  contentKeyboardVisible: {
    paddingVertical: 20,
  },
  title: {
    fontSize: width > 400 ? 36 : 32,
    fontFamily: "Poppins-ExtraBold",
    color: "#2D2D2D",
    textAlign: "center",
    lineHeight: width > 400 ? 48 : 35,
    marginTop: 22,
  },
  subtitle: {
    fontSize: width > 400 ? 16 : 14,
    fontFamily: "Poppins-SemiBold",
    color: "#8A8A8A",
    marginTop: 12,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "#7C5CBF",
    marginTop: height > 700 ? 50 : 35,
    position: "relative",
  },
  input: {
    flex: 1,
    fontSize: width > 400 ? 24 : 20,
    fontFamily: "Poppins-Bold",
    color: "#2D2D2D",
    paddingBottom: 10,
    paddingRight: 30,
  },
  clearButton: {
    position: "absolute",
    right: 0,
    bottom: 10,
    padding: 4,
  },
  counter: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#7C5CBF",
    marginTop: 8,
    textAlign: "right",
  },
  counterWarning: {
    color: "#FF9800",
  },
  button: {
    paddingVertical: width > 400 ? 18 : 16,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: height > 700 ? 50 : 35,
    flexDirection: "row",
    gap: 10,
  },
  buttonText: {
    color: "white",
    fontSize: width > 400 ? 18 : 16,
    fontFamily: "Poppins-Bold",
  },
  keyboardSpacer: {
    height: 20,
  },
});