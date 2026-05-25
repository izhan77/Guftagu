// src/screens/Main/SessionScreen.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { getCharacterResponse } from "../../services/openai";
import { getCharacterAudio } from "../../services/elevenlabs";
import { transcribeAudio } from "../../services/whisper";

const { height } = Dimensions.get("window");

const CHAR_CONFIG: Record<
  string,
  {
    idle: any;
    talking: any;
    gradientTop: string;
    gradientBottom: string;
    buttonColor: string;
  }
> = {
  zara: {
    idle: require("../../../assets/videos/zara/zara_idle.mov"),
    talking: require("../../../assets/videos/zara/zara_talking.mov"),
    gradientTop: "#F4EDFF",
    gradientBottom: "#E0D4FF",
    buttonColor: "#7C5CBF",
  },
  robo: {
    idle: require("../../../assets/videos/robo_bhaya/robo_idle.mov"),
    talking: require("../../../assets/videos/robo_bhaya/robo_talking.mov"),
    gradientTop: "#E8F4FD",
    gradientBottom: "#BBDEFB",
    buttonColor: "#2196F3",
  },
  ustad: {
    idle: require("../../../assets/videos/ustad_sahab/ustad_idle.mov"),
    talking: require("../../../assets/videos/ustad_sahab/ustad_talking.mov"),
    gradientTop: "#EAF7EE",
    gradientBottom: "#C8E6C9",
    buttonColor: "#4CAF50",
  },
};

const MAX_EXCHANGES = 3;

export default function SessionScreen({ navigation, route }: any) {
  const { character, childName } = route.params || {};
  const charId =
    character?.id && CHAR_CONFIG[character.id] ? character.id : "zara";
  const cfg = CHAR_CONFIG[charId];
  const themeColor = cfg.buttonColor;

  const [appStatus, setAppStatus] = useState<
    "idle" | "listening" | "thinking" | "talking"
  >("idle");
  const [chat, setChat] = useState<{ role: string; text: string }[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [openingShown, setOpeningShown] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showTalkVideo, setShowTalkVideo] = useState(false);

  const micScale = useRef(new Animated.Value(1)).current;
  const micGlowAnim = useRef(new Animated.Value(0)).current;
  const pulseRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const scrollRef = useRef<ScrollView>(null);

  const idlePlayer = useVideoPlayer(cfg.idle, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const talkPlayer = useVideoPlayer(cfg.talking, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    if (appStatus === "talking") {
      idlePlayer.pause();
      talkPlayer.currentTime = 0;
      talkPlayer.play();
      setShowTalkVideo(true);
    } else {
      setShowTalkVideo(false);
      talkPlayer.pause();
      try {
        idlePlayer.play();
      } catch (_) {}
    }
  }, [appStatus]);

  useEffect(() => {
    return () => {
      if (sound) {
        try {
          sound.unloadAsync();
        } catch (_) {}
      }
      if (recording) {
        try {
          recording.stopAndUnloadAsync();
        } catch (_) {}
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      try {
        idlePlayer.pause();
      } catch (_) {}
      try {
        talkPlayer.pause();
      } catch (_) {}
    };
  }, [sound, recording]);

  useEffect(() => {
    if (!openingShown) {
      const openings: Record<string, string> = {
        zara: `Yaar ${childName}! Finally you're here! Bolo kya chal raha hai?`,
        robo: `BEEP BOOP! Hello ${childName}! Ready for an EPIC conversation?`,
        ustad: `Aaao beta, baithao. ${childName} — bahut pyaara naam hai.`,
      };
      setTimeout(() => {
        setChat([{ role: "assistant", text: openings[charId] || openings.zara }]);
        setOpeningShown(true);
      }, 800);
    }
  }, []);

  const startMicPulse = () => {
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(micScale, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(micGlowAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(micScale, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(micGlowAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ])
    );
    pulseRef.current.start();
  };

  const stopMicPulse = () => {
    pulseRef.current?.stop();
    Animated.parallel([
      Animated.timing(micScale, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(micGlowAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const handlePressIn = async () => {
    try {
      if (recording) {
        try { await recording.stopAndUnloadAsync(); } catch (_) {}
        setRecording(null);
      }
      const { status: perm } = await Audio.requestPermissionsAsync();
      if (perm !== "granted") return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(newRec);
      setAppStatus("listening");
      startMicPulse();
    } catch {
      setAppStatus("idle");
    }
  };

  const handlePressOut = async () => {
    if (!recording) {
      setAppStatus("idle");
      return;
    }
    stopMicPulse();
    setAppStatus("thinking");
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      if (!uri) {
        setAppStatus("idle");
        return;
      }

      const userSpeech = await transcribeAudio(uri);
      const finalText = userSpeech || "I want to talk";

      setChat((prev) => [...prev, { role: "user", text: finalText }]);

      const aiText = await getCharacterResponse(finalText, charId, childName, chat);
      setChat((prev) => [...prev, { role: "assistant", text: aiText }]);

      const newCount = exchangeCount + 1;
      setExchangeCount(newCount);

      const base64Audio = await getCharacterAudio(aiText, charId);
      if (base64Audio) {
        const { sound: newSound } = await Audio.Sound.createAsync({ uri: base64Audio }, { shouldPlay: true });
        setSound(newSound);
        setAppStatus("talking");
        newSound.setOnPlaybackStatusUpdate((ps) => {
          if (ps.isLoaded && ps.didJustFinish) {
            newSound.unloadAsync();
            if (newCount >= MAX_EXCHANGES) {
              navigation.navigate("SessionComplete", { childName, character });
            } else {
              setAppStatus("idle");
            }
          }
        });
      } else {
        setAppStatus("talking");
        const readMs = Math.min(8000, Math.max(2500, aiText.length * 45));
        timerRef.current = setTimeout(() => {
          if (newCount >= MAX_EXCHANGES) {
            navigation.navigate("SessionComplete", { childName, character });
          } else {
            setAppStatus("idle");
          }
        }, readMs);
      }

      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error("Session error:", error);
      setAppStatus("idle");
    }
  };

  const glowOpacity = micGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] });

  const getStatusLabel = () => {
    switch (appStatus) {
      case "listening":
        return "👂 Listening... Release when done";
      case "thinking":
        return `🤔 ${character?.name} is thinking... Please wait!`;
      case "talking":
        return `💬 ${character?.name} is speaking...`;
      default:
        return "🎙️ Press and hold mic to speak!";
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[cfg.gradientTop, cfg.gradientBottom]} style={styles.characterSection}>
        <VideoView player={idlePlayer} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} surfaceType="textureView" />
        {showTalkVideo && (
          <View style={StyleSheet.absoluteFill}>
            <VideoView player={talkPlayer} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} surfaceType="textureView" />
          </View>
        )}
        <LinearGradient colors={["transparent", cfg.gradientBottom + "CC", cfg.gradientBottom]} style={styles.characterBottomMask} locations={[0.45, 0.75, 1]} pointerEvents="none" />
        <SafeAreaView style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={themeColor} />
          </TouchableOpacity>
          <View style={styles.starsRow}>
            {Array.from({ length: MAX_EXCHANGES }).map((_, i) => (
              <Text key={i} style={[styles.star, i < exchangeCount && styles.starFilled]}>
                {i < exchangeCount ? "⭐" : "☆"}
              </Text>
            ))}
          </View>
          <View style={[styles.statusPill, { backgroundColor: themeColor + "22" }]}>
            <Text style={[styles.statusPillText, { color: themeColor }]}>
              {appStatus === "idle" ? "Ready" : appStatus === "listening" ? "👂" : appStatus === "thinking" ? "🤔" : "💬"}
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <LinearGradient colors={[cfg.gradientBottom, "#FFFFFF"]} style={styles.bottomSection}>
        <TouchableOpacity style={styles.seeChatsBtn} onPress={() => setShowChatModal(true)} activeOpacity={0.7}>
          <Ionicons name="chatbubbles-outline" size={22} color={themeColor} />
          <Text style={[styles.seeChatsBtnText, { color: themeColor }]}>See all chats ({chat.length})</Text>
          <Ionicons name="chevron-up" size={18} color={themeColor} />
        </TouchableOpacity>
        
        <Text style={styles.statusLabel}>{getStatusLabel()}</Text>
        
        <View style={styles.micArea}>
          <Animated.View style={[styles.micGlowRing, { borderColor: appStatus === "listening" ? "#FF3B30" : themeColor, opacity: glowOpacity, transform: [{ scale: micScale }] }]} />
          <Animated.View style={[styles.micGlowRingInner, { borderColor: appStatus === "listening" ? "#FF3B30" : themeColor, opacity: Animated.multiply(glowOpacity, new Animated.Value(0.5)), transform: [{ scale: micScale }] }]} />
          <Animated.View style={{ transform: [{ scale: micScale }], marginTop: 20 }}>
            <TouchableOpacity
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={appStatus === "thinking" || appStatus === "talking"}
              activeOpacity={0.85}
              style={[styles.micBtn, { backgroundColor: appStatus === "listening" ? "#FF3B30" : themeColor, opacity: appStatus === "thinking" || appStatus === "talking" ? 0.45 : 1 }]}
            >
              <Ionicons name={appStatus === "listening" ? "stop" : "mic"} size={44} color="white" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </LinearGradient>

      {/* SIMPLE WORKING MODAL */}
      <Modal visible={showChatModal} animationType="slide" transparent onRequestClose={() => setShowChatModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'white', marginTop: 50 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', fontFamily: 'Poppins-Bold' }}>Chat with {character?.name}</Text>
            <TouchableOpacity onPress={() => setShowChatModal(false)} style={{ padding: 8 }}>
              <Ionicons name="close" size={28} color="#555" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={{ flex: 1, padding: 20 }} showsVerticalScrollIndicator={true}>
            {chat.map((msg, index) => (
              <View key={index} style={{ 
                marginBottom: 16, 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: msg.role === 'user' ? themeColor : '#F0F0F0',
                padding: 14,
                borderRadius: 20,
                maxWidth: '85%',
                borderTopRightRadius: msg.role === 'user' ? 6 : 20,
                borderTopLeftRadius: msg.role === 'ai' ? 6 : 20,
              }}>
                <Text style={{ 
                  color: msg.role === 'user' ? 'white' : '#333', 
                  fontSize: 16, 
                  fontFamily: 'Poppins-Medium',
                  lineHeight: 24,
                }}>
                  {msg.text}
                </Text>
              </View>
            ))}
            {chat.length === 0 && (
              <View style={{ alignItems: 'center', marginTop: 50 }}>
                <Text style={{ fontSize: 56, marginBottom: 10 }}>💬</Text>
                <Text style={{ color: '#AAA', fontSize: 16, fontFamily: 'Poppins-Medium' }}>No messages yet. Start talking!</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  characterSection: { height: height * 0.6, position: "relative", overflow: "hidden" },
  characterBottomMask: { position: "absolute", bottom: 0, left: 0, right: 0, height: height * 0.22, zIndex: 10 },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: Platform.OS === "android" ? 36 : 0, zIndex: 20 },
  backBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.85)", alignItems: "center", justifyContent: "center", elevation: 3, shadowOpacity: 0.1, shadowRadius: 6 },
  starsRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  star: { fontSize: 26, color: "#CCCCCC" },
  starFilled: { color: "#FFD700" },
  statusPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  statusPillText: { fontSize: 13, fontFamily: "Poppins-Bold", letterSpacing: 0.5 },
  bottomSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 24,
  },
  seeChatsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.9)",
    elevation: 2,
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  seeChatsBtnText: { fontSize: 13, fontFamily: "Poppins-SemiBold" },
  statusLabel: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#555555",
    textAlign: "center",
  },
  micArea: {
    alignItems: "center",
    justifyContent: "center",
    width: 88,
    height: 88,
  },
  micGlowRing: {
    position: "absolute",
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
  },
  micGlowRingInner: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
  },
  micBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: height * 0.78,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    overflow: "hidden",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DDDDDD",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  modalCharDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCharDotText: {
    color: "white",
    fontSize: 16,
    fontFamily: "Poppins-Bold",
  },
  modalTitle: { fontSize: 16, fontFamily: "Poppins-Bold", color: "#1A1A1A" },
  modalSubtitle: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "#AAAAAA",
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: { flex: 1, paddingHorizontal: 16 },
  modalScrollContent: { paddingVertical: 16, gap: 10 },
  emptyChat: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyChatEmoji: { fontSize: 48 },
  emptyChatText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#AAAAAA",
  },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  aiRow: { alignSelf: "flex-start", maxWidth: "88%" },
  userRow: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
    maxWidth: "78%",
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  msgAvatarText: { color: "white", fontSize: 12, fontFamily: "Poppins-Bold" },
  msgBubble: { borderRadius: 18, padding: 12, flexShrink: 1 },
  aiBubble: {
    backgroundColor: "#F5F5F5",
    borderTopLeftRadius: 4,
    borderLeftWidth: 3,
  },
  userBubble: { borderTopRightRadius: 4 },
  msgText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#2D2D2D",
    lineHeight: 20,
  },
  modalFooter: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    alignItems: "center",
  },
  modalFooterText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#AAAAAA",
  },
});