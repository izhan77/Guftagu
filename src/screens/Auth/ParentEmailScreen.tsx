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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import LoadingDots from "../../components/LoadingDots";

const { width } = Dimensions.get("window");

type AuthStep = "EMAIL" | "WAITING" | "QUIZ";

export default function ParentEmailScreen({ navigation, route }: any) {
  const [step, setStep] = useState<AuthStep>("EMAIL");
  const [email, setEmail] = useState("");
  const [answer, setAnswer] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);

  const { ageGroup } = route?.params || {};

  const slideAnim = useRef(new Animated.Value(0)).current;
  const quiz = { question: "14 + 26", result: 40 };

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

  const handleSendEmail = () => {
    if (!email.includes("@")) return;
    transitionTo("WAITING");

    setTimeout(() => {
      transitionTo("QUIZ");
    }, 3000);
  };

  const checkMath = () => {
    if (parseInt(answer) === quiz.result) {
      setIsFinishing(true);

      setTimeout(() => {
        navigation.navigate("NameInput", { ageGroup });
      }, 1500);
    } else {
      setAnswer("");
    }
  };

  return (
    <LinearGradient colors={["#FDFBFF", "#F4F0FF"]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.inner}
        >
          {/* Logo Section - CENTERED */}
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
            {/* STEP 1: EMAIL */}
            {step === "EMAIL" && (
              <View style={styles.stepContent}>
                <Text style={styles.title}>Parental Link</Text>
                <Text style={styles.subtitle}>
                  Enter your email to receive a secure access link for your
                  child's profile.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="parent@email.com"
                  placeholderTextColor="#AAA"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.mainBtn}
                  onPress={handleSendEmail}
                >
                  <Text style={styles.btnText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 2: WAITING */}
            {step === "WAITING" && (
              <View style={styles.stepContent}>
                <View style={styles.loaderWrapper}>
                  <LoadingDots color="#7C5CBF" />
                </View>
                <Text style={styles.title}>Verifying Email</Text>
                <Text style={styles.subtitle}>
                  We've sent a link to {email}. We'll move forward once you tap
                  it!
                </Text>
              </View>
            )}

            {/* STEP 3: MATH QUIZ */}
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
                  <Text style={styles.mathText}>{quiz.question} =</Text>
                  <TextInput
                    style={styles.mathInput}
                    placeholder="?"
                    placeholderTextColor="#DDD"
                    keyboardType="numeric"
                    value={answer}
                    onChangeText={setAnswer}
                    maxLength={2}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.goBtn,
                    isFinishing && { backgroundColor: "#EEE" },
                  ]}
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
  
  // Logo Container - Centers the logo
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  logo: {
    width: 140,
    height: 50,
  },
  
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