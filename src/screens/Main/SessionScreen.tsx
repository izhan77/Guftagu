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
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Audio } from "expo-av";

// Import your services
import { getCharacterResponse } from "../../services/gemini";
import { getCharacterAudio } from "../../services/elevenlabs";

const { width, height } = Dimensions.get("window");

// --- ASSET MAPPING ---
const CHAR_ASSETS: Record<string, { idle: any; talking: any }> = {
  zara: {
    idle: require("../../../assets/videos/zara/zara_idle.mp4"),
    talking: require("../../../assets/videos/zara/zara_talking.mp4"),
  },
  robo: {
    idle: require("../../../assets/videos/robo_bhaya/robo_idle.mp4"),
    talking: require("../../../assets/videos/robo_bhaya/robo_talking.mp4"),
  },
  ustad: {
    idle: require("../../../assets/videos/ustad_sahab/ustad_idle.mp4"),
    talking: require("../../../assets/videos/ustad_sahab/ustad_talking.mp4"),
  },
};

export default function SessionScreen({ navigation, route }: any) {
  const { character, childName } = route.params || {};
  const charId =
    character?.id && character.id in CHAR_ASSETS ? character.id : "zara";
  const themeColor = character?.buttonColor || "#FF9500";
  const activeAssets = CHAR_ASSETS[charId];

  // --- STATE ---
  const [status, setStatus] = useState<
    "idle" | "listening" | "thinking" | "talking"
  >("idle");
  const [chat, setChat] = useState<{ role: string; text: string }[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const talkOpacity = useRef(new Animated.Value(0)).current;
  const micScale = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView>(null);

  // --- VIDEO PLAYERS ---
  const idlePlayer = useVideoPlayer(activeAssets.idle, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const talkPlayer = useVideoPlayer(activeAssets.talking, (p) => {
    p.loop = true; // Loop the generic "talking" video
    p.muted = true;
  });

  // --- EFFECTS ---
  // Manage Video Transitions (Cross-fade)
  useEffect(() => {
    if (status === "talking") {
      talkPlayer.play();
      Animated.timing(talkOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(talkOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        talkPlayer.pause();
      });
    }
  }, [status]);

  // Cleanup sound
  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  // --- CORE LOGIC ---
  const handlePressIn = () => {
    setStatus("listening");
    Animated.spring(micScale, { toValue: 1.3, useNativeDriver: true }).start();
  };

  const handlePressOut = async () => {
    Animated.spring(micScale, { toValue: 1, useNativeDriver: true }).start();

    // 1. Mock user speech (Replace with real STT later)
    const userSpeech = "I like biryani from Burns Road!";
    setChat((prev) => [...prev, { role: "user", text: userSpeech }]);
    setStatus("thinking");

    try {
      // 2. Get Brain Response (Gemini)
      const aiText = await getCharacterResponse(
        userSpeech,
        charId,
        childName,
        chat,
      );
      setChat((prev) => [...prev, { role: "ai", text: aiText }]);
      setChat((prev) => [...prev, { role: "ai", text: aiText }]);

      // 3. Get Voice (ElevenLabs)
      const base64Audio = await getCharacterAudio(aiText, charId);

      if (base64Audio) {
        // 4. Prepare and Play Audio
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: base64Audio },
          { shouldPlay: true },
        );
        setSound(newSound);

        // 5. Start Lip Sync Video
        setStatus("talking");

        newSound.setOnPlaybackStatusUpdate((playbackStatus) => {
          if (playbackStatus.isLoaded && playbackStatus.didJustFinish) {
            setStatus("idle"); // Audio done -> Return to idle blinking
            newSound.unloadAsync();
          }
        });
      } else {
        setStatus("idle");
      }
    } catch (error) {
      console.error("Session Error:", error);
      setStatus("idle");
    }
  };

  return (
    <View style={styles.container}>
      {/* LAYER 1: IDLE (Always running) */}
      <View style={StyleSheet.absoluteFill}>
        <VideoView
          player={idlePlayer}
          style={styles.fullVideo}
          contentFit="cover"
          nativeControls={false}
        />
      </View>

      {/* LAYER 2: TALKING (Fades in over idle) */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: talkOpacity }]}
      >
        <VideoView
          player={talkPlayer}
          style={styles.fullVideo}
          contentFit="cover"
          nativeControls={false}
        />
      </Animated.View>

      <LinearGradient
        colors={["rgba(0,0,0,0.4)", "transparent", "rgba(0,0,0,0.8)"]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{character?.name || "Zara"}</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={{ paddingBottom: 20 }}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {chat.map((msg, i) => (
            <View
              key={i}
              style={msg.role === "ai" ? styles.aiMsg : styles.userMsg}
            >
              <BlurView intensity={40} tint="dark" style={styles.bubble}>
                <Text style={styles.msgText}>{msg.text}</Text>
              </BlurView>
            </View>
          ))}

          {status === "thinking" && (
            <View style={styles.aiMsg}>
              <BlurView intensity={30} tint="dark" style={styles.bubble}>
                <Text style={styles.msgText}>🤔 Thinking...</Text>
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
                size={44}
                color="white"
              />
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.statusLabel}>
            {status === "listening"
              ? "I'm listening..."
              : status === "thinking"
                ? `${character?.name} is thinking...`
                : status === "talking"
                  ? `${character?.name} is speaking...`
                  : "Hold to Talk"}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  fullVideo: { width: width, height: height },
  safeArea: { flex: 1, zIndex: 10 },
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
  headerTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1,
  },
  chatArea: { flex: 1, paddingHorizontal: 20 },
  aiMsg: { alignSelf: "flex-start", marginVertical: 8, maxWidth: "85%" },
  userMsg: { alignSelf: "flex-end", marginVertical: 8, maxWidth: "85%" },
  bubble: {
    padding: 18,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
  },
  msgText: { color: "white", fontSize: 18, fontWeight: "600", lineHeight: 24 },
  footer: { paddingBottom: 60, alignItems: "center" },
  micBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  statusLabel: {
    color: "white",
    marginTop: 20,
    fontSize: 14,
    fontWeight: "800",
    opacity: 0.9,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
});
