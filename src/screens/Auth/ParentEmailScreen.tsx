// src/screens/Auth/ParentEmailScreen.tsx
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Image,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import LoadingDots from "../../components/LoadingDots";
import { requestParentConsent, verifyParentAnswer } from "../../services/onboardingLogic";

const { width } = Dimensions.get("window");

type AuthStep = "EMAIL" | "WAITING" | "QUIZ";

export default function ParentEmailScreen({ navigation, route }: any) {
  const [step, setStep] = useState<AuthStep>("EMAIL");
  const [email, setEmail] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [consentId, setConsentId] = useState<string>("");
  const [mathQuestion, setMathQuestion] = useState<string>("");

  const { ageGroup } = route?.params || {};
  const slideAnim = useRef(new Animated.Value(0)).current;

  const transitionTo = (nextStep: AuthStep) => {
    Animated.timing(slideAnim, {
      toValue: -width,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      slideAnim.setValue(width);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleSendEmail = async () => {
    if (!email.includes("@")) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    transitionTo("WAITING");

    try {
      const result = await requestParentConsent(email);
      setConsentId(result.consentId);
      setMathQuestion(result.mathQuestion);
      console.log("Consent saved:", result.consentId);
      transitionTo("QUIZ");
    } catch (error: any) {
      console.error("Error:", error);
      Alert.alert("Error", "Failed to send consent. Please try again.");
      transitionTo("EMAIL");
    } finally {
      setIsLoading(false);
    }
  };

  const checkMath = async () => {
    if (!answer) return;
    setIsFinishing(true);

    try {
      const verified = await verifyParentAnswer(consentId, answer);
      if (verified) {
        setTimeout(() => {
          navigation.navigate("NameInput", { ageGroup });
        }, 1000);
      } else {
        Alert.alert("Wrong Answer", "Please try again.");
        setAnswer("");
        setIsFinishing(false);
      }
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", "Verification failed. Please try again.");
      setAnswer("");
      setIsFinishing(false);
    }
  };

  return (
    <LinearGradient colors={["#FDFBFF", "#F4F0FF"]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.inner}
        >
          <View style={styles.logoContainer}>
            <Image
              source={require("../../../assets/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Animated.View
            style={[
              styles.cardContainer,
              { transform: [{ translateX: slideAnim }] },
            ]}
          >
            {step === "EMAIL" && (
              <View style={styles.stepContent}>
                <Text style={styles.title}>Parental Link</Text>
                <Text style={styles.subtitle}>
                  Enter your email to receive a secure access link for your child's profile.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="parent@email.com"
                  placeholderTextColor="#AAA"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={[styles.mainBtn, isLoading && { opacity: 0.6 }]}
                  onPress={handleSendEmail}
                  disabled={isLoading}
                >
                  <Text style={styles.btnText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}

            {step === "WAITING" && (
              <View style={styles.stepContent}>
                <View style={styles.loaderWrapper}>
                  <LoadingDots color="#7C5CBF" />
                </View>
                <Text style={styles.title}>Sending Email</Text>
                <Text style={styles.subtitle}>
                  Saving consent request and sending a math challenge to {email}...
                </Text>
              </View>
            )}

            {step === "QUIZ" && (
              <View style={styles.stepContent}>
                <View style={styles.successIcon}>
                  <Ionicons name="lock-open" size={50} color="#7C5CBF" />
                </View>
                <Text style={styles.title}>Safety Check</Text>
                <Text style={styles.subtitle}>
                  Solve this to prove you're the parent:
                </Text>

                <View style={styles.quizBox}>
                  <Text style={styles.mathText}>{mathQuestion || "14 + 26"} =</Text>
                  <TextInput
                    style={styles.mathInput}
                    placeholder="?"
                    placeholderTextColor="#DDD"
                    keyboardType="numeric"
                    value={answer}
                    onChangeText={setAnswer}
                    maxLength={3}
                    autoFocus
                    editable={!isFinishing}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.goBtn, isFinishing && { backgroundColor: "#EEE" }]}
                  onPress={checkMath}
                  disabled={isFinishing}
                >
                  {isFinishing ? (
                    <LoadingDots color="#7C5CBF" />
                  ) : (
                    <Text style={styles.btnText}>Unlock Profile</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 25, paddingTop: 20 },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  logo: { width: 140, height: 50 },
  cardContainer: { flex: 1, width: "100%" },
  stepContent: { width: "100%", alignItems: "center" },
  title: {
    fontFamily: "Poppins-ExtraBold",
    fontSize: 28,
    color: "#1A1A1A",
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Poppins-Medium",
    fontSize: 15,
    color: "#777",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 22,
  },
  input: {
    width: "100%",
    height: 65,
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingHorizontal: 25,
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    marginTop: 35,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  mainBtn: {
    width: "100%",
    height: 65,
    backgroundColor: "#7C5CBF",
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    gap: 10,
  },
  btnText: { color: "#FFF", fontFamily: "Poppins-Bold", fontSize: 18 },
  loaderWrapper: { height: 120, justifyContent: "center" },
  successIcon: { marginBottom: 10 },
  quizBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginVertical: 40,
    backgroundColor: "#FFF",
    padding: 25,
    borderRadius: 30,
    elevation: 3,
    shadowOpacity: 0.05,
  },
  mathText: { fontFamily: "Poppins-ExtraBold", fontSize: 36, color: "#1A1A1A" },
  mathInput: {
    width: 70,
    borderBottomWidth: 3,
    borderColor: "#7C5CBF",
    fontSize: 36,
    fontFamily: "Poppins-Bold",
    textAlign: "center",
    color: "#7C5CBF",
  },
  goBtn: {
    width: "100%",
    height: 65,
    backgroundColor: "#7C5CBF",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});