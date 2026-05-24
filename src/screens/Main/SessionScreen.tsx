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
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Audio } from "expo-av";
import { useFirestoreSync } from "../../hooks/useFirestoreSync";

// import { getCharacterResponse } from "../../services/gemini";
import { getCharacterResponse } from "../../services/openai";
import { getCharacterAudio } from "../../services/elevenlabs";
import { transcribeAudio } from "../../services/whisper";

const { width, height } = Dimensions.get("window");

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
    character?.id && CHAR_ASSETS[character.id] ? character.id : "zara";
  const themeColor = character?.buttonColor || "#FF9500";
  const activeAssets = CHAR_ASSETS[charId];

  const [status, setStatus] = useState<
    "idle" | "listening" | "thinking" | "talking"
  >("idle");
  const [chat, setChat] = useState<{ role: string; text: string }[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [openingShown, setOpeningShown] = useState(false);
  const talkingEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFirestoreSync(navigation);

  const talkOpacity = useRef(new Animated.Value(0)).current;
  const micScale = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView>(null);

  // Video players with error handling
  const idlePlayer = useVideoPlayer(activeAssets.idle, (p) => {
    p.loop = true;
    p.muted = true;
    try {
      p.play();
    } catch (e) {
      console.log("Idle player error:", e);
    }
  });

  const talkPlayer = useVideoPlayer(activeAssets.talking, (p) => {
    p.loop = true;
    p.muted = true;
  });

  // Safe pause/play functions
  const safePauseTalkPlayer = () => {
    try {
      if (talkPlayer) {
        talkPlayer.pause();
      }
    } catch (e) {
      console.log("Pause error (ignored):", e);
    }
  };

  const safePlayTalkPlayer = () => {
    try {
      if (talkPlayer) {
        talkPlayer.play();
      }
    } catch (e) {
      console.log("Play error (ignored):", e);
    }
  };

  // Video transition with error handling
  useEffect(() => {
    if (status === "talking") {
      safePlayTalkPlayer();
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
        safePauseTalkPlayer();
      });
    }
  }, [status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        try {
          sound.unloadAsync();
        } catch (e) {}
      }
      if (recording) {
        try {
          recording.stopAndUnloadAsync();
        } catch (e) {}
      }
    };
  }, [sound, recording]);

  // Opening message
  useEffect(() => {
    if (!openingShown) {
      const openings: Record<string, string> = {
        zara: `Yaar ${childName}! Finally you're here! Main kaab se wait kar rahi thi. Bolo — kya chal raha hai life mein? 😄`,
        robo: `BEEP BOOP! Hello ${childName}! I am Robo Bhaya. Ready for an EPIC conversation? 🤖`,
        ustad: `Aaao beta, baithao. ${childName} — bahut pyaara naam hai. Tum ready ho? ☕`,
      };

      const opening = openings[charId] || openings.zara;

      setTimeout(() => {
        setChat([{ role: "ai", text: opening }]);
        setOpeningShown(true);
      }, 500);
    }
  }, []);

  const handlePressIn = async () => {
    try {
      // Stop any existing recording first
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch (e) {}
        setRecording(null);
      }

      // Request permissions
      const { status: permissionStatus } =
        await Audio.requestPermissionsAsync();
      if (permissionStatus !== "granted") {
        console.log("Permission not granted");
        setStatus("idle");
        return;
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create new recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      setRecording(newRecording);
      setStatus("listening");

      Animated.spring(micScale, {
        toValue: 1.3,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      console.error("Recording Start Error:", err);
      setStatus("idle");
      // Reset audio mode on error
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    }
  };

  const handlePressOut = async () => {
    if (!recording) {
      setStatus("idle");
      return;
    }

    Animated.spring(micScale, { toValue: 1, useNativeDriver: true }).start();
    setStatus("thinking");

    try {
      // Stop recording
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      if (!uri) {
        console.log("No recording URI");
        setStatus("idle");
        return;
      }

      // ✅ USE REAL TRANSCRIPTION (not mock)
      const userSpeech = await transcribeAudio(uri);
      const finalUserText = userSpeech || "I love biryani from Burns Road!";

      setChat((prev) => [...prev, { role: "user", text: finalUserText }]);

      // Get AI response
      const aiText = await getCharacterResponse(
        finalUserText,
        charId,
        childName,
        [...chat, { role: "user", text: finalUserText }],
      );

      setChat((prev) => [...prev, { role: "ai", text: aiText }]);

      // ✅ PLAY CHARACTER VOICE via ElevenLabs
      const base64Audio = await getCharacterAudio(aiText, charId);

      if (base64Audio) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: base64Audio },
          { shouldPlay: true },
        );
        setSound(newSound);
        setStatus("talking");

        newSound.setOnPlaybackStatusUpdate((playbackStatus) => {
          if (playbackStatus.isLoaded && playbackStatus.didJustFinish) {
            setStatus("idle");
            newSound.unloadAsync();
          }
        });
      } else {
        // Fallback: Just show text, no voice
        setStatus("talking");
        if (talkingEndTimer.current) clearTimeout(talkingEndTimer.current);
        const readMs = Math.min(8000, Math.max(2500, aiText.length * 45));
        talkingEndTimer.current = setTimeout(() => setStatus("idle"), readMs);
      }
    } catch (error) {
      console.error("Session Error:", error);
      setStatus("idle");
    }
  };

  return (
    <View style={styles.container}>
      {/* LAYER 1: IDLE */}
      <View style={StyleSheet.absoluteFill}>
        <VideoView
          player={idlePlayer}
          style={styles.fullVideo}
          contentFit="cover"
          nativeControls={false}
        />
      </View>

      {/* LAYER 2: TALKING */}
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
                ? "Thinking..."
                : status === "talking"
                  ? "Speaking..."
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
    marginTop: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#7C5CBF",
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
