import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  SafeAreaView,
  ScrollView,
  ViewStyle,
  TextStyle,
  ImageStyle,
  ImageSourcePropType,
} from "react-native";
import { saveSessionInteraction } from "../../services/onboardingLogic";
import { auth } from "../../services/firebase";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { getCharacterResponse } from "../../services/gemini";

const { width, height } = Dimensions.get("window");

const DEFAULT_CHARACTER_IMAGE = require("../../../assets/characters/zara.png");

type ChatMsg = { role: string; text: string };

export default function SessionScreen({
  navigation,
  route,
}: {
  navigation: { goBack: () => void };
  route: { params?: { character?: any; name?: string; ageGroup?: string } };
}) {
  const { character } = route.params || {};
  const childName = route.params?.name ?? "Buddy";

  const charId: string =
    character?.id && typeof character.id === "string" ? character.id : "zara";
  const themeColor = character?.buttonColor || "#7C5CBF";
  const portrait: ImageSourcePropType =
    character?.image != null ? character.image : DEFAULT_CHARACTER_IMAGE;

  const [status, setStatus] = useState<"idle" | "listening" | "thinking" | "talking">(
    "idle"
  );
  const [chat, setChat] = useState<ChatMsg[]>([]);

  const talkPulse = useRef(new Animated.Value(1)).current;
  const micScale = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView>(null);
  const sessionStartedAt = useRef<number>(Date.now());
  const talkingEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (talkingEndTimer.current) clearTimeout(talkingEndTimer.current);
    };
  }, []);

  useEffect(() => {
    if (status === "talking") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(talkPulse, {
            toValue: 1.04,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(talkPulse, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      talkPulse.stopAnimation();
      talkPulse.setValue(1);
    }
  }, [status, talkPulse]);

  const saveSessionData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const sessionDurationSeconds = Math.floor(
        (Date.now() - sessionStartedAt.current) / 1000
      );

      await saveSessionInteraction(
        user.uid,
        charId,
        sessionDurationSeconds,
        chat
      );
    } catch (error) {
      console.error("Error saving session:", error);
    }
  };

  const handleBack = async () => {
    await saveSessionData();
    navigation.goBack();
  };

  const handlePressIn = () => {
    setStatus("listening");
    Animated.spring(micScale, { toValue: 1.3, useNativeDriver: true }).start();
  };

  const handlePressOut = async () => {
    Animated.spring(micScale, { toValue: 1, useNativeDriver: true }).start();

    const mockUserText = "I love biryani from Burns Road!";
    setChat((prev) => [...prev, { role: "user", text: mockUserText }]);

    setStatus("thinking");

    const aiResponse = await getCharacterResponse(
      mockUserText,
      charId,
      childName,
      [...chat, { role: "user", text: mockUserText }]
    );

    setChat((prev) => [...prev, { role: "ai", text: aiResponse }]);
    setStatus("talking");

    if (talkingEndTimer.current) clearTimeout(talkingEndTimer.current);
    const readMs = Math.min(8000, Math.max(2500, aiResponse.length * 45));
    talkingEndTimer.current = setTimeout(() => setStatus("idle"), readMs);
  };

  return (
    <View style={styles.container}>
      <Animated.Image
        source={portrait}
        style={[styles.fullImage, { transform: [{ scale: talkPulse }] }]}
        resizeMode="cover"
      />

      <LinearGradient
        colors={["rgba(0,0,0,0.35)", "transparent", "rgba(0,0,0,0.85)"]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{character?.name || "Buddy"}</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {chat.map((msg, i) => (
            <View
              key={i}
              style={msg.role === "ai" ? styles.aiMsg : styles.userMsg}
            >
              <BlurView intensity={30} tint="dark" style={styles.bubble}>
                <Text style={styles.msgText}>{msg.text}</Text>
              </BlurView>
            </View>
          ))}

          {status === "thinking" && (
            <View style={styles.aiMsg}>
              <BlurView intensity={30} tint="dark" style={styles.bubble}>
                <Text style={styles.msgText}>Thinking...</Text>
              </BlurView>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Animated.View style={{ transform: [{ scale: micScale }] }}>
            <TouchableOpacity
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={status === "talking" || status === "thinking"}
              style={[
                styles.micBtn,
                {
                  backgroundColor:
                    status === "listening" ? "#FF3B30" : themeColor,
                },
              ]}
            >
              <Ionicons
                name={status === "listening" ? "mic-outline" : "mic"}
                size={40}
                color="white"
              />
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.statusLabel}>
            {status === "listening"
              ? "I am listening..."
              : status === "thinking"
                ? `${character?.name ?? "AI"} is thinking...`
                : status === "talking"
                  ? `${character?.name ?? "AI"} is speaking...`
                  : "Hold to Talk"}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" } as ViewStyle,
  fullImage: {
    ...StyleSheet.absoluteFillObject,
    width,
    height,
  } as ImageStyle,
  safeArea: { flex: 1, zIndex: 10 } as ViewStyle,
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: "white", fontSize: 22, fontWeight: "900" } as TextStyle,
  chatArea: { flex: 1, paddingHorizontal: 20 },
  aiMsg: { alignSelf: "flex-start", marginVertical: 8, maxWidth: "80%" },
  userMsg: { alignSelf: "flex-end", marginVertical: 8, maxWidth: "80%" },
  bubble: {
    padding: 15,
    borderRadius: 25,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  msgText: { color: "white", fontSize: 18, fontWeight: "600" } as TextStyle,
  footer: { paddingBottom: 50, alignItems: "center" },
  micBtn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    elevation: 15,
  },
  statusLabel: {
    color: "white",
    marginTop: 15,
    fontSize: 13,
    fontWeight: "800",
    opacity: 0.8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
