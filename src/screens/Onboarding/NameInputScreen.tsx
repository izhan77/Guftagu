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

export default function NameInputScreen({ navigation, route }: any) {
  const [name, setName] = useState("");
  const { ageGroup } = route.params;

  return (
    <LinearGradient colors={["#EEE6FF", "#FFFFFF"]} style={styles.container}>
      <SafeAreaView style={styles.safe}>
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
              navigation.navigate("MainApp", {
                screen: "Chat",
                params: { name, ageGroup },
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
