// src/screens/Parent/ParentPortalScreen.tsx
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
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, getDocs } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { auth, db } from "../../services/firebase/config";

const { width, height } = Dimensions.get("window");

// Email validation function
const validateEmail = (email: string): { isValid: boolean; errorMessage: string | null } => {
  const trimmed = email.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, errorMessage: "Please enter an email address" };
  }
  
  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, errorMessage: "Please enter a valid email address" };
  }
  
  // Check for emojis in email
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}]/u;
  if (emojiRegex.test(trimmed)) {
    return { isValid: false, errorMessage: "Email cannot contain emojis" };
  }
  
  // Check for spaces
  if (trimmed.includes(' ')) {
    return { isValid: false, errorMessage: "Email cannot contain spaces" };
  }
  
  return { isValid: true, errorMessage: null };
};

const getEmailHint = (): string => {
  return "Enter the email you used during child setup (e.g., parent@example.com)";
};

export default function ParentPortalScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [validation, setValidation] = useState<{ isValid: boolean; errorMessage: string | null }>({
    isValid: false,
    errorMessage: null,
  });
  const [isTouched, setIsTouched] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const headerAnim = useRef(new Animated.Value(0)).current;

  // Monitor keyboard visibility
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
      Animated.timing(headerAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
      Animated.timing(headerAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Validate email when it changes
  useEffect(() => {
    if (isTouched || email.length > 0) {
      const result = validateEmail(email);
      setValidation(result);
    }
  }, [email, isTouched]);

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (!isTouched && text.length > 0) {
      setIsTouched(true);
    }
  };

  const handleAccess = async () => {
    const result = validateEmail(email);
    if (!result.isValid) {
      Alert.alert("Invalid Email", result.errorMessage || "Please enter a valid email");
      return;
    }

    setIsLoading(true);
    try {
      await signInAnonymously(auth);
      
      const parentsRef = collection(db, "parents");
      const q = query(parentsRef, where("email", "==", email.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert(
          "Email Not Found",
          `We couldn't find a parent account linked to "${email.trim().toLowerCase()}". Make sure you're using the same email you entered during child setup.`
        );
        return;
      }

      const parentDoc = querySnapshot.docs[0];
      const parentData = parentDoc.data();
      const linkedChildren = parentData.linkedChildren || [];

      if (linkedChildren.length === 0) {
        Alert.alert(
          "No Children Found",
          "This parent account has no linked children. Set up a child profile first."
        );
        return;
      }

      navigation.navigate("ParentDashboard", {
        childUids: linkedChildren,
        parentId: parentDoc.id,
      });
    } catch (error) {
      console.error("Parent portal access error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace("AgeInput");
    }
  };

  const headerTranslateY = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
  const headerOpacity = headerAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.5, 0] });
  const contentTranslateY = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });

  const isEmailValid = validation.isValid;
  const showError = isTouched && !validation.isValid && email.length > 0;

  return (
    <LinearGradient colors={["#F7F2FF", "#FFFFFF"]} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false} keyboardShouldPersistTaps="handled">
            
            {/* Animated Back Button */}
            {!isLoading && (
              <Animated.View style={[styles.backBtnWrapper, { transform: [{ translateY: headerTranslateY }], opacity: headerOpacity }]}>
                <TouchableOpacity style={styles.backBtnContainer} onPress={handleGoBack} activeOpacity={0.7}>
                  <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </Animated.View>
            )}

            <Animated.View style={[styles.content, isKeyboardVisible && styles.contentKeyboardVisible, { transform: [{ translateY: contentTranslateY }] }]}>
              
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark" size={50} color="#7C5CBF" />
              </View>

              <Text style={styles.title}>Parent Portal</Text>
              <Text style={styles.subtitle}>
                Enter the email you used when setting up your child's profile.
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#7C5CBF" style={styles.inputIcon} />
                <TextInput
                  ref={inputRef}
                  style={[styles.input, showError && styles.inputError]}
                  placeholder="parent@example.com"
                  placeholderTextColor="#CCCCCC"
                  value={email}
                  onChangeText={handleEmailChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  returnKeyType="done"
                  onSubmitEditing={handleAccess}
                />
                {email.length > 0 && !isLoading && (
                  <TouchableOpacity style={styles.clearButton} onPress={() => setEmail("")}>
                    <Ionicons name="close-circle" size={20} color="#AAA" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Validation Error */}
              {showError && validation.errorMessage && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color="#FF3B30" />
                  <Text style={styles.errorText}>{validation.errorMessage}</Text>
                </View>
              )}

              {/* Success indicator for valid email */}
              {isEmailValid && email.length > 0 && !showError && (
                <View style={styles.validContainer}>
                  <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                  <Text style={styles.validText}>Email format looks good!</Text>
                </View>
              )}

              {/* Hint Text */}
              <Text style={styles.hintText}>{getEmailHint()}</Text>

              {/* Continue Button */}
              <TouchableOpacity
                style={[styles.btn, (!isEmailValid || email.length === 0 || isLoading) && styles.btnDisabled]}
                onPress={handleAccess}
                disabled={!isEmailValid || email.length === 0 || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text style={styles.btnText}>View My Child's Progress</Text>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                  </>
                )}
              </TouchableOpacity>

              {isKeyboardVisible && <View style={styles.keyboardSpacer} />}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center" },
  
  backBtnWrapper: { position: "absolute", top: Platform.OS === "ios" ? 50 : 30, left: 20, zIndex: 100 },
  backBtnContainer: { width: width > 400 ? 45 : 40, height: width > 400 ? 45 : 40, borderRadius: (width > 400 ? 45 : 40) / 2, backgroundColor: "#7C5CBF", justifyContent: "center", alignItems: "center", shadowColor: "#7C5CBF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  
  content: { paddingHorizontal: width > 400 ? 32 : 24, paddingVertical: 40, flex: 1, justifyContent: "center" },
  contentKeyboardVisible: { paddingVertical: 20 },
  
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#EDE8FF", alignItems: "center", justifyContent: "center", marginBottom: 20, alignSelf: "center" },
  
  title: { fontSize: width > 400 ? 28 : 24, fontFamily: "Poppins-ExtraBold", color: "#2D2D2D", textAlign: "center" },
  subtitle: { fontSize: width > 400 ? 14 : 12, fontFamily: "Poppins-Medium", color: "#8A8A8A", textAlign: "center", marginTop: 8, lineHeight: 20, paddingHorizontal: 20, marginBottom: 32 },
  
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 20, borderWidth: 2, borderColor: "#E8DEFF", paddingHorizontal: 16, height: 58, width: "100%" },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, fontFamily: "Poppins-Medium", color: "#2D2D2D", paddingVertical: 12 },
  inputError: { borderColor: "#FF3B30" },
  clearButton: { padding: 4 },
  
  errorContainer: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, backgroundColor: "#FFE8E8", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, width: "100%" },
  errorText: { fontSize: 12, fontFamily: "Poppins-Medium", color: "#FF3B30", flex: 1 },
  
  validContainer: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, alignSelf: "flex-start" },
  validText: { fontSize: 12, fontFamily: "Poppins-Medium", color: "#4CAF50" },
  
  hintText: { fontSize: 11, fontFamily: "Poppins-Regular", color: "#AAAAAA", marginTop: 12, textAlign: "center" },
  
  btn: { width: "100%", backgroundColor: "#7C5CBF", borderRadius: 25, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 24, elevation: 4 },
  btnDisabled: { backgroundColor: "#D1D1D1" },
  btnText: { color: "white", fontSize: width > 400 ? 16 : 14, fontFamily: "Poppins-Bold" },
  
  keyboardSpacer: { height: 20 },
});