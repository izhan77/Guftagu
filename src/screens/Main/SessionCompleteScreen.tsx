// src/screens/Main/SessionCompleteScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import LottieView from "lottie-react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../services/firebase/config";
import { calculateSessionScore, updateOverallScore, getLevel } from "../../services/scoring";

const { width, height } = Dimensions.get("window");

function BounceDot({ delay, color }: { delay: number; color: string }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(y, { toValue: -8, duration: 380, useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 380, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: color,
        marginHorizontal: 4,
        transform: [{ translateY: y }],
      }}
    />
  );
}

export default function SessionCompleteScreen({ navigation, route }: any) {
  const {
    childName,
    character,
    exchangeScores = [],
    exchangeMetrics = [],
    sessionTip = "",
  } = route.params || {};

  const charId = character?.id || "zara";
  const themeColor = character?.buttonColor || "#7C5CBF";

  const [phase, setPhase] = useState<"calculating" | "result">("calculating");
  const [oldScore, setOldScore] = useState(50);
  const [newScore, setNewScore] = useState(50);
  const [leveledUp, setLeveledUp] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);

  const cardSlide = useRef(new Animated.Value(70)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const scoreCount = useRef(new Animated.Value(0)).current;
  const calcFade = useRef(new Animated.Value(1)).current;
  const lottieRef = useRef<LottieView>(null);

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
          const newLevel = getLevel(updated);
          setLeveledUp(prevLevel.level !== newLevel.level && updated > current);
          await updateDoc(ref, {
            confidenceScore: updated,
            confidenceLevel: newLevel.level,
            lastSessionDate: new Date(),
            totalSessions: (snap.data()?.totalSessions ?? 0) + 1,
            sessionStreak: (snap.data()?.sessionStreak ?? 0) + 1,
          });
        }
        setOldScore(current);
        setNewScore(updated);
      } catch (e) {
        console.log("Score error:", e);
        setNewScore(calculateSessionScore(exchangeScores));
      }

      setTimeout(() => {
        Animated.timing(calcFade, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => {
          setPhase("result");
          Animated.parallel([
            Animated.spring(cardSlide, { toValue: 0, tension: 55, friction: 10, useNativeDriver: true }),
            Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          ]).start();
          scoreCount.addListener(({ value }) => setDisplayScore(Math.round(value)));
          Animated.timing(scoreCount, { toValue: newScore, duration: 1100, useNativeDriver: false }).start();
        });
      }, 2800);
    };
    run();
  }, []);

  const level = getLevel(newScore);
  const sessionScore = calculateSessionScore(exchangeScores);

  // Calculating phase
  if (phase === "calculating") {
    return (
      <LinearGradient colors={["#EEE6FF", "#E8F4FD"]} style={styles.root}>
        <SafeAreaView style={styles.safeCenter}>
          <Animated.View style={[styles.calcContainer, { opacity: calcFade }]}>
            <LottieView ref={lottieRef} source={require("../../../assets/loading.json")} style={styles.lottieLarge} autoPlay loop />
            <Text style={styles.calcTitle}>Calculating your score...</Text>
            <Text style={styles.calcSubtitle}>Zara is reviewing your speaking ✨</Text>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Result phase
  return (
    <LinearGradient colors={["#EEE6FF", "#E8F4FD"]} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.resultCard, { transform: [{ translateY: cardSlide }], opacity: cardOpacity }]}>
          {/* Logo */}
          <Image source={require("../../../assets/logo.png")} style={styles.logo} resizeMode="contain" />

          {leveledUp && (
            <View style={[styles.levelUpBadge, { backgroundColor: themeColor }]}>
              <Text style={styles.levelUpText}>🎉 Level Up! {level.emoji}</Text>
            </View>
          )}

          <Text style={styles.wellDone}>Shukriya, {childName}! 🎉</Text>

          <View style={[styles.scoreRing, { borderTopColor: themeColor, borderRightColor: themeColor }]}>
            <Text style={[styles.scoreNumber, { color: themeColor }]}>{displayScore}</Text>
            <Text style={styles.scoreLabel}>confidence</Text>
          </View>

          <Text style={[styles.levelName, { color: level.color }]}>{level.emoji} {level.level}</Text>

          <View style={styles.statsRow}>
            {[
              { icon: "🗣️", val: `${exchangeScores.length}`, label: "Rounds" },
              { icon: "📈", val: `+${Math.max(0, newScore - oldScore)}`, label: "Progress" },
              { icon: "💡", val: `${Math.round(sessionScore)}`, label: "Session" },
            ].map((s, i) => (
              <View key={i} style={[styles.statCard, { borderColor: themeColor + "30" }]}>
                <Text style={styles.statIcon}>{s.icon}</Text>
                <Text style={[styles.statVal, { color: themeColor }]}>{s.val}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {sessionTip ? (
            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>💬 Speaking Tip</Text>
              <Text style={styles.tipText}>{sessionTip}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: themeColor }]} onPress={() => navigation.navigate("Dashboard")}>
            <Text style={styles.primaryBtnText}>See My Dashboard →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.replace("CharacterSelect", {
            name: childName, ageGroup: "10-14", fromOnboarding: false,
          })}>
            <Text style={[styles.secondaryBtnText, { color: themeColor }]}>Talk Again 🎙️</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, alignItems: "center", justifyContent: "center" },
  safeCenter: { flex: 1, alignItems: "center", justifyContent: "center" },

  calcContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  lottieLarge: { width: 180, height: 180, marginBottom: 20 },
  calcTitle: { fontSize: 24, fontFamily: "Poppins-ExtraBold", color: "#2D2D2D", textAlign: "center", marginTop: 20 },
  calcSubtitle: { fontSize: 16, fontFamily: "Poppins-Medium", color: "#8A8A8A", textAlign: "center", marginTop: 8, lineHeight: 24 },

  resultCard: {
    backgroundColor: "white",
    borderRadius: 32,
    padding: 24,
    marginHorizontal: 20,
    alignItems: "center",
    width: width - 40,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 5 },
  },
  logo: { width: 100, height: 35, marginBottom: 15 },
  levelUpBadge: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 40, marginBottom: 12 },
  levelUpText: { color: "white", fontSize: 14, fontFamily: "Poppins-Bold" },
  wellDone: { fontSize: 24, fontFamily: "Poppins-ExtraBold", color: "#2D2D2D", textAlign: "center", marginBottom: 20 },
  scoreRing: { width: 130, height: 130, borderRadius: 65, borderWidth: 12, borderColor: "#F0F0F0", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  scoreNumber: { fontSize: 40, fontFamily: "Poppins-ExtraBold" },
  scoreLabel: { fontSize: 12, fontFamily: "Poppins-Medium", color: "#AAAAAA" },
  levelName: { fontSize: 16, fontFamily: "Poppins-Bold", marginBottom: 20 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  statCard: { backgroundColor: "#F8F4FF", borderRadius: 16, padding: 12, alignItems: "center", minWidth: 85, borderWidth: 1.5 },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statVal: { fontSize: 18, fontFamily: "Poppins-ExtraBold" },
  statLabel: { fontSize: 11, fontFamily: "Poppins-Medium", color: "#8A8A8A" },
  tipCard: { backgroundColor: "#FFF8E7", borderRadius: 16, padding: 14, width: "100%", marginBottom: 20, borderWidth: 1.5, borderColor: "#FFE082" },
  tipTitle: { fontSize: 12, fontFamily: "Poppins-Bold", color: "#F59E0B", marginBottom: 4 },
  tipText: { fontSize: 13, fontFamily: "Poppins-Medium", color: "#555555", lineHeight: 18 },
  primaryBtn: { width: "100%", paddingVertical: 16, borderRadius: 30, alignItems: "center", marginBottom: 12, elevation: 4 },
  primaryBtnText: { color: "white", fontSize: 16, fontFamily: "Poppins-Bold" },
  secondaryBtn: { paddingVertical: 10 },
  secondaryBtnText: { fontSize: 14, fontFamily: "Poppins-SemiBold" },
});