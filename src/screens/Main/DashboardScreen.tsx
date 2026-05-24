// src/screens/Main/DashboardScreen.tsx
import React, { useEffect, useState } from "react"
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, Image, RefreshControl
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore"
import { auth, db } from "../../services/firebase/config"
import { getLevel } from "../../services/scoring"
import { getUserSession } from "../../services/asyncStorage"

const { width } = Dimensions.get("window")

const CHAR_IMAGES: Record<string, any> = {
  zara: require("../../../assets/characters/zara.png"),
  robo: require("../../../assets/characters/robo_bhaya.png"),
  ustad: require("../../../assets/characters/ustad_sahab.png"),
}

const CHAR_COLORS: Record<string, string> = {
  zara: "#7C5CBF",
  robo: "#2196F3",
  ustad: "#4CAF50",
}

const DAILY_PROMPTS = [
  "What's your favorite food in Karachi? 🍛",
  "Tell me about your school! 🏫",
  "Describe your best friend! 👫",
  "What made you smile today? 😊",
  "What's your favorite game? 🎮",
  "Describe your dream house! 🏠",
]

export default function DashboardScreen({ navigation }: any) {
  const [userData, setUserData] = useState<any>(null)
  const [recentSessions, setRecentSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [todayPrompt] = useState(DAILY_PROMPTS[new Date().getDay() % DAILY_PROMPTS.length])

  const loadData = async () => {
    try {
      const user = auth.currentUser
      const localSession = await getUserSession()

      if (user) {
        const userSnap = await getDoc(doc(db, "users", user.uid))
        if (userSnap.exists()) {
          setUserData(userSnap.data())
        }

        // Load recent sessions
        const sessionsQ = query(
          collection(db, "sessions"),
          where("childUid", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(3)
        )
        const sessionsSnap = await getDocs(sessionsQ)
        setRecentSessions(sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      } else if (localSession) {
        setUserData({
          nickname: localSession.nickname,
          confidenceScore: 50,
          sessionStreak: 0,
          totalSessions: 0,
          chosenCharacter: "zara",
        })
      }
    } catch (e) {
      console.log("Dashboard load error:", e)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const onRefresh = () => { setRefreshing(true); loadData() }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your journey... ✨</Text>
      </View>
    )
  }

  const nickname = userData?.nickname || "Friend"
  const score = userData?.confidenceScore ?? 50
  const streak = userData?.sessionStreak ?? 0
  const totalSessions = userData?.totalSessions ?? 0
  const charId = userData?.chosenCharacter || "zara"
  const themeColor = CHAR_COLORS[charId] || "#7C5CBF"
  const level = getLevel(score)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />}
      >
        {/* ── HEADER ── */}
        <LinearGradient
          colors={[themeColor, themeColor + "CC"]}
          style={styles.header}
        >
          <SafeAreaView>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <Text style={styles.greetingText}>{greeting} 👋</Text>
                <Text style={styles.nameText}>{nickname}!</Text>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>{level.emoji} {level.level}</Text>
                </View>
              </View>
              <Image
                source={CHAR_IMAGES[charId]}
                style={styles.headerCharImage}
                resizeMode="contain"
              />
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* ── STATS ROW ── */}
        <View style={styles.statsContainer}>
          {[
            { icon: "🎯", value: score.toString(), label: "Score", color: themeColor },
            { icon: "🔥", value: streak.toString(), label: "Day Streak", color: "#FF6B6B" },
            { icon: "🎙️", value: totalSessions.toString(), label: "Sessions", color: "#4ECDC4" },
          ].map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── PROGRESS BAR ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Confidence 📈</Text>
            <Text style={[styles.sectionBadge, { color: themeColor }]}>{score}/100</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {
              width: `${score}%`,
              backgroundColor: themeColor,
            }]}>
              <Text style={styles.progressEmoji}>{level.emoji}</Text>
            </View>
          </View>
          <View style={styles.levelLabels}>
            <Text style={styles.levelLabelText}>🌱 Shy Seedling</Text>
            <Text style={styles.levelLabelText}>👑 Voice Champion</Text>
          </View>
        </View>

        {/* ── DAILY CHALLENGE ── */}
        <LinearGradient
          colors={[themeColor, themeColor + "DD"]}
          style={styles.challengeCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.challengeLeft}>
            <View style={styles.challengeBadge}>
              <Text style={styles.challengeBadgeText}>👀 Daily Challenge</Text>
            </View>
            <Text style={styles.challengeText}>{todayPrompt}</Text>
            <TouchableOpacity
              style={styles.challengeBtn}
              onPress={() => navigation.navigate("CharacterSelect", {
                name: nickname, ageGroup: "10-14", fromOnboarding: false
              })}
            >
              <Text style={[styles.challengeBtnText, { color: themeColor }]}>Let's Go! →</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.challengeEmoji}>🎙️</Text>
        </LinearGradient>

        {/* ── RECENT SESSIONS ── */}
        {recentSessions.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Recent Sessions 📚</Text>
            {recentSessions.map((session, i) => {
              const date = session.createdAt?.toDate?.() || new Date()
              const dateStr = date.toLocaleDateString("en-PK", { month: "short", day: "numeric" })
              return (
                <View key={i} style={styles.sessionRow}>
                  <View style={[styles.sessionDot, { backgroundColor: themeColor }]} />
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionChar}>
                      {session.characterId === "zara" ? "🟣 Zara" :
                       session.characterId === "robo" ? "🔵 Robo Bhaya" : "🟢 Ustad Sahab"}
                    </Text>
                    <Text style={styles.sessionDate}>{dateStr}</Text>
                  </View>
                  <View style={[styles.sessionScoreBadge, { backgroundColor: themeColor + "15" }]}>
                    <Text style={[styles.sessionScoreText, { color: themeColor }]}>
                      {session.sessionScore ?? "✓"}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* ── CHARACTERS ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Speaking Buddies 🤝</Text>
          <View style={styles.charsRow}>
            {["zara", "robo", "ustad"].map((id) => (
              <TouchableOpacity
                key={id}
                style={[
                  styles.charChip,
                  charId === id && { borderColor: CHAR_COLORS[id], backgroundColor: CHAR_COLORS[id] + "10" }
                ]}
                onPress={() => navigation.navigate("CharacterSelect", {
                  name: nickname, ageGroup: "10-14", fromOnboarding: false
                })}
              >
                <Image source={CHAR_IMAGES[id]} style={styles.charChipImage} resizeMode="contain" />
                <Text style={[styles.charChipName, charId === id && { color: CHAR_COLORS[id] }]}>
                  {id === "zara" ? "Zara" : id === "robo" ? "Robo" : "Ustad"}
                </Text>
                {charId === id && (
                  <View style={[styles.activeRing, { borderColor: CHAR_COLORS[id] }]} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── PARENT PORTAL BUTTON ── */}
        <TouchableOpacity
          style={styles.parentBtn}
          onPress={() => navigation.navigate("ParentPortal")}
        >
          <Ionicons name="shield-checkmark-outline" size={16} color="#8A8A8A" />
          <Text style={styles.parentBtnText}>Parent Portal</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── FAB Talk Button ── */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: themeColor }]}
        onPress={() => navigation.navigate("CharacterSelect", {
          name: nickname, ageGroup: "10-14", fromOnboarding: false
        })}
      >
        <Ionicons name="mic" size={28} color="white" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F6FF" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8F6FF" },
  loadingText: { fontSize: 16, fontFamily: "Poppins-Medium", color: "#8A8A8A" },
  scroll: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerContent: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  headerLeft: { flex: 1, paddingTop: 8 },
  greetingText: { fontSize: 14, fontFamily: "Poppins-Medium", color: "rgba(255,255,255,0.8)" },
  nameText: { fontSize: 32, fontFamily: "Poppins-ExtraBold", color: "white", lineHeight: 38 },
  levelBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 99, alignSelf: "flex-start", marginTop: 6,
  },
  levelBadgeText: { fontSize: 12, fontFamily: "Poppins-Bold", color: "white" },
  headerCharImage: { width: 110, height: 130, marginBottom: -24 },
  statsContainer: {
    flexDirection: "row",
    marginHorizontal: 16, marginTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1, backgroundColor: "white",
    borderRadius: 20, padding: 14,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06, shadowRadius: 8,
  },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 20, fontFamily: "Poppins-ExtraBold" },
  statLabel: { fontSize: 10, fontFamily: "Poppins-Medium", color: "#8A8A8A" },
  sectionCard: {
    backgroundColor: "white",
    borderRadius: 20, padding: 18,
    marginHorizontal: 16, marginTop: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05, shadowRadius: 8,
  },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontFamily: "Poppins-Bold", color: "#2D2D2D" },
  sectionBadge: { fontSize: 14, fontFamily: "Poppins-ExtraBold" },
  progressTrack: {
    height: 28,
    backgroundColor: "#F0F0F0",
    borderRadius: 14,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 14,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 8,
    minWidth: 28,
  },
  progressEmoji: { fontSize: 16 },
  levelLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  levelLabelText: { fontSize: 10, fontFamily: "Poppins-Medium", color: "#AAAAAA" },
  challengeCard: {
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16, marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  challengeLeft: { flex: 1 },
  challengeBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 99, alignSelf: "flex-start", marginBottom: 8,
  },
  challengeBadgeText: { fontSize: 11, fontFamily: "Poppins-Bold", color: "white" },
  challengeText: {
    fontSize: 15, fontFamily: "Poppins-SemiBold",
    color: "white", lineHeight: 22, marginBottom: 12,
  },
  challengeBtn: {
    backgroundColor: "white",
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 99, alignSelf: "flex-start",
  },
  challengeBtnText: { fontSize: 13, fontFamily: "Poppins-Bold" },
  challengeEmoji: { fontSize: 48, marginLeft: 12 },
  sessionRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 10, borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  sessionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  sessionInfo: { flex: 1 },
  sessionChar: { fontSize: 14, fontFamily: "Poppins-SemiBold", color: "#2D2D2D" },
  sessionDate: { fontSize: 11, fontFamily: "Poppins-Medium", color: "#AAAAAA" },
  sessionScoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  sessionScoreText: { fontSize: 12, fontFamily: "Poppins-Bold" },
  charsRow: { flexDirection: "row", gap: 10, justifyContent: "space-around", marginTop: 8 },
  charChip: {
    alignItems: "center", padding: 12,
    borderRadius: 16, borderWidth: 2,
    borderColor: "#EEEEEE", flex: 1,
    position: "relative",
  },
  charChipImage: { width: 56, height: 56 },
  charChipName: { fontSize: 11, fontFamily: "Poppins-Bold", color: "#8A8A8A", marginTop: 4 },
  activeRing: {
    position: "absolute",
    top: -2, left: -2, right: -2, bottom: -2,
    borderRadius: 18, borderWidth: 2,
  },
  parentBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 14, marginTop: 16,
  },
  parentBtnText: { fontSize: 13, fontFamily: "Poppins-Medium", color: "#8A8A8A" },
  fab: {
    position: "absolute",
    bottom: 24, right: 24,
    width: 64, height: 64,
    borderRadius: 32,
    alignItems: "center", justifyContent: "center",
    elevation: 12,
    shadowColor: "#7C5CBF",
    shadowOpacity: 0.4, shadowRadius: 12,
  },
})