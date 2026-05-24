// src/screens/Main/SessionCompleteScreen.tsx
import React, { useEffect, useRef, useState } from "react"
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Animated, Image
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { auth, db } from "../../services/firebase/config"
import {
  calculateSessionScore, updateOverallScore, getLevel
} from "../../services/scoring"

const { width } = Dimensions.get("window")

const CHAR_IMAGES: Record<string, any> = {
  zara: require("../../../assets/characters/zara.png"),
  robo: require("../../../assets/characters/robo_bhaya.png"),
  ustad: require("../../../assets/characters/ustad_sahab.png"),
}

export default function SessionCompleteScreen({ navigation, route }: any) {
  const { childName, character, exchangeScores = [], exchangeMetrics = [], sessionTip = "" } = route.params || {}
  const charId = character?.id || "zara"

  const [phase, setPhase] = useState<"calculating" | "result">("calculating")
  const [oldScore, setOldScore] = useState(50)
  const [newScore, setNewScore] = useState(50)
  const [leveledUp, setLeveledUp] = useState(false)

  // Animations
  const charBounce = useRef(new Animated.Value(0)).current
  const charScale = useRef(new Animated.Value(0.5)).current
  const ringProgress = useRef(new Animated.Value(0)).current
  const cardSlide = useRef(new Animated.Value(60)).current
  const cardOpacity = useRef(new Animated.Value(0)).current
  const scoreCount = useRef(new Animated.Value(0)).current
  const [displayScore, setDisplayScore] = useState(0)

  useEffect(() => {
    // Bounce character in
    Animated.spring(charScale, {
      toValue: 1, tension: 50, friction: 7, useNativeDriver: true,
    }).start()

    Animated.loop(Animated.sequence([
      Animated.timing(charBounce, { toValue: -15, duration: 600, useNativeDriver: true }),
      Animated.timing(charBounce, { toValue: 0, duration: 600, useNativeDriver: true }),
    ])).start()

    // Calculate and save score
    const calculate = async () => {
      try {
        const sessionScore = calculateSessionScore(exchangeScores)
        const user = auth.currentUser
        if (user) {
          const userRef = doc(db, "users", user.uid)
          const snap = await getDoc(userRef)
          const current = snap.exists() ? (snap.data().confidenceScore ?? 50) : 50
          const updated = updateOverallScore(current, sessionScore)
          const prevLevel = getLevel(current)
          const newLevel = getLevel(updated)
          const didLevelUp = prevLevel.level !== newLevel.level && updated > current

          setOldScore(current)
          setNewScore(updated)
          setLeveledUp(didLevelUp)

          // Save to Firestore
          await updateDoc(userRef, {
            confidenceScore: updated,
            confidenceLevel: newLevel.level,
            lastSessionDate: new Date(),
            totalSessions: (snap.data()?.totalSessions ?? 0) + 1,
            sessionStreak: (snap.data()?.sessionStreak ?? 0) + 1,
          })
        }
      } catch (e) {
        console.log("Score save error:", e)
        const sessionScore = calculateSessionScore(exchangeScores)
        setNewScore(sessionScore)
      }

      // After 2.5 seconds, show results
      setTimeout(() => {
        setPhase("result")
        // Animate result card
        Animated.parallel([
          Animated.spring(cardSlide, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
          Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start()
        // Count up score
        scoreCount.addListener(({ value }) => setDisplayScore(Math.round(value)))
        Animated.timing(scoreCount, {
          toValue: newScore, duration: 1200, useNativeDriver: false,
        }).start()
        // Animate ring
        Animated.timing(ringProgress, {
          toValue: newScore / 100, duration: 1500, useNativeDriver: false,
        }).start()
      }, 2500)
    }

    calculate()
  }, [])

  const level = getLevel(newScore)
  const sessionScore = calculateSessionScore(exchangeScores)

  // Calculating phase
  if (phase === "calculating") {
    return (
      <LinearGradient colors={["#F4EDFF", "#E8F4FD"]} style={styles.root}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.calculatingContainer}>

            <Animated.View style={[styles.charContainer, {
              transform: [{ scale: charScale }, { translateY: charBounce }]
            }]}>
              <Image
                source={CHAR_IMAGES[charId]}
                style={styles.charImage}
                resizeMode="contain"
              />
              {/* Sparkles */}
              {["✨", "⭐", "🌟"].map((s, i) => (
                <Text key={i} style={[styles.sparkle, {
                  top: i * 40 - 20,
                  right: i % 2 === 0 ? -20 : undefined,
                  left: i % 2 !== 0 ? -20 : undefined,
                }]}>{s}</Text>
              ))}
            </Animated.View>

            <Text style={styles.calcTitle}>
              {character?.name} is calculating...
            </Text>
            <Text style={styles.calcSubtitle}>
              Analysing your speaking session ✨
            </Text>

            <View style={styles.dotsRow}>
              {[0, 1, 2].map(i => (
                <BounceDot key={i} delay={i * 200} color="#7C5CBF" />
              ))}
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    )
  }

  // Result phase
  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = ringProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  })

  return (
    <LinearGradient colors={["#F4EDFF", "#E8F4FD"]} style={styles.root}>
      <SafeAreaView style={styles.safe}>

        {/* Character still bouncing at top */}
        <Animated.View style={[styles.charContainerResult, {
          transform: [{ translateY: charBounce }]
        }]}>
          <Image source={CHAR_IMAGES[charId]} style={styles.charImageResult} resizeMode="contain" />
        </Animated.View>

        {/* Result Card */}
        <Animated.View style={[styles.resultCard, {
          transform: [{ translateY: cardSlide }],
          opacity: cardOpacity,
        }]}>

          {/* Level badge */}
          {leveledUp && (
            <View style={[styles.levelUpBadge, { backgroundColor: level.color }]}>
              <Text style={styles.levelUpText}>🎉 Level Up! {level.emoji}</Text>
            </View>
          )}

          <Text style={styles.wellDone}>Shukriya, {childName}!</Text>

          {/* Score Ring */}
          <View style={styles.scoreRingContainer}>
            <View style={styles.scoreRingInner}>
              <Text style={[styles.scoreNumber, { color: level.color }]}>{displayScore}</Text>
              <Text style={styles.scoreLabel}>confidence</Text>
            </View>
          </View>

          <Text style={[styles.levelName, { color: level.color }]}>
            {level.emoji} {level.level}
          </Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {[
              { icon: "🗣️", value: `${exchangeScores.length}`, label: "Exchanges" },
              { icon: "📈", value: `+${Math.max(0, newScore - oldScore)}`, label: "Progress" },
              { icon: "💡", value: `${Math.round(sessionScore)}`, label: "Session" },
            ].map((stat, i) => (
              <View key={i} style={styles.statCard}>
                <Text style={styles.statIcon}>{stat.icon}</Text>
                <Text style={[styles.statValue, { color: "#7C5CBF" }]}>{stat.value}</Text>
                <Text style={styles.statLabel2}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Tip */}
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>💬 Speaking Tip</Text>
            <Text style={styles.tipText}>{sessionTip}</Text>
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: "#7C5CBF" }]}
            onPress={() => navigation.navigate("Dashboard")}
          >
            <Text style={styles.primaryBtnText}>See My Dashboard →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate("CharacterSelect", {
              name: childName, ageGroup: "10-14", fromOnboarding: false
            })}
          >
            <Text style={[styles.secondaryBtnText, { color: "#7C5CBF" }]}>
              Talk Again 🎙️
            </Text>
          </TouchableOpacity>

        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  )
}

function BounceDot({ delay, color }: { delay: number; color: string }) {
  const bounce = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(bounce, { toValue: -10, duration: 400, useNativeDriver: true }),
      Animated.timing(bounce, { toValue: 0, duration: 400, useNativeDriver: true }),
    ])).start()
  }, [])
  return (
    <Animated.View style={{
      width: 12, height: 12, borderRadius: 6,
      backgroundColor: color,
      transform: [{ translateY: bounce }],
      marginHorizontal: 4,
    }} />
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, alignItems: "center" },
  calculatingContainer: {
    flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24,
  },
  charContainer: {
    width: 180, height: 220, alignItems: "center", justifyContent: "center",
    position: "relative",
  },
  charImage: { width: 180, height: 220 },
  sparkle: { position: "absolute", fontSize: 24 },
  calcTitle: {
    fontSize: 24, fontFamily: "Poppins-ExtraBold",
    color: "#2D2D2D", textAlign: "center", marginTop: 20,
  },
  calcSubtitle: {
    fontSize: 15, fontFamily: "Poppins-Medium",
    color: "#8A8A8A", textAlign: "center", marginTop: 8,
  },
  dotsRow: { flexDirection: "row", marginTop: 24, alignItems: "center" },
  charContainerResult: {
    width: 140, height: 160, marginTop: 20,
  },
  charImageResult: { width: 140, height: 160 },
  resultCard: {
    backgroundColor: "white",
    borderRadius: 28,
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 20,
    alignItems: "center",
    elevation: 12,
    shadowColor: "#7C5CBF",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    width: "92%",
  },
  levelUpBadge: {
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 99, marginBottom: 12,
  },
  levelUpText: {
    color: "white", fontSize: 13,
    fontFamily: "Poppins-Bold",
  },
  wellDone: {
    fontSize: 22, fontFamily: "Poppins-ExtraBold",
    color: "#2D2D2D", textAlign: "center",
  },
  scoreRingContainer: {
    width: 130, height: 130,
    borderRadius: 65,
    borderWidth: 12,
    borderColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
    borderTopColor: "#7C5CBF",
    borderRightColor: "#7C5CBF",
  },
  scoreRingInner: { alignItems: "center" },
  scoreNumber: { fontSize: 36, fontFamily: "Poppins-ExtraBold" },
  scoreLabel: { fontSize: 11, fontFamily: "Poppins-Medium", color: "#AAAAAA" },
  levelName: {
    fontSize: 16, fontFamily: "Poppins-Bold", marginBottom: 16,
  },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    backgroundColor: "#F8F4FF",
    borderRadius: 16, padding: 12,
    alignItems: "center", minWidth: 80,
    borderWidth: 1.5, borderColor: "#E8DEFF",
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 18, fontFamily: "Poppins-ExtraBold" },
  statLabel2: { fontSize: 10, fontFamily: "Poppins-Medium", color: "#8A8A8A" },
  tipCard: {
    backgroundColor: "#FFF8E7",
    borderRadius: 16, padding: 14,
    width: "100%", marginBottom: 16,
    borderWidth: 1.5, borderColor: "#FFE082",
  },
  tipTitle: { fontSize: 12, fontFamily: "Poppins-Bold", color: "#F59E0B", marginBottom: 4 },
  tipText: { fontSize: 13, fontFamily: "Poppins-Medium", color: "#555", lineHeight: 18 },
  primaryBtn: {
    width: "100%", paddingVertical: 16,
    borderRadius: 20, alignItems: "center",
    elevation: 4, marginBottom: 8,
  },
  primaryBtnText: { color: "white", fontSize: 16, fontFamily: "Poppins-Bold" },
  secondaryBtn: { paddingVertical: 10 },
  secondaryBtnText: { fontSize: 14, fontFamily: "Poppins-SemiBold" },
})