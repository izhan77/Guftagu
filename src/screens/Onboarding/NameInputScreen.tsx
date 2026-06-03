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
import { validateNickname, sanitizeNickname, getNicknameHint, ValidationResult } from "../../utils/validation";

const { width, height } = Dimensions.get("window");

export default function NameInputScreen({ navigation, route }: any) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [validation, setValidation] = useState<ValidationResult>({ isValid: false, errorMessage: null });
  const [isTouched, setIsTouched] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const { ageGroup } = route.params;

  // Monitor keyboard visibility with animation
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
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

  // Validate name whenever it changes
  useEffect(() => {
    if (isTouched || name.length > 0) {
      const result = validateNickname(name);
      setValidation(result);
    }
  }, [name, isTouched]);

  const handleNameChange = (text: string) => {
    setName(text);
    if (!isTouched && text.length > 0) {
      setIsTouched(true);
    }
  };

  const handleContinue = async () => {
    // Validate before proceeding
    const result = validateNickname(name);
    
    if (!result.isValid) {
      Alert.alert("Invalid Nickname", result.errorMessage || "Please enter a valid nickname");
      return;
    }
    
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      // Sanitize the nickname before saving
      const sanitizedName = sanitizeNickname(name);
      await saveChildProfile(sanitizedName);
      navigation.replace("CharacterSelect", {  // 🔥 CHANGE: navigate → replace
        name: sanitizedName,
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

  // 🔥 FIXED: Handle back button properly
  const handleGoBack = () => {
    // Check if we can go back in navigation stack
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // If no screen to go back to, go to AgeInput
      navigation.replace("AgeInput");
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

  const isNameValid = validation.isValid && name.trim().length >= 2;
  const showError = isTouched && !validation.isValid && name.length > 0;

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
                  onPress={handleGoBack}  // 🔥 FIXED: Use handleGoBack instead of navigation.goBack
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
                  style={[
                    styles.input,
                    showError && styles.inputError
                  ]}
                  placeholder="Enter your name..."
                  placeholderTextColor="#AAA"
                  value={name}
                  onChangeText={handleNameChange}
                  autoFocus={Platform.OS !== "ios"}
                  editable={!isLoading}
                  maxLength={25}
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

              {/* Validation Messages */}
              {showError && validation.errorMessage && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color="#FF3B30" />
                  <Text style={styles.errorText}>{validation.errorMessage}</Text>
                </View>
              )}

              {/* Character counter with validation status */}
              {name.length > 0 && (
                <View style={styles.counterRow}>
                  <View style={styles.counterItem}>
                    <Text style={[
                      styles.counter,
                      name.length < 2 && styles.counterWarning,
                      isNameValid && styles.counterSuccess
                    ]}>
                      {name.length}/20 chars
                    </Text>
                  </View>
                  {isNameValid && name.length >= 2 && (
                    <View style={styles.validBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                      <Text style={styles.validText}>Good!</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Hint text */}
              <Text style={styles.hintText}>
                {getNicknameHint()}
              </Text>

              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: isNameValid && !isLoading ? "#7C5CBF" : "#D1D1D1" },
                ]}
                onPress={handleContinue}
                disabled={!isNameValid || isLoading}
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
    lineHeight: width > 400 ? 48 : 42,
    marginTop: 32,
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
  inputError: {
    borderBottomColor: "#FF3B30",
  },
  clearButton: {
    position: "absolute",
    right: 0,
    bottom: 10,
    padding: 4,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    backgroundColor: "#FFE8E8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#FF3B30",
    flex: 1,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  counterItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  counter: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#7C5CBF",
  },
  counterWarning: {
    color: "#FF9800",
  },
  counterSuccess: {
    color: "#4CAF50",
  },
  validBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8FFE8",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  validText: {
    fontSize: 10,
    fontFamily: "Poppins-Bold",
    color: "#4CAF50",
  },
  hintText: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#7a7878",
    marginTop: 12,
    textAlign: "center",
  },
  button: {
    paddingVertical: width > 400 ? 18 : 16,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: height > 700 ? 30 : 25,
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