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
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../services/firebase/config";
import { calculateSessionScore, updateOverallScore, getLevel } from "../../services/scoring";

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
    exchangeScores = [],
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

  // ── Thinking video player: starts immediately on mount so it's buffered ──
  // by the time the screen appears, avoiding any first-frame black flash.
  const thinkingPlayer = useVideoPlayer(cfg.thinking, (p) => {
    p.loop            = true;
    p.muted           = true;
    p.playbackRate    = 1;
    p.play(); // start buffering + playing immediately
  });

  // ── Animations ──
  const calcFade    = useRef(new Animated.Value(1)).current;
  const cardSlide   = useRef(new Animated.Value(70)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const scoreCount  = useRef(new Animated.Value(0)).current;

  // ── Calculating text pulse ──
  const dotAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const sessionScore = calculateSessionScore(exchangeScores);
        const user = auth.currentUser;
        let updated = sessionScore;
        let current = 50;

        if (user) {
          const ref = doc(db, "users", user.uid);
          const snap = await getDoc(ref);
          current = snap.exists() ? snap.data().confidenceScore ?? 50 : 50;
          updated = updateOverallScore(current, sessionScore);
          const prevLevel = getLevel(current);
          const newLevel  = getLevel(updated);
          setLeveledUp(prevLevel.level !== newLevel.level && updated > current);
          await updateDoc(ref, {
            confidenceScore: updated,
            confidenceLevel: newLevel.level,
            lastSessionDate: new Date(),
            totalSessions:   (snap.data()?.totalSessions  ?? 0) + 1,
            sessionStreak:   (snap.data()?.sessionStreak  ?? 0) + 1,
          });
        }
        setOldScore(current);
        setNewScore(updated);
      } catch (e) {
        console.log("Score error:", e);
        setNewScore(calculateSessionScore(exchangeScores));
      }

      // Hold the calculating screen for 2.8s, then crossfade to result.
      // Video stays mounted & playing through the crossfade — no black frame ever.
      setTimeout(() => {
        setPhase("result"); // flip phase immediately so result layer becomes interactive

        // Fade video layer OUT and result layer IN simultaneously — perfect crossfade
        Animated.parallel([
          Animated.timing(calcFade,    { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(cardSlide,   { toValue: 0, tension: 55, friction: 10, useNativeDriver: true }),
        ]).start(() => {
          // Only pause video AFTER it's fully hidden — never mid-frame
          try { thinkingPlayer.pause(); } catch (_) {}
        });

        scoreCount.addListener(({ value }) => setDisplayScore(Math.round(value)));
        Animated.timing(scoreCount, { toValue: newScore, duration: 1100, useNativeDriver: false }).start();
      }, 2800);
    };
    run();
  }, []);

  const level        = getLevel(newScore);
  const sessionScore = calculateSessionScore(exchangeScores);

  // ════════════════════════════════════════════════
  // CALCULATING PHASE — mirrors SessionScreen layout
  // ════════════════════════════════════════════════
  // ════════════════════════════════════════════════
  // SINGLE RENDER TREE — no unmount = no black flash
  // Video layer always stays mounted; result card
  // fades in ON TOP without ever removing the video.
  // ════════════════════════════════════════════════
  return (
    <View style={styles.root}>

      {/* ── VIDEO LAYER: always mounted, fades out when result appears ── */}
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

      {/* ── RESULT LAYER: fades in on top, result bg covers video smoothly ── */}
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
                { icon: "🗣️", val: `${exchangeScores.length}`, label: "Rounds"   },
                { icon: "📈", val: `+${Math.max(0, newScore - oldScore)}`, label: "Progress" },
                { icon: "💡", val: `${Math.round(sessionScore)}`,           label: "Session"  },
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

  // ── Calculating phase root ──
  calcRoot: { flex: 1, backgroundColor: "#FFFFFF" },

  // ── Character video section — identical proportions to SessionScreen ──
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

  // ── Bottom panel ──
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

  // Bouncing dots
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

  // ── Result card ──
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