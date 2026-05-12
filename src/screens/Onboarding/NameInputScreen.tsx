import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function NameInputScreen({ navigation, route }: any) {
  const [name, setName] = useState("");
  const { ageGroup } = route.params;

  return (
    <LinearGradient colors={["#EEE6FF", "#FFFFFF"]} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Consistent Purple Back Button */}
        <TouchableOpacity
          style={styles.backBtnContainer}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
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
          />

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: name.length > 2 ? "#7C5CBF" : "#D1D1D1" },
            ]}
            onPress={() =>
              navigation.navigate("CharacterSelect", {
                name,
                ageGroup,
              })
            }
            disabled={name.length <= 2}
          >
            <Text style={styles.buttonText}>Start My Journey</Text>
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
    // Matching shadow
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
