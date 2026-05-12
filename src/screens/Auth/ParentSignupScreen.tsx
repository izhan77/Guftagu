import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function ParentSignupScreen({ navigation, route }: any) {
  const [email, setEmail] = useState("");
  const { ageGroup } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <TouchableOpacity
          style={styles.backBtnContainer}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.title}>Parent's Signup</Text>
        <Text style={styles.subtitle}>
          Enter your email to verify consent and unlock your child's profile.
        </Text>

        <View style={styles.inputWrapper}>
          <Ionicons
            name="mail-outline"
            size={20}
            color="#7C5CBF"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="parent@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.mainButton,
            !email.includes("@") && styles.disabledButton,
          ]}
          onPress={() =>
            navigation.navigate("NameInput", { ageGroup, parentEmail: email })
          }
          disabled={!email.includes("@")}
        >
          <Text style={styles.mainButtonText}>Continue with Email</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity style={styles.googleButton}>
          <Ionicons name="logo-google" size={20} color="#444" />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          By continuing, you agree to our Safety Policy for minors.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { flex: 1, padding: 24 },
  backBtnContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#7C5CBF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
    shadowColor: "#7C5CBF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  title: { fontSize: 32, fontFamily: "Poppins-ExtraBold", color: "#2D2D2D", marginTop: 30 },
  subtitle: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#626161",
    marginTop: 8,
    marginBottom: 40,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
    marginBottom: 20,
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#2D2D2D",
  },
  mainButton: {
    backgroundColor: "#7C5CBF",
    height: 60,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: { backgroundColor: "#CCC" },
  mainButtonText: { color: "white", fontSize: 16, fontFamily: "Poppins-Bold" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 30 },
  line: { flex: 1, height: 1, backgroundColor: "#EEE" },
  dividerText: {
    marginHorizontal: 15,
    color: "#AAA",
    fontFamily: "Poppins-Bold",
    fontSize: 12,
  },
  googleButton: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    height: 60,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE",
    gap: 10,
  },
  googleButtonText: { color: "#444", fontSize: 16, fontFamily: "Poppins-Bold" },
  footerNote: {
    textAlign: "center",
    color: "#AAA",
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    marginTop: "auto",
    marginBottom: 10,
  },
});
