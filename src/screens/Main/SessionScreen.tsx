import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  SafeAreaView,
  Platform,
  ScrollView,
  ViewStyle,
  TextStyle,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { getCharacterResponse } from "../../services/gemini" // ← ADD THIS

const { width, height } = Dimensions.get("window");

// --- 1. ASSET CONFIG ---
interface CharacterVideos {
  idle: any;
  talking: any;
}

const CHAR_ASSETS: Record<string, CharacterVideos> = {
  zara: {
    idle: require("../../../assets/videos/zara/zara_idle.mp4"),
    talking: require("../../../assets/videos/zara/zara_talking.mp4"),
  },
  robo: {
    idle: require("../../../assets/videos/robo_bhaya/robo_idle.mp4"),
    talking: require("../../../assets/videos/robo_bhaya/robo_talking.mp4"),
  }
};

export default function SessionScreen({ navigation, route }: any) {
  const { character, childName } = route.params || {};
  const charId = (character?.id && character.id in CHAR_ASSETS) ? character.id : "zara";
  const themeColor = character?.buttonColor || "#FF9500";
  const activeAssets = CHAR_ASSETS[charId];

  const [status, setStatus] = useState<"idle" | "listening" | "thinking" | "talking">("idle"); // ← ADDED "thinking"
  const [chat, setChat] = useState<{ role: string; text: string }[]>([]);
  const [userInput, setUserInput] = useState<string>(""); // ← ADDED to store user's speech
  
  const talkOpacity = useRef(new Animated.Value(0)).current;
  const micScale = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView>(null);

  const idlePlayer = useVideoPlayer(activeAssets.idle, (p) => {
    p.loop = true;
    p.muted = true; 
    p.play();
  });

  const talkPlayer = useVideoPlayer(activeAssets.talking, (p) => {
    p.loop = false;
    p.muted = true; // ← MUTED — voice comes from TTS later
  });

  useEffect(() => {
    const manageTransition = async () => {
      if (status === "talking") {
        await talkPlayer.replaceAsync(activeAssets.talking);
        talkPlayer.currentTime = 0; 
        talkPlayer.play();
        Animated.timing(talkOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      } else {
        Animated.timing(talkOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
          talkPlayer.pause();
        });
      }
    };
    manageTransition();
  }, [status, activeAssets.talking]);

  useEffect(() => {
    const sub = talkPlayer.addListener('playToEnd', () => {
      setStatus("idle");
    });
    return () => sub.remove();
  }, [talkPlayer]);

  // --- HANDLERS WITH GEMINI ---
  const handlePressIn = () => {
    setStatus("listening");
    Animated.spring(micScale, { toValue: 1.3, useNativeDriver: true }).start();
  };

  const handlePressOut = async () => {
    Animated.spring(micScale, { toValue: 1, useNativeDriver: true }).start();
    
    // TODO: Replace with actual voice recording
    const mockUserText = "I love biryani from Burns Road!";
    setUserInput(mockUserText);
    
    // Add user message to chat
    setChat(prev => [...prev, { role: "user", text: mockUserText }]);
    
    // Start thinking
    setStatus("thinking");
    
    // Get Gemini response
    const aiResponse = await getCharacterResponse(mockUserText, charId, childName);
    console.log("🔵 Gemini response:", aiResponse);
    
    // Add AI response to chat
    setChat(prev => [...prev, { role: "ai", text: aiResponse }]);
    
    // Start talking animation
    setStatus("talking");
    
    // TODO: Add Text-to-Speech here
  };

  return (
    <View style={styles.container}>
      {/* LAYER 1: IDLE BACKGROUND */}
      <View style={StyleSheet.absoluteFill}>
        <VideoView 
          player={idlePlayer} 
          style={styles.fullVideo} 
          contentFit="cover" 
          nativeControls={false} 
        />
      </View>

      {/* LAYER 2: TALKING OVERLAY */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: talkOpacity }]}>
        <VideoView 
          player={talkPlayer} 
          style={styles.fullVideo} 
          contentFit="cover" 
          nativeControls={false} 
        />
      </Animated.View>

      <LinearGradient 
        colors={["rgba(0,0,0,0.3)", "transparent", "rgba(0,0,0,0.8)"]} 
        style={StyleSheet.absoluteFill} 
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{character?.name || "Zara"}</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView 
          ref={scrollRef}
          style={styles.chatArea}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {chat.map((msg, i) => (
            <View key={i} style={msg.role === "ai" ? styles.aiMsg : styles.userMsg}>
              <BlurView intensity={30} tint="dark" style={styles.bubble}>
                <Text style={styles.msgText}>{msg.text}</Text>
              </BlurView>
            </View>
          ))}
          
          {/* Thinking indicator */}
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
              style={[styles.micBtn, { backgroundColor: status === "listening" ? "#FF3B30" : themeColor }]}
            >
              <Ionicons name={status === "listening" ? "mic-outline" : "mic"} size={40} color="white" />
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.statusLabel}>
            {status === "listening" ? "I am listening..." : 
             status === "thinking" ? "Zara is thinking..." : 
             status === "talking" ? "Zara is speaking..." : "Hold to Talk"}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" } as ViewStyle,
  fullVideo: { width: width, height: height } as ViewStyle,
  safeArea: { flex: 1, zIndex: 10 } as ViewStyle,
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: '900' } as TextStyle,
  chatArea: { flex: 1, paddingHorizontal: 20 },
  aiMsg: { alignSelf: 'flex-start', marginVertical: 8, maxWidth: '80%' },
  userMsg: { alignSelf: 'flex-end', marginVertical: 8, maxWidth: '80%' },
  bubble: { padding: 15, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  msgText: { color: 'white', fontSize: 18, fontWeight: '600' } as TextStyle,
  footer: { paddingBottom: 50, alignItems: 'center' },
  micBtn: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', elevation: 15 },
  statusLabel: { color: 'white', marginTop: 15, fontSize: 13, fontWeight: '800', opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 },
});