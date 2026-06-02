import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  RefreshControl,
  Animated,
  Modal,
  FlatList,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../../services/firebase/config";
import { getLevel } from "../../services/scoring";
import { getUserSession } from "../../services/asyncStorage";

const { width, height } = Dimensions.get("window");

const CHAR_IMAGES: Record<string, any> = {
  zara: require("../../../assets/characters/zara.png"),
  robo: require("../../../assets/characters/robo_bhaya.png"),
  ustad: require("../../../assets/characters/ustad_sahab.png"),
};

const CHAR_COLORS: Record<string, [string, string]> = {
  zara: ["#7C5CBF", "#7C5CBF"],
  robo: ["#2980B9", "#1A5276"],
  ustad: ["#27AE60", "#1E8449"],
};

const CHAR_BG_COLORS: Record<string, string> = {
  zara: "#F3E8FF",
  robo: "#E8F4FF",
  ustad: "#E8FFF3",
};

const CHAR_LABELS: Record<string, string> = {
  zara: "Zara",
  robo: "Robo Bhaya",
  ustad: "Ustad Sahab",
};

const DAILY_PROMPTS = [
  "What's your favorite food in Karachi?",
  "Tell me about your school!",
  "Describe your best friend!",
  "What made you smile today?",
  "What's your favorite game?",
  "Describe your dream house!",
];

// Helper component
function ConfidencePill({ value, color }: { value: number; color: string }) {
  const getLabel = (v: number) =>
    v >= 85 ? "Superstar! ⭐" : v >= 70 ? "Great Job! 🎉" : "Keep Going! 💪";
  const getBg = (v: number) =>
    v >= 85 ? "#FFF3CD" : v >= 70 ? "#D4EDDA" : "#FFE0E0";
  const getTxt = (v: number) =>
    v >= 85 ? "#856404" : v >= 70 ? "#155724" : "#721C24";
  return (
    <View style={[pillStyles.pill, { backgroundColor: getBg(value) }]}>
      <Text style={[pillStyles.text, { color: getTxt(value) }]}>
        {getLabel(value)}
      </Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
    alignSelf: "flex-start",
  },
  text: { fontSize: 12, fontFamily: "Poppins-Bold" },
});

// ── Shimmer skeleton (unchanged) ──
function useShimmer() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return anim;
}

function Bone({ w, h, radius = 10, style }: { w: number | string; h: number; radius?: number; style?: any }) {
  const anim = useShimmer();
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-60, 60] });
  return (
    <View style={[{ width: w as any, height: h, borderRadius: radius, overflow: "hidden", backgroundColor: "#E8E3F5" }, style]}>
      <Animated.View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, opacity, transform: [{ translateX }], backgroundColor: "rgba(255,255,255,0.6)", borderRadius: radius }} />
    </View>
  );
}

function DashboardSkeleton() {
  const shimmer = useShimmer();
  const headerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  return (
    <View style={{ flex: 1, backgroundColor: "#F3E8FF" }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: headerOpacity }}>
          <LinearGradient colors={["#C4B0E8", "#D4C4F0"]} style={skeletonStyles.heroSkel}>
            <SafeAreaView>
              <View style={skeletonStyles.heroRow}>
                <View style={{ flex: 1, gap: 8 }}>
                  <Bone w={100} h={14} radius={7} />
                  <Bone w={160} h={32} radius={10} style={{ marginTop: 4 }} />
                  <Bone w={110} h={26} radius={13} style={{ marginTop: 6 }} />
                </View>
                <View style={skeletonStyles.avatarSkel} />
              </View>
              <View style={skeletonStyles.streakSkel}>
                <Bone w={24} h={24} radius={12} />
                <Bone w="60%" h={14} radius={7} />
                <View style={{ flexDirection: "row", gap: 4 }}>
                  {[1, 2, 3].map((i) => (
                    <Bone key={i} w={18} h={18} radius={9} />
                  ))}
                </View>
              </View>
            </SafeAreaView>
          </LinearGradient>
        </Animated.View>
        <View style={skeletonStyles.statsRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={skeletonStyles.statCardSkel}>
              <Bone w={32} h={32} radius={16} />
              <Bone w={40} h={22} radius={8} style={{ marginTop: 8 }} />
              <Bone w={55} h={12} radius={6} style={{ marginTop: 6 }} />
            </View>
          ))}
        </View>
        <View style={skeletonStyles.card}>
          <View style={skeletonStyles.cardHeader}>
            <Bone w={170} h={18} radius={9} />
            <Bone w={60} h={28} radius={14} />
          </View>
          <Bone w="100%" h={32} radius={16} style={{ marginBottom: 10 }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
            <Bone w={110} h={12} radius={6} />
            <Bone w={110} h={12} radius={6} />
          </View>
          <View style={skeletonStyles.milestonesRow}>
            {[0, 1, 2, 3].map((i) => (
              <Bone key={i} w={42} h={42} radius={21} />
            ))}
          </View>
        </View>
        <View style={skeletonStyles.challengeSkel}>
          <View style={{ flex: 1, gap: 10 }}>
            <Bone w={120} h={26} radius={13} />
            <Bone w="90%" h={16} radius={8} />
            <Bone w="75%" h={16} radius={8} />
            <Bone w={130} h={40} radius={20} style={{ marginTop: 4 }} />
          </View>
          <Bone w={56} h={56} radius={28} style={{ marginLeft: 12 }} />
        </View>
        <View style={skeletonStyles.card}>
          <View style={skeletonStyles.cardHeader}>
            <Bone w={190} h={18} radius={9} />
          </View>
          {[0, 1, 2].map((i) => (
            <View key={i} style={skeletonStyles.topicRowSkel}>
              <Bone w={52} h={52} radius={26} />
              <View style={{ flex: 1, gap: 8 }}>
                <Bone w="75%" h={14} radius={7} />
                <Bone w="100%" h={10} radius={5} />
                <Bone w={70} h={11} radius={6} />
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Bone w={42} h={22} radius={8} />
                <Bone w={80} h={22} radius={11} />
              </View>
            </View>
          ))}
          <Bone w="100%" h={44} radius={14} style={{ marginTop: 8 }} />
        </View>
        <View style={skeletonStyles.card}>
          <Bone w={210} h={18} radius={9} style={{ marginBottom: 16 }} />
          <View style={skeletonStyles.buddiesRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={skeletonStyles.buddyCardSkel}>
                <Bone w={64} h={64} radius={32} />
                <Bone w={55} h={13} radius={6} style={{ marginTop: 8 }} />
                <Bone w={40} h={11} radius={5} style={{ marginTop: 4 }} />
              </View>
            ))}
          </View>
        </View>
        <View style={skeletonStyles.parentRow}>
          <Bone w={18} h={18} radius={9} />
          <Bone w={100} h={14} radius={7} />
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  heroSkel: { paddingHorizontal: 22, paddingBottom: 28, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  heroRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10 },
  avatarSkel: { width: 96, height: 96, borderRadius: 48, backgroundColor: "rgba(255,255,255,0.3)" },
  streakSkel: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginTop: 14 },
  statsRow: { flexDirection: "row", marginHorizontal: 16, marginTop: 16, gap: 10 },
  statCardSkel: { flex: 1, borderRadius: 22, paddingVertical: 16, alignItems: "center", backgroundColor: "#D8CDEE", elevation: 4, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8 },
  card: { backgroundColor: "white", borderRadius: 26, padding: 20, marginHorizontal: 16, marginTop: 14, elevation: 4, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  milestonesRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  challengeSkel: { backgroundColor: "#E0D0F5", borderRadius: 26, padding: 22, flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 14, elevation: 4, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10 },
  topicRowSkel: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  buddiesRow: { flexDirection: "row", gap: 10 },
  buddyCardSkel: { flex: 1, alignItems: "center", borderRadius: 22, padding: 14, borderWidth: 2, borderColor: "#EEEEEE", backgroundColor: "#FAFAFA" },
  parentRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, marginTop: 6 },
});

// ─── Main Dashboard Component ───
export default function DashboardScreen({ navigation }: any) {
  const [userData, setUserData] = useState<any>(null);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]); // for modal
  const [weeklyScores, setWeeklyScores] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showChatsModal, setShowChatsModal] = useState(false);
  const [todayPrompt] = useState(DAILY_PROMPTS[new Date().getDay() % DAILY_PROMPTS.length]);

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const fabPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(headerAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.spring(statsAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(fabPulse, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(fabPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

// ... (all imports and code above unchanged until loadData) ...

const loadData = async () => {
  try {
    const user = auth.currentUser;
    const localSession = await getUserSession();
    if (user) {
      // Fetch user document
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserData(data);
      } else if (localSession) {
        setUserData({
          nickname: localSession.nickname,
          confidenceScore: 50,
          sessionStreak: 0,
          totalSessions: 0,
          chosenCharacter: "zara",
        });
      }

      // Fetch recent sessions (last 5)
      const sessionsQuery = query(
        collection(db, "sessions"),
        where("childUid", "==", user.uid),
        orderBy("sessionDate", "desc"),
        limit(5)
      );
      const sessionsSnap = await getDocs(sessionsQuery);
      const recent = sessionsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRecentSessions(recent);

      // Fetch all sessions for modal (limit to 20 for performance)
      const allSessionsQuery = query(
        collection(db, "sessions"),
        where("childUid", "==", user.uid),
        orderBy("sessionDate", "desc"),
        limit(20)
      );
      const allSnap = await getDocs(allSessionsQuery);
      const all = allSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setAllSessions(all);

      // ✅ CORRECTED BLOCK – Fetch weekly sessions for chart
      const weeklyQuery = query(
        collection(db, "sessions"),
        where("childUid", "==", user.uid),
        orderBy("sessionDate", "desc"),
        limit(20)
      );
      const weeklySnap = await getDocs(weeklyQuery);

      const now = new Date();
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      const recentFilteredSessions = weeklySnap.docs
        .map(doc => doc.data())
        .filter(s => s.sessionDate.toDate() >= weekAgo)
        .sort((a, b) => a.sessionDate.toDate() - b.sessionDate.toDate());

      const weeklyScores = recentFilteredSessions.map(s => s.sessionScore);
      setWeeklyScores(weeklyScores);
    } else if (localSession) {
      // Fallback to local only if no user (should not happen normally)
      setUserData({
        nickname: localSession.nickname,
        confidenceScore: 50,
        sessionStreak: 0,
        totalSessions: 0,
        chosenCharacter: "zara",
      });
    }
  } catch (e) {
    console.log("Dashboard load error:", e);
  } finally {
    setIsLoading(false);
    setRefreshing(false);
  }
};

// ... rest of the file unchanged ...
  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const nickname = userData?.nickname || "Friend";
  const score = userData?.confidenceScore ?? 50;
  const streak = userData?.sessionStreak ?? 0;
  const totalSessions = userData?.totalSessions ?? 0;
  const charId = userData?.chosenCharacter || "zara";
  const [colorA, colorB] = CHAR_COLORS[charId] || CHAR_COLORS.zara;
  const bgColor = CHAR_BG_COLORS[charId] || "#F3E8FF";
  const level = getLevel(score);
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Good Morning ☀️"
      : hour < 17
      ? "Good Afternoon 🌤️"
      : "Good Evening 🌙";

  // Build topics from recent sessions (real data)
  const topics = recentSessions.map((s, i) => ({
    id: s.id,
    topic: s.topics?.[0] || DAILY_PROMPTS[i % DAILY_PROMPTS.length],
    confidence: s.sessionScore ?? Math.floor(Math.random() * 30 + 65),
    date: s.sessionDate?.toDate?.()?.toLocaleDateString("en-PK", { month: "short", day: "numeric" }) || "Recent",
    charId: s.characterId || charId,
  }));

  return (
    <View style={[styles.root, { backgroundColor: bgColor }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colorA} />}
      >
        {/* Hero Header (unchanged) */}
        <Animated.View style={{ opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }] }}>
          <LinearGradient colors={[colorA, colorB]} style={styles.hero} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}>
            <View style={styles.blobTR} /><View style={styles.blobBL} />
            <SafeAreaView>
              <View style={styles.heroContent}>
                <View style={styles.heroLeft}>
                  <Text style={styles.greetingSmall}>{greeting}</Text>
                  <Text style={styles.heroName}>{nickname}!</Text>
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelBadgeEmoji}>{level.emoji}</Text>
                    <Text style={styles.levelBadgeText}>{level.level}</Text>
                  </View>
                </View>
                <View style={styles.avatarWrap}>
                  <LinearGradient colors={["rgba(255,255,255,0.45)", "rgba(255,255,255,0.15)"]} style={styles.avatarGlowRing}>
                    <Image source={require("../../../assets/avatar.png")} style={styles.avatarImg} resizeMode="cover" />
                  </LinearGradient>
                </View>
              </View>
            </SafeAreaView>
          </LinearGradient>
        </Animated.View>

        {/* Stats Cards */}
        <Animated.View style={[styles.statsRow, { opacity: statsAnim, transform: [{ scale: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
          {[
            { emoji: "🎯", value: score, label: "My Score", grad: [colorA, colorB] as [string, string] },
            { emoji: "🔥", value: streak, label: "Day Streak", grad: ["#FF6B6B", "#EE4444"] as [string, string] },
            { emoji: "🎙️", value: totalSessions, label: "Sessions", grad: ["#00C9B8", "#00A3A3"] as [string, string] },
          ].map((s, i) => (
            <LinearGradient key={i} colors={s.grad} style={styles.statCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.statEmoji}>{s.emoji}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </LinearGradient>
          ))}
        </Animated.View>

        {/* Confidence Meter */}
        <Animated.View style={[styles.card, { opacity: cardAnim }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>My Confidence 📈</Text>
            <View style={[styles.scorePill, { backgroundColor: colorA }]}>
              <Text style={styles.scorePillText}>{score} / 100</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient colors={[colorA, colorB]} style={[styles.progressFill, { width: `${score}%` }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.progressEmoji}>{level.emoji}</Text>
            </LinearGradient>
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabelText}>Shy Seedling</Text>
            <Text style={styles.progressLabelText}>Voice Champion</Text>
          </View>
          <View style={styles.milestones}>
            {[25, 50, 75, 100].map((m) => (
              <View key={m} style={[styles.milestone, score >= m && { backgroundColor: colorA }]}>
                <Text style={[styles.milestoneText, score >= m && { color: "white" }]}>{m}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Daily Challenge */}
        <Animated.View style={{ opacity: cardAnim, marginHorizontal: 16, marginTop: 14 }}>
          <LinearGradient colors={["#FF9500", "#FF6B00"]} style={styles.challengeCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.challengeLeft}>
              <View style={styles.challengeBadgePill}>
                <Text style={styles.challengeBadgeLabel}>Today's Challenge</Text>
              </View>
              <Text style={styles.challengeQuestion}>{todayPrompt}</Text>
              <TouchableOpacity style={styles.challengeBtn} onPress={() => navigation.navigate("CharacterSelect", { name: nickname, ageGroup: "10-14", fromOnboarding: false })} activeOpacity={0.85}>
                <Text style={styles.challengeBtnText}>Start Talking!</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.challengeBigEmoji}>🎯</Text>
          </LinearGradient>
        </Animated.View>

        {/* Learning Progress (Recent Topics) */}
        <Animated.View style={[styles.card, { opacity: cardAnim }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Learning Progress 🚀</Text>
          </View>
          {topics.length === 0 ? (
            <Text style={{ textAlign: "center", marginVertical: 20, color: "#AAA" }}>No sessions yet. Start talking!</Text>
          ) : (
            topics.map((t, i) => {
              const [tc1, tc2] = CHAR_COLORS[t.charId] || CHAR_COLORS.zara;
              return (
                <View key={t.id} style={styles.topicRow}>
                  <LinearGradient colors={[tc1, tc2]} style={styles.topicCharDot}>
                    <Image source={CHAR_IMAGES[t.charId]} style={styles.topicCharImg} resizeMode="contain" />
                  </LinearGradient>
                  <View style={styles.topicInfo}>
                    <Text style={styles.topicName}>{t.topic}</Text>
                    <View style={styles.topicBarTrack}>
                      <LinearGradient colors={[tc1, tc2]} style={[styles.topicBarFill, { width: `${t.confidence}%` }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                    </View>
                    <Text style={styles.topicDate}>{t.date}</Text>
                  </View>
                  <View style={styles.topicRight}>
                    <Text style={[styles.topicScore, { color: tc1 }]}>{t.confidence}%</Text>
                    <ConfidencePill value={t.confidence} color={tc1} />
                  </View>
                </View>
              );
            })
          )}
          <TouchableOpacity style={[styles.showMoreBtn, { borderColor: colorA }]} onPress={() => setShowChatsModal(true)} activeOpacity={0.8}>
            <Text style={[styles.showMoreText, { color: colorA }]}>+ Show More Chats</Text>
            <Ionicons name="chevron-down" size={16} color={colorA} />
          </TouchableOpacity>
        </Animated.View>

        {/* Speaking Buddies (unchanged) */}
        <Animated.View style={[styles.card, { opacity: cardAnim }]}>
          <Text style={styles.cardTitle}>My Speaking Buddies</Text>
          <View style={styles.buddiesRow}>
            {(["zara", "robo", "ustad"] as const).map((id) => {
              const [bc1, bc2] = CHAR_COLORS[id];
              const isActive = charId === id;
              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.buddyCard, isActive && { borderColor: bc1, borderWidth: 3 }]}
                  onPress={() => navigation.navigate("CharacterSelect", { name: nickname, ageGroup: "10-14", fromOnboarding: false, preselectedCharacterId: id })}
                  activeOpacity={0.85}
                >
                  {isActive && <LinearGradient colors={[bc1 + "22", bc2 + "22"]} style={StyleSheet.absoluteFill} />}
                  <View style={styles.buddyImgWrap}>
                    <Image source={CHAR_IMAGES[id]} style={styles.buddyImg} resizeMode="contain" />
                    {isActive && <View style={[styles.buddyActiveBadge, { backgroundColor: bc1 }]}><Text style={{ fontSize: 8 }}>✓</Text></View>}
                  </View>
                  <Text style={[styles.buddyName, isActive && { color: bc1 }]}>{CHAR_LABELS[id]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Parent Portal (unchanged) */}
        <TouchableOpacity style={styles.parentPortalCard} onPress={() => navigation.navigate("ParentPortal")} activeOpacity={0.88}>
          <LinearGradient colors={["#F8F5FF", "#EDE8FF"]} style={styles.parentPortalInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.parentPortalIconWrap}><Ionicons name="shield-checkmark" size={28} color="#7C5CBF" /></View>
            <View style={styles.parentPortalText}>
              <Text style={styles.parentPortalTitle}>Parent Portal</Text>
              <Text style={styles.parentPortalSub}>View your child's full progress & reports</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#7C5CBF" />
          </LinearGradient>
        </TouchableOpacity>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB (unchanged) */}
      <Animated.View style={[styles.fabWrap, { transform: [{ scale: fabPulse }] }]}>
        <TouchableOpacity onPress={() => navigation.navigate("CharacterSelect", { name: nickname, ageGroup: "10-14", fromOnboarding: false })} activeOpacity={0.9}>
          <LinearGradient colors={[colorA, colorB]} style={styles.fab}>
            <Ionicons name="mic" size={30} color="white" />
            <Text style={styles.fabLabel}>Talk!</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* All Chats Modal (using real allSessions) */}
      <Modal visible={showChatsModal} animationType="slide" transparent onRequestClose={() => setShowChatsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>All My Chats</Text>
              <TouchableOpacity onPress={() => setShowChatsModal(false)} style={styles.modalClose}><Ionicons name="close-circle" size={28} color="#CCCCCC" /></TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Every time you practiced speaking with Guftagu!</Text>
            <FlatList
              data={allSessions}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={<Text style={{ textAlign: "center", marginTop: 40, color: "#AAA" }}>No sessions yet. Start talking!</Text>}
              renderItem={({ item }) => {
                const [mc1, mc2] = CHAR_COLORS[item.characterId] || CHAR_COLORS.zara;
                const sessionDate = item.sessionDate?.toDate?.() || new Date();
                const formattedDate = sessionDate.toLocaleDateString("en-PK", { month: "short", day: "numeric" });
                const duration = item.sessionDuration ? `${Math.floor(item.sessionDuration / 60)} min` : "? min";
                return (
                  <View style={styles.modalChatRow}>
                    <LinearGradient colors={[mc1, mc2]} style={styles.modalChatIcon}>
                      <Image source={CHAR_IMAGES[item.characterId]} style={{ width: 32, height: 32 }} resizeMode="contain" />
                    </LinearGradient>
                    <View style={styles.modalChatInfo}>
                      <Text style={styles.modalChatTopic}>{item.topics?.[0] || "General Conversation"}</Text>
                      <Text style={styles.modalChatMeta}>with {CHAR_LABELS[item.characterId]} · {formattedDate} · {duration}</Text>
                      <View style={styles.modalMiniBar}>
                        <LinearGradient colors={[mc1, mc2]} style={[styles.modalMiniBarFill, { width: `${item.sessionScore}%` }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                      </View>
                    </View>
                    <Text style={[styles.modalChatScore, { color: mc1 }]}>{item.sessionScore}%</Text>
                  </View>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  root: { flex: 1 },

  // Loading (skeleton replaces this — kept for safety)
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Hero Header
  hero: {
    paddingHorizontal: 22,
    paddingBottom: 28,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: "hidden",
  },
  blobTR: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  blobBL: {
    position: "absolute",
    bottom: -20,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
  },
  heroLeft: { flex: 1 },
  greetingSmall: {
    fontSize: 15,
    fontFamily: "Poppins-Medium",
    color: "rgba(255,255,255,0.85)",
  },
  heroName: {
    fontSize: 36,
    fontFamily: "Poppins-ExtraBold",
    color: "white",
    lineHeight: 42,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  levelBadgeEmoji: { fontSize: 16 },
  levelBadgeText: { fontSize: 14, fontFamily: "Poppins-Bold", color: "white" },

  // Avatar
  avatarWrap: { position: "relative", marginLeft: 12 },
  avatarGlowRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.8)",
  },
  onlineDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#2ECC71",
    borderWidth: 3,
    borderColor: "white",
  },

  // Streak banner
  streakBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 14,
  },
  streakFire: { fontSize: 22 },
  streakText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: "white",
  },
  streakStars: { flexDirection: "row", gap: 2 },

  // Stats
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 22,
    paddingVertical: 16,
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  statEmoji: { fontSize: 26, marginBottom: 4 },
  statValue: { fontSize: 26, fontFamily: "Poppins-ExtraBold", color: "white" },
  statLabel: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },

  // Generic card
  card: {
    backgroundColor: "white",
    borderRadius: 26,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 14,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "Poppins-ExtraBold",
    color: "#1A1A2E",
  },

  // Confidence
  scorePill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 99 },
  scorePillText: { fontSize: 14, fontFamily: "Poppins-Bold", color: "white" },
  progressTrack: {
    height: 32,
    backgroundColor: "#F0EFF7",
    borderRadius: 16,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 16,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 10,
    minWidth: 32,
  },
  progressEmoji: { fontSize: 18 },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  progressLabelText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#AAAAAA",
  },
  milestones: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  milestone: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F0EFF7",
    alignItems: "center",
    justifyContent: "center",
  },
  milestoneText: { fontSize: 13, fontFamily: "Poppins-Bold", color: "#BBBBBB" },

  // Challenge
  challengeCard: {
    borderRadius: 26,
    padding: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 6,
    shadowColor: "#FF9500",
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  challengeLeft: { flex: 1 },
  challengeBadgePill: {
    backgroundColor: "rgba(255,255,255,0.28)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  challengeBadgeLabel: {
    fontSize: 13,
    fontFamily: "Poppins-Bold",
    color: "white",
  },
  challengeQuestion: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "white",
    lineHeight: 24,
    marginBottom: 14,
  },
  challengeBtn: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 99,
    alignSelf: "flex-start",
  },
  challengeBtnText: {
    fontSize: 14,
    fontFamily: "Poppins-ExtraBold",
    color: "#FF6B00",
  },
  challengeBigEmoji: { fontSize: 56, marginLeft: 10 },

  // Topics
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  topicCharDot: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  topicCharImg: { width: 44, height: 44 },
  topicInfo: { flex: 1 },
  topicName: {
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: "#1A1A2E",
    marginBottom: 5,
  },
  topicBarTrack: {
    height: 10,
    backgroundColor: "#F0EFF7",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 4,
  },
  topicBarFill: { height: "100%", borderRadius: 5 },
  topicDate: { fontSize: 11, fontFamily: "Poppins-Medium", color: "#BBBBBB" },
  topicRight: { alignItems: "flex-end", gap: 4 },
  topicScore: { fontSize: 18, fontFamily: "Poppins-ExtraBold" },

  showMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    marginTop: 4,
  },
  showMoreText: { fontSize: 14, fontFamily: "Poppins-Bold" },

  // Buddies
  buddiesRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  buddyCard: {
    flex: 1,
    alignItems: "center",
    borderRadius: 22,
    padding: 14,
    borderWidth: 2,
    borderColor: "#EEEEEE",
    backgroundColor: "#FAFAFA",
    overflow: "hidden",
  },
  buddyImgWrap: { position: "relative" },
  buddyImg: { width: 64, height: 64 },
  buddyActiveBadge: {
    position: "absolute",
    top: -2,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  buddyName: {
    fontSize: 13,
    fontFamily: "Poppins-Bold",
    color: "#8A8A8A",
    marginTop: 6,
    textAlign: "center",
  },

  // Parent portal card
  parentPortalCard: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 22,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#7C5CBF",
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  parentPortalInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1.5,
    borderColor: "#DDD6FF",
    borderRadius: 22,
  },
  parentPortalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EDE8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  parentPortalText: { flex: 1 },
  parentPortalTitle: {
    fontSize: 17,
    fontFamily: "Poppins-ExtraBold",
    color: "#1A1A2E",
  },
  parentPortalSub: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#9A8AB0",
    marginTop: 2,
  },

  // FAB
  fabWrap: {
    position: "absolute",
    bottom: 28,
    right: 24,
    elevation: 16,
    shadowColor: "#7C5CBF",
    shadowOpacity: 0.45,
    shadowRadius: 16,
  },
  fab: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
  },
  fabLabel: {
    fontSize: 11,
    fontFamily: "Poppins-Bold",
    color: "white",
    marginTop: -2,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    padding: 22,
    maxHeight: height * 0.78,
  },
  modalHandle: {
    width: 44,
    height: 5,
    backgroundColor: "#DDDDDD",
    borderRadius: 99,
    alignSelf: "center",
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: "Poppins-ExtraBold",
    color: "#1A1A2E",
  },
  modalClose: { padding: 4 },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#AAAAAA",
    marginBottom: 18,
  },
  modalChatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  modalChatIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  modalChatInfo: { flex: 1 },
  modalChatTopic: {
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: "#1A1A2E",
    marginBottom: 3,
  },
  modalChatMeta: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "#BBBBBB",
    marginBottom: 6,
  },
  modalMiniBar: {
    height: 7,
    backgroundColor: "#F0EFF7",
    borderRadius: 4,
    overflow: "hidden",
  },
  modalMiniBarFill: { height: "100%", borderRadius: 4 },
  modalChatScore: { fontSize: 18, fontFamily: "Poppins-ExtraBold" },
});
