// src/screens/Parent/ParentPortalScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase/config";

export default function ParentPortalScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAccess = async () => {
    if (!email.includes("@")) {
      Alert.alert("Invalid Email", "Please enter the email you used during setup.");
      return;
    }

    setIsLoading(true);
    try {
      // Query parents collection by email
      const parentsRef = collection(db, "parents");
      const q = query(parentsRef, where("email", "==", email.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert(
          "Not Found",
          "We couldn't find a parent account linked to this email. Make sure you're using the email entered during setup."
        );
        return;
      }

      // Get the first matching parent document (email should be unique)
      const parentDoc = querySnapshot.docs[0];
      const parentData = parentDoc.data();
      const linkedChildren = parentData.linkedChildren || [];

      if (linkedChildren.length === 0) {
        Alert.alert(
          "No Children Found",
          "This parent account has no linked children. Please check your setup."
        );
        return;
      }

      // Navigate to ParentDashboardScreen with all child UIDs
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

          <Text style={styles.title}>Parent Portal</Text>
          <Text style={styles.subtitle}>
            Enter the email you used when setting up your child's profile to view their progress.
          </Text>

          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#7C5CBF" style={{ marginRight: 10 }} />
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor="#CCCCCC"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, (!email.includes("@") || isLoading) && styles.btnDisabled]}
            onPress={handleAccess}
            disabled={!email.includes("@") || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.btnText}>View My Child's Progress →</Text>
            )}
          </TouchableOpacity>

          <View style={styles.privacyNote}>
            <Ionicons name="lock-closed-outline" size={14} color="#AAAAAA" />
            <Text style={styles.privacyText}>
              No password required. Your email is verified securely.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 24 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0EAFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0EAFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { fontSize: 28, fontFamily: "Poppins-ExtraBold", color: "#2D2D2D", textAlign: "center" },
  subtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#8A8A8A",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 21,
    marginBottom: 32,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 58,
    borderWidth: 2,
    borderColor: "#E8DEFF",
    width: "100%",
    marginBottom: 16,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Poppins-Medium", color: "#2D2D2D" },
  btn: {
    width: "100%",
    height: 58,
    backgroundColor: "#7C5CBF",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  btnDisabled: { backgroundColor: "#CCCCCC" },
  btnText: { color: "white", fontSize: 15, fontFamily: "Poppins-Bold" },
  privacyNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },
  privacyText: { fontSize: 11, fontFamily: "Poppins-Medium", color: "#AAAAAA" },
});