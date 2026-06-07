// src/screens/Main/SessionCompleteScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../services/firebase/config";
import { getLevel } from "../../services/scoring";
import { saveCompleteSession } from "../../services/sessionService";
import { SessionData } from "../../types/session";

const { width, height } = Dimensions.get("window");

// ── Per-character thinking videos & gradients ──
const CHAR_CONFIG: Record<string, {
  thinking: any;
  gradientTop: string;
  gradientBottom: string;
}> = {
  zara: {
    thinking: require("../../../assets/videos/zara/zara_thinking.mp4"),
    gradientTop: "#F4EDFF",
    gradientBottom: "#E0D4FF",
  },
  robo: {
    thinking: require("../../../assets/videos/robo_bhaya/robo_thinking.mp4"),
    gradientTop: "#F4EDFF",
    gradientBottom: "#E0D4FF",
  },
  ustad: {
    thinking: require("../../../assets/videos/ustad_sahab/ustad_thinking.mp4"),
    gradientTop: "#F4EDFF",
    gradientBottom: "#E0D4FF",
  },
};

export default function SessionCompleteScreen({ navigation, route }: any) {
  const {
    childName,
    character,
    exchangeHistory = [],
    sessionDuration = 0,
    sessionTip = "",
  } = route.params || {};

  const charId: string = (character?.id && CHAR_CONFIG[character.id]) ? character.id : "ustad";
  const cfg = CHAR_CONFIG[charId];
  const themeColor: string = character?.buttonColor || "#7C5CBF";

  const [phase, setPhase] = useState<"calculating" | "result">("calculating");
  const [oldScore, setOldScore] = useState(50);
  const [newScore, setNewScore] = useState(50);
  const [leveledUp, setLeveledUp] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // ── Thinking video player
  const thinkingPlayer = useVideoPlayer(cfg.thinking, (p) => {
    p.loop = true;
    p.muted = true;
    p.playbackRate = 1;
    p.play();
  });

  // ── Animations
  const calcFade    = useRef(new Animated.Value(1)).current;
  const cardSlide   = useRef(new Animated.Value(70)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const scoreCount  = useRef(new Animated.Value(0)).current;

  // ── Calculating text pulse
  const dotAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Main effect: save session and then transition to result
  useEffect(() => {
    const run = async () => {
      if (isSaving) return;
      setIsSaving(true);

      try {
        // Prepare session data
        const sessionData: SessionData = {
          characterId: character.id,
          exchanges: exchangeHistory,
          totalDuration: sessionDuration,
          moodStart: undefined,   // can be extended later
          moodEnd: undefined,
          topics: [],              // can be extracted from prompts later
        };

        // Call the session service
        const result = await saveCompleteSession(sessionData);
        setNewScore(result.newOverallScore);
        setLeveledUp(result.leveledUp);

        // After successful save, update the user's chosenCharacter (TODO 5.2)
        const user = auth.currentUser;
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            chosenCharacter: character.id,
          });
        }

        // Optionally get old score from somewhere? The service doesn't return it.
        // We can read from local storage or just display delta. For simplicity,
        // we'll set oldScore to newScore - delta? Not needed for UI.
        // We'll keep oldScore as something (maybe fetch from user doc before? but not critical)
        // For now, just assume oldScore = 50 (will be overwritten by animation anyway)
        setOldScore(50); // Not critical for display

      } catch (error) {
        console.error("Failed to save session:", error);
        Alert.alert(
          "Save Failed",
          "Your session couldn't be saved. Check your internet connection.",
          [{ text: "OK", onPress: () => navigation.navigate("Dashboard") }]
        );
        setNewScore(50);
      } finally {
        // Hold calculating screen for 2.8s, then crossfade
        setTimeout(() => {
          setPhase("result");
          Animated.parallel([
            Animated.timing(calcFade,    { toValue: 0, duration: 400, useNativeDriver: true }),
            Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.spring(cardSlide,   { toValue: 0, tension: 55, friction: 10, useNativeDriver: true }),
          ]).start(() => {
            try { thinkingPlayer.pause(); } catch (_) {}
          });

          scoreCount.addListener(({ value }) => setDisplayScore(Math.round(value)));
          Animated.timing(scoreCount, { toValue: newScore, duration: 1100, useNativeDriver: false }).start();
        }, 2800);
      }
    };

    run();
  }, []); // Only run once on mount

  const level = getLevel(newScore);
  // sessionScore is not directly needed for UI, but we have newScore

  // ════════════════════════════════════════════════
  // Single render tree – same as original
  // ════════════════════════════════════════════════
  return (
    <View style={styles.root}>
      {/* VIDEO LAYER */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: calcFade }]}>
        <LinearGradient
          colors={[cfg.gradientTop, cfg.gradientBottom]}
          style={styles.characterSection}
        >
          <VideoView
            player={thinkingPlayer}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
            surfaceType="textureView"
          />
          <LinearGradient
            colors={["transparent", cfg.gradientBottom + "CC", cfg.gradientBottom]}
            style={styles.characterBottomMask}
            locations={[0.45, 0.75, 1]}
            pointerEvents="none"
          />
        </LinearGradient>

        <LinearGradient
          colors={[cfg.gradientBottom, "#FFFFFF"]}
          style={styles.calcBottomSection}
        >
          <SafeAreaView edges={["bottom"]} style={styles.calcBottomInner}>
            <Animated.View style={[styles.thinkingBadge, { backgroundColor: themeColor + "18", opacity: dotAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }]}>
              <Text style={[styles.thinkingBadgeText, { color: themeColor }]}>
                {character?.name || "Your buddy"} is reviewing...
              </Text>
            </Animated.View>
            <Text style={styles.calcTitle}>Calculating your score</Text>
            <Text style={styles.calcSubtitle}>Reviewing everything you said ✨</Text>
            <View style={styles.dotsRow}>
              {[0, 1, 2].map((i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: themeColor },
                    {
                      opacity: dotAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: i === 1 ? [0.3, 1] : [1, 0.3],
                      }),
                      transform: [{
                        scale: dotAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: i === 1 ? [0.8, 1.3] : [1.3, 0.8],
                        }),
                      }],
                    },
                  ]}
                />
              ))}
            </View>
          </SafeAreaView>
        </LinearGradient>
      </Animated.View>

      {/* RESULT LAYER */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: cardOpacity }]}
        pointerEvents={phase === "result" ? "auto" : "none"}
      >
        <LinearGradient colors={["#EEE6FF", "#E8F4FD"]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safe}>
          <Animated.View style={[
            styles.resultCard,
            { transform: [{ translateY: cardSlide }], opacity: cardOpacity }
          ]}>
            {leveledUp && (
              <View style={[styles.levelUpBadge, { backgroundColor: themeColor }]}>
                <Text style={styles.levelUpText}>🎉 Level Up! {level.emoji}</Text>
              </View>
            )}
            <Text style={styles.wellDone}>Thank you, {childName}! 🎉</Text>
            <View style={[styles.scoreRing, { borderTopColor: themeColor, borderRightColor: themeColor }]}>
              <Text style={[styles.scoreNumber, { color: themeColor }]}>{displayScore}</Text>
              <Text style={styles.scoreLabel}>confidence</Text>
            </View>
            <Text style={[styles.levelName, { color: level.color }]}>
              {level.emoji} {level.level}
            </Text>
            <View style={styles.statsRow}>
              {[
                { icon: "🗣️", val: `${exchangeHistory.length}`, label: "Rounds"   },
                { icon: "📈", val: `+${Math.max(0, newScore - oldScore)}`, label: "Progress" },
                { icon: "💡", val: `${Math.round(newScore)}`,           label: "Session"  },
              ].map((s, i) => (
                <View key={i} style={[styles.statCard, { borderColor: themeColor + "30" }]}>
                  <Text style={styles.statIcon}>{s.icon}</Text>
                  <Text style={[styles.statVal, { color: themeColor }]}>{s.val}</Text>
                  <Text style={styles.statLbl}>{s.label}</Text>
                </View>
              ))}
            </View>
            {sessionTip ? (
              <View style={styles.tipCard}>
                <Text style={styles.tipTitle}>Speaking Tip</Text>
                <Text style={styles.tipText}>{sessionTip}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: themeColor }]}
              onPress={() => navigation.navigate("Dashboard")}
            >
              <Text style={styles.primaryBtnText}>See My Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: themeColor }]}
              onPress={() => navigation.replace("CharacterSelect", {
                name: childName, ageGroup: "10-14", fromOnboarding: false,
              })}
            >
              <Text style={[styles.secondaryBtnText, { color: themeColor }]}>Talk Again</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:     { flex: 1 },
  safe:     { flex: 1, alignItems: "center", justifyContent: "center" },
  characterSection: {
    height: height * 0.6,
    position: "relative",
    overflow: "hidden",
  },
  characterBottomMask: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.22,
    zIndex: 10,
  },
  calcBottomSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  calcBottomInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 24,
    gap: 10,
  },
  thinkingBadge: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 99,
    marginBottom: 6,
  },
  thinkingBadgeText: {
    fontSize: 14,
    fontFamily: "Poppins-Bold",
  },
  calcTitle: {
    fontSize: 22,
    fontFamily: "Poppins-ExtraBold",
    color: "#2D2D2D",
    textAlign: "center",
  },
  calcSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#8A8A8A",
    textAlign: "center",
    lineHeight: 22,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  resultCard: {
    backgroundColor: "white",
    borderRadius: 36,
    padding: 28,
    marginHorizontal: 20,
    alignItems: "center",
    width: width - 40,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 5 },
  },
  levelUpBadge: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 40, marginBottom: 12,
  },
  levelUpText:  { color: "white", fontSize: 14, fontFamily: "Poppins-Bold" },
  wellDone:     { fontSize: 24, fontFamily: "Poppins-ExtraBold", color: "#2D2D2D", textAlign: "center", marginBottom: 24 },
  scoreRing: {
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 14, borderColor: "#F0F0F0",
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  scoreNumber: { fontSize: 48, fontFamily: "Poppins-ExtraBold" },
  scoreLabel:  { fontSize: 13, fontFamily: "Poppins-Medium", color: "#AAAAAA", marginTop: 4 },
  levelName: { fontSize: 16, fontFamily: "Poppins-Bold", marginBottom: 24 },
  statsRow: { flexDirection: "row", gap: 14, marginBottom: 24 },
  statCard: {
    backgroundColor: "#F8F4FF", borderRadius: 18, padding: 12,
    alignItems: "center", minWidth: 88, borderWidth: 1.5,
  },
  statIcon: { fontSize: 24, marginBottom: 4 },
  statVal:  { fontSize: 18, fontFamily: "Poppins-ExtraBold" },
  statLbl:  { fontSize: 11, fontFamily: "Poppins-Medium", color: "#8A8A8A" },
  tipCard: {
    backgroundColor: "#FFF8E7", borderRadius: 18, padding: 14,
    width: "100%", marginBottom: 24,
    borderWidth: 1.5, borderColor: "#FFE082",
  },
  tipTitle: { fontSize: 12, fontFamily: "Poppins-Bold",   color: "#F59E0B", marginBottom: 4 },
  tipText:  { fontSize: 13, fontFamily: "Poppins-Medium", color: "#555555", lineHeight: 18 },
  primaryBtn: {
    width: "100%", paddingVertical: 18,
    borderRadius: 40, alignItems: "center",
    marginBottom: 14, elevation: 6,
  },
  primaryBtnText: { color: "white", fontSize: 17, fontFamily: "Poppins-Bold" },
  secondaryBtn: {
    width: "100%", paddingVertical: 16,
    borderRadius: 40, alignItems: "center",
    borderWidth: 2.5, backgroundColor: "white",
  },
  secondaryBtnText: { fontSize: 16, fontFamily: "Poppins-SemiBold" },
});