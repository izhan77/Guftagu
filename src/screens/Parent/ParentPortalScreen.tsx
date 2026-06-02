import React, { useState } from "react"
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"

// Validation function
const validateAnswer = (text: string): { isValid: boolean; error: string | null } => {
  // Empty check (no error message during typing, just invalid)
  if (text.length === 0) {
    return { isValid: false, error: null }
  }

  // 1. Emoji check using Unicode regex
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F1E0}-\u{1F1FF}]/u
  if (emojiRegex.test(text)) {
    return { isValid: false, error: "Answer cannot contain emojis" }
  }

  // 2. Check for comma
  if (text.includes(',')) {
    return { isValid: false, error: "Only numbers are allowed" }
  }

  // 3. Check for dot or decimal point
  if (text.includes('.')) {
    return { isValid: false, error: "Answer must be a whole number" }
  }

  // 4. Check for any letter or special character (anything not 0-9)
  if (!/^[0-9]+$/.test(text)) {
    return { isValid: false, error: "Only numbers are allowed" }
  }

  return { isValid: true, error: null }
}

export default function ParentPortalScreen({ navigation }: any) {
  const [answer, setAnswer] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleAnswerChange = (text: string) => {
    setAnswer(text)
    const validation = validateAnswer(text)
    setError(validation.error)
  }

  const handleUnlockProfile = async () => {
    // Check for empty field on submit
    if (!answer.trim()) {
      setError("Please enter your answer")
      return
    }

    // Check if there's any validation error
    if (error) return

    // Calculate correct answer
    const correctAnswer = 14 + 36 // 50

    if (parseInt(answer) !== correctAnswer) {
      setError("Incorrect answer. Please try again.")
      return
    }

    setIsLoading(true)
    try {
      // Navigate to Parent Dashboard or next screen
      navigation.navigate("ParentDashboard")
    } catch (e) {
      Alert.alert("Error", "Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <LinearGradient colors={["#F7F2FF", "#FFFFFF"]} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#7C5CBF" />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={40} color="#7C5CBF" />
          </View>

          <Text style={styles.title}>Safety Check</Text>
          <Text style={styles.subtitle}>
            Solve this to prove you're the parent:
          </Text>

          <Text style={styles.mathQuestion}>14 + 36 = ?</Text>

          <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
            <Ionicons name="calculator-outline" size={20} color="#7C5CBF" style={{ marginRight: 10 }} />
            <TextInput
              style={styles.input}
              placeholder="Enter your answer"
              placeholderTextColor="#CCCCCC"
              value={answer}
              onChangeText={handleAnswerChange}
              keyboardType="number-pad"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Error Message */}
          {error && (
            <Text style={styles.errorText}>
              {error}
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.btn,
              (!answer || error) && styles.btnDisabled
            ]}
            onPress={handleUnlockProfile}
            disabled={!answer || !!error || isLoading}
          >
            {isLoading
              ? <ActivityIndicator color="white" />
              : <Text style={styles.btnText}>Unlock Profile →</Text>
            }
          </TouchableOpacity>

          <View style={styles.privacyNote}>
            <Ionicons name="lock-closed-outline" size={14} color="#AAAAAA" />
            <Text style={styles.privacyText}>
              Parent verification required to access child's progress.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 24 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#F0EAFF",
    alignItems: "center", justifyContent: "center",
    marginTop: 12,
  },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#F0EAFF",
    alignItems: "center", justifyContent: "center",
    marginBottom: 20,
  },
  title: { fontSize: 28, fontFamily: "Poppins-ExtraBold", color: "#2D2D2D", textAlign: "center" },
  subtitle: {
    fontSize: 14, fontFamily: "Poppins-Medium",
    color: "#8A8A8A", textAlign: "center",
    marginTop: 10, lineHeight: 21, marginBottom: 16,
  },
  mathQuestion: {
    fontSize: 32,
    fontFamily: "Poppins-ExtraBold",
    color: "#7C5CBF",
    textAlign: "center",
    marginBottom: 32,
  },
  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16, paddingHorizontal: 16, height: 58,
    borderWidth: 2, borderColor: "#C4B5FD",
    width: "100%", marginBottom: 8,
  },
  inputWrapperError: {
    borderColor: "#FF3B30",
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Poppins-Medium", color: "#2D2D2D" },
  errorText: {
    fontSize: 12,
    color: "#FF3B30",
    marginTop: 6,
    textAlign: "center",
    marginBottom: 16,
  },
  btn: {
    width: "100%", height: 58,
    backgroundColor: "#7C5CBF",
    borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    elevation: 4,
    marginTop: 8,
  },
  btnDisabled: { backgroundColor: "#CCCCCC", opacity: 0.5 },
  btnText: { color: "white", fontSize: 15, fontFamily: "Poppins-Bold" },
  privacyNote: {
    flexDirection: "row", alignItems: "center",
    gap: 6, marginTop: 16,
  },
  privacyText: { fontSize: 11, fontFamily: "Poppins-Medium", color: "#AAAAAA" },
})