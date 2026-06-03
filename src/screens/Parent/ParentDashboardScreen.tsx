// src/screens/Parent/ParentDashboardScreen.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Modal,
  Alert,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../../services/firebase/config";

const { width, height } = Dimensions.get("window");

interface FirestoreSession {
  id: string;
  sessionDate?: { toDate: () => Date };
  topics?: string[];
  sessionScore?: number;
  characterId?: string;
  sessionDuration?: number;
  childUid?: string;
}

// ─── Constants
const CHAR_COLORS: Record<string, string> = {
  zara: "#7C5CBF",
  robo: "#2196F3",
  ustad: "#4CAF50",
};
const CHAR_GRADIENT: Record<string, [string, string]> = {
  zara: ["#7C5CBF", "#5A3D9A"],
  robo: ["#2196F3", "#1565C0"],
  ustad: ["#4CAF50", "#2E7D32"],
};
const CHAR_EMOJI: Record<string, string> = {
  zara: "🧕",
  robo: "🤖",
  ustad: "👴",
};
const CHAR_LABELS: Record<string, string> = {
  zara: "Zara",
  robo: "Robo Bhaya",
  ustad: "Ustad Sahab",
};
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getScoreColor = (s: number) =>
  s >= 80 ? "#7C5CBF" : s >= 60 ? "#2196F3" : s >= 40 ? "#FF9500" : "#FF3B30";
const getScoreLabel = (s: number) =>
  s >= 80 ? "Champion 👑" : s >= 60 ? "Confident 🌟" : s >= 40 ? "Growing 🌱" : "Starting 🐣";

// ─── Helper: Calculate weekly scores from sessions
const calculateWeeklyScores = (sessions: FirestoreSession[]): number[] => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const scoresByDay: Record<string, number[]> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayKey = d.toDateString();
    scoresByDay[dayKey] = [];
  }
  sessions.forEach((s) => {
    if (!s.sessionDate) return;
    const date = s.sessionDate.toDate();
    const dayKey = date.toDateString();
    if (scoresByDay[dayKey]) scoresByDay[dayKey].push(s.sessionScore || 50);
  });
  const weeklyAverages = Object.values(scoresByDay).map((scores) =>
    scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  );
  return weeklyAverages;
};

// ─── Shimmer Skeleton
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

function Bone({ w, h, radius = 10, style }: any) {
  const anim = useShimmer();
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });
  const tx = anim.interpolate({ inputRange: [0, 1], outputRange: [-60, 60] });
  return (
    <View style={[{ width: w, height: h, borderRadius: radius, overflow: "hidden", backgroundColor: "#E8E3F5" }, style]}>
      <Animated.View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, opacity, transform: [{ translateX: tx }], backgroundColor: "rgba(255,255,255,0.6)", borderRadius: radius }} />
    </View>
  );
}

function ParentDashboardSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: "#F3E8FF", justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#7C5CBF" />
    </View>
  );
}

// ─── Mini Line Chart
function MiniLineChart({ scores, color }: { scores: number[]; color: string }) {
  const CHART_W = width - 72;
  const CHART_H = 100;
  const PAD = 8;
  if (scores.length === 0 || scores.every(s => s === 0)) {
    return (
      <View style={{ height: CHART_H + 28, marginTop: 10, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#AAA", fontSize: 12 }}>No data yet</Text>
      </View>
    );
  }
  const pts = scores.map((s, i) => ({
    x: PAD + (i / (scores.length - 1)) * (CHART_W - PAD * 2),
    y: CHART_H - PAD - (s / 100) * (CHART_H - PAD * 2),
    s,
  }));
  return (
    <View style={{ height: CHART_H + 28, marginTop: 10 }}>
      {[25, 50, 75].map(v => {
        const y = CHART_H - PAD - (v / 100) * (CHART_H - PAD * 2);
        return (
          <View key={v} style={{ position: "absolute", top: y, left: 0, right: 0, height: 1, backgroundColor: "rgba(0,0,0,0.05)" }}>
            <Text style={{ position: "absolute", right: 0, top: -8, fontSize: 9, color: "#BBBBBB", fontFamily: "Poppins-Medium" }}>{v}</Text>
          </View>
        );
      })}
      {pts.slice(0, -1).map((p, i) => {
        const next = pts[i + 1];
        const dx = next.x - p.x, dy = next.y - p.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View key={i} style={{ position: "absolute", left: p.x, top: p.y, width: len, height: 3, borderRadius: 2, backgroundColor: color, transform: [{ rotate: `${angle}deg` }], transformOrigin: "left center" }} />
        );
      })}
      {pts.map((p, i) => (
        <View key={i}>
          <View style={{ position: "absolute", left: p.x - 9, top: p.y - 9, width: 18, height: 18, borderRadius: 9, backgroundColor: color + "30" }} />
          <View style={{ position: "absolute", left: p.x - 5, top: p.y - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: color, borderWidth: 2, borderColor: "white" }} />
          {i === pts.length - 1 && (
            <View style={{ position: "absolute", left: p.x - 16, top: p.y - 24, backgroundColor: color, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
              <Text style={{ fontSize: 10, color: "white", fontFamily: "Poppins-Bold" }}>{p.s}</Text>
            </View>
          )}
          <Text style={{ position: "absolute", left: p.x - 14, top: CHART_H + 6, width: 28, fontSize: 9, color: "#AAAAAA", fontFamily: "Poppins-Medium", textAlign: "center" }}>{DAY_LABELS[i]}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Confirm Modal
function ConfirmModal({ visible, title, message, onConfirm, onCancel }: any) {
  const scale = useRef(new Animated.Value(0.88)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, tension: 65, friction: 10, useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.88);
      op.setValue(0);
    }
  }, [visible]);
  if (!visible) return null;
  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onCancel}>
      <Animated.View style={[styles.modalOverlay, { opacity: op }]}>
        <Animated.View style={[styles.modalSheet, { transform: [{ scale }] }]}>
          <LinearGradient colors={["#FF3B30", "#FF6B6B"]} style={styles.modalIconCircle}>
            <Ionicons name="warning" size={28} color="white" />
          </LinearGradient>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>
          <View style={styles.modalBtnRow}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm}>
              <LinearGradient colors={["#FF3B30", "#FF6B6B"]} style={styles.modalConfirmBtn}>
                <Text style={styles.modalConfirmText}>Delete</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Empty Children State Component
function EmptyChildrenState({ onAddChild }: { onAddChild: () => void }) {
  return (
    <View style={emptyStyles.container}>
      <View style={emptyStyles.iconCircle}>
        <Ionicons name="people-outline" size={64} color="#7C5CBF" />
      </View>
      <Text style={emptyStyles.title}>No active children</Text>
      <Text style={emptyStyles.message}>
        You haven't added any children to your Guftagu journey yet.
      </Text>
      <Text style={emptyStyles.hint}>
        Set up a child profile to track their speaking progress and watch them grow! 🌱
      </Text>
      <TouchableOpacity style={emptyStyles.addButton} onPress={onAddChild} activeOpacity={0.85}>
        <LinearGradient colors={["#7C5CBF", "#5A3D9A"]} style={emptyStyles.addButtonGradient}>
          <Ionicons name="add" size={24} color="white" />
          <Text style={emptyStyles.addButtonText}>Add New Child</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
    minHeight: height * 0.6,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EDE8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-ExtraBold',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  hint: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#AAA',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  addButton: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#7C5CBF',
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 30,
  },
  addButtonText: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: 'white',
  },
});

// ─── Child Detail Modal
function ChildDetailModal({ child, visible, onClose, onDelete }: any) {
  const slideY = useRef(new Animated.Value(height)).current;
  const bgOp = useRef(new Animated.Value(0)).current;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, tension: 52, friction: 11, useNativeDriver: true }),
        Animated.timing(bgOp, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: height, duration: 260, useNativeDriver: true }),
        Animated.timing(bgOp, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!child) return null;
  const color = CHAR_COLORS[child.chosenCharacter] || "#7C5CBF";
  const gradient = CHAR_GRADIENT[child.chosenCharacter] || ["#7C5CBF", "#5A3D9A"];

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    await onDelete();
    setIsDeleting(false);
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <Animated.View style={[styles.detailBgDim, { opacity: bgOp }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>
      <Animated.View style={[styles.detailSheet, { transform: [{ translateY: slideY }] }]}>
        <View style={styles.detailHandle} />
        <LinearGradient colors={gradient} style={styles.detailHero}>
          <View style={styles.detailHeroRow}>
            <View style={[styles.detailAvatar, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Text style={{ fontSize: 32 }}>{CHAR_EMOJI[child.chosenCharacter]}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.detailHeroName}>{child.nickname}</Text>
              <Text style={styles.detailHeroMeta}>Age {child.age} · {CHAR_LABELS[child.chosenCharacter]}</Text>
              <View style={styles.detailLevelBadge}>
                <Text style={styles.detailLevelBadgeText}>{getScoreLabel(child.confidenceScore)}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.detailCloseBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color="white" />
            </TouchableOpacity>
          </View>
          <View style={styles.detailStatsRow}>
            {[
              { emoji: "🎯", val: child.confidenceScore, label: "Score" },
              { emoji: "🔥", val: child.sessionStreak, label: "Streak" },
              { emoji: "🎙️", val: child.totalSessions, label: "Sessions" },
            ].map((s, i) => (
              <View key={i} style={styles.detailStatItem}>
                <Text style={styles.detailStatEmoji}>{s.emoji}</Text>
                <Text style={styles.detailStatVal}>{s.val}</Text>
                <Text style={styles.detailStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>Recent Sessions 📋</Text>
            {child.sessions?.map((sess: any, i: number) => (
              <View key={i} style={styles.detailSessionRow}>
                <Text style={styles.detailSessionTopic}>{sess.topic}</Text>
                <Text style={styles.detailSessionMeta}>{sess.date} · Score: {sess.score}</Text>
              </View>
            ))}
            {(!child.sessions || child.sessions.length === 0) && (
              <Text style={styles.detailNoSessions}>No sessions yet</Text>
            )}
          </View>
          <TouchableOpacity style={styles.detailDeleteBtn} onPress={() => setShowDeleteConfirm(true)}>
            {isDeleting ? (
              <ActivityIndicator size="small" color="#FF3B30" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                <Text style={styles.detailDeleteText}>Delete {child.nickname}'s Data</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
      <ConfirmModal visible={showDeleteConfirm} title={`Delete ${child.nickname}'s Data?`} message="This cannot be undone." onCancel={() => setShowDeleteConfirm(false)} onConfirm={handleDelete} />
    </Modal>
  );
}

// ─── Child Card
function ChildCard({ child, index, onPress }: any) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const color = CHAR_COLORS[child.chosenCharacter] || "#7C5CBF";
  const gradient = CHAR_GRADIENT[child.chosenCharacter] || ["#7C5CBF", "#5A3D9A"];
  const scoreColor = getScoreColor(child.confidenceScore);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 58, friction: 9, delay: index * 100, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 380, delay: index * 100, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.card}>
        <LinearGradient colors={gradient} style={styles.cardAvatar}>
          <Text style={{ fontSize: 26 }}>{CHAR_EMOJI[child.chosenCharacter]}</Text>
        </LinearGradient>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{child.nickname}</Text>
          <Text style={styles.cardChar}>{CHAR_LABELS[child.chosenCharacter]}</Text>
          <Text style={styles.cardLastSession}>{child.lastTopic} · {child.lastSessionDate}</Text>
        </View>
        <View style={styles.cardScore}>
          <Text style={[styles.cardScoreNum, { color: scoreColor }]}>{child.confidenceScore}</Text>
          <Text style={styles.cardScoreLabel}>score</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen
export default function ParentDashboardScreen({ navigation, route }: any) {
  const { childUids = [], parentId } = route.params || {};
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  // 🔥 DISABLE HARDWARE BACK BUTTON WHEN NO CHILDREN
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (children.length === 0) {
          return true;
        }
        return false;
      };
      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => backHandler.remove();
    }, [children.length])
  );

  // 🔥 DISABLE SWIPE BACK GESTURE ON iOS WHEN NO CHILDREN
  useEffect(() => {
    if (children.length === 0) {
      navigation.setOptions({ gestureEnabled: false });
    } else {
      navigation.setOptions({ gestureEnabled: true });
    }
  }, [children.length, navigation]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const childrenData = [];
      for (const childUid of childUids) {
        const childRef = doc(db, "users", childUid);
        const childSnap = await getDoc(childRef);
        if (!childSnap.exists()) continue;
        const childData = childSnap.data();

        const sessionsQuery = query(
          collection(db, "sessions"),
          where("childUid", "==", childUid),
          orderBy("sessionDate", "desc"),
          limit(20)
        );
        const sessionsSnap = await getDocs(sessionsQuery);
        const sessions = sessionsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FirestoreSession[];

        const formattedSessions = sessions.map((s: FirestoreSession) => ({
          date: s.sessionDate?.toDate().toLocaleDateString("en-PK", { month: "short", day: "numeric" }) || "Unknown",
          topic: s.topics?.[0] || "General Conversation",
          score: s.sessionScore || 50,
          character: s.characterId || childData.chosenCharacter || "zara",
          duration: s.sessionDuration ? `${Math.floor(s.sessionDuration / 60)} min` : "? min",
        }));

        const weeklyScores = calculateWeeklyScores(sessions);

        childrenData.push({
          uid: childUid,
          nickname: childData.nickname || "Child",
          age: childData.age || 0,
          chosenCharacter: childData.chosenCharacter || "zara",
          confidenceScore: childData.confidenceScore || 50,
          sessionStreak: childData.sessionStreak || 0,
          totalSessions: childData.totalSessions || 0,
          lastSessionDate: sessions[0]?.sessionDate?.toDate().toLocaleDateString("en-PK", { month: "short", day: "numeric" }) || "Never",
          lastTopic: sessions[0]?.topics?.[0] || "No sessions yet",
          weeklyScores,
          sessions: formattedSessions,
        });
      }
      setChildren(childrenData);
      Animated.stagger(100, [
        Animated.spring(headerAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
        Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      ]).start();
    } catch (error: any) {
      console.error("Failed to load parent dashboard data:", error);
      Alert.alert("Error", "Failed to load data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!childUids || childUids.length === 0) {
      setChildren([]);
      setIsLoading(false);
      return;
    }
    loadData();
  }, [childUids]);

  const handleAddNewChild = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "AgeInput" }],
    });
  };

  const deleteChildData = async (childUid: string) => {
    try {
      const sessionsQuery = query(collection(db, "sessions"), where("childUid", "==", childUid));
      const sessionsSnap = await getDocs(sessionsQuery);
      for (const docSnap of sessionsSnap.docs) {
        await deleteDoc(docSnap.ref).catch(err => console.log(`Failed: ${err.message}`));
      }
      await deleteDoc(doc(db, "users", childUid)).catch(err => console.log(`Failed: ${err.message}`));

      if (parentId) {
        const parentRef = doc(db, "parents", parentId);
        const parentSnap = await getDoc(parentRef);
        if (parentSnap.exists()) {
          const currentList = parentSnap.data().linkedChildren || [];
          const updatedList = currentList.filter((uid: string) => uid !== childUid);
          await updateDoc(parentRef, { linkedChildren: updatedList, updatedAt: Timestamp.now() });
        }
      }
      await loadData();
      Alert.alert("Success", "Child data deleted successfully.");
    } catch (error) {
      Alert.alert("Error", "Failed to delete child data.");
    }
  };

  const deleteAllChildrenData = async () => {
    setIsDeleting(true);
    try {
      const allChildUids = [...children.map((c) => c.uid)];
      for (const childUid of allChildUids) {
        const sessionsQuery = query(collection(db, "sessions"), where("childUid", "==", childUid));
        const sessionsSnap = await getDocs(sessionsQuery);
        for (const docSnap of sessionsSnap.docs) {
          await deleteDoc(docSnap.ref).catch(err => console.log(`Failed: ${err.message}`));
        }
        await deleteDoc(doc(db, "users", childUid)).catch(err => console.log(`Failed: ${err.message}`));
      }

      if (parentId) {
        await updateDoc(doc(db, "parents", parentId), { linkedChildren: [], updatedAt: Timestamp.now() });
      }

      setChildren([]);
      Alert.alert("Data Deleted", "All children's data has been removed. Use 'Add New Child' to start fresh.", [{ text: "OK" }]);
    } catch (error) {
      Alert.alert("Error", "Failed to delete all data.");
    } finally {
      setIsDeleting(false);
      setShowDeleteAll(false);
    }
  };

  if (isLoading) return <ParentDashboardSkeleton />;

  const hasChildren = children.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: headerAnim }}>
          <LinearGradient colors={["#7C5CBF", "#5A3D9A"]} style={styles.hero}>
            <SafeAreaView>
              <View style={styles.navRow}>
                <TouchableOpacity
                  style={[styles.backBtn, !hasChildren && styles.backBtnHidden]}
                  onPress={() => navigation.goBack()}
                  disabled={!hasChildren}
                >
                  <Ionicons name="chevron-back" size={24} color={hasChildren ? "white" : "transparent"} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.heroTitle}>Parent Dashboard</Text>
                  <Text style={styles.heroSub}>{children.length} child{children.length !== 1 ? "ren" : ""} linked</Text>
                </View>
              </View>
              <View style={styles.summaryStrip}>
                {[
                  { emoji: "👶", val: children.length, label: "Children" },
                  { emoji: "🎯", val: children.length ? Math.round(children.reduce((s, c) => s + c.confidenceScore, 0) / children.length) : 0, label: "Avg Score" },
                  { emoji: "🎙️", val: children.reduce((s, c) => s + c.totalSessions, 0), label: "Sessions" },
                  { emoji: "🔥", val: children.reduce((s, c) => s + c.sessionStreak, 0), label: "Streaks" },
                ].map((item, i) => (
                  <View key={i} style={styles.summaryItem}>
                    <Text style={styles.summaryEmoji}>{item.emoji}</Text>
                    <Text style={styles.summaryVal}>{item.val}</Text>
                    <Text style={styles.summaryLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </SafeAreaView>
          </LinearGradient>
        </Animated.View>

        <Animated.View style={{ opacity: cardAnim }}>
          {hasChildren ? (
            <>
              <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6 }}>
                <Text style={styles.sectionTitle}>Your Children 👨‍👩‍👧‍👦</Text>
                <Text style={styles.sectionSub}>Tap any card to view detailed progress</Text>
              </View>
              {children.map((child, i) => (
                <ChildCard key={child.uid} child={child} index={i} onPress={() => { setSelectedChild(child); setShowDetail(true); }} />
              ))}
              <TouchableOpacity style={styles.deleteAllBtn} onPress={() => setShowDeleteAll(true)} activeOpacity={0.8}>
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FF3B30" />
                ) : (
                  <>
                    <Ionicons name="warning-outline" size={18} color="#FF3B30" />
                    <Text style={styles.deleteAllText}>Delete All Children's Data</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <EmptyChildrenState onAddChild={handleAddNewChild} />
          )}
        </Animated.View>

        <View style={{ height: 60 }} />
      </ScrollView>

      <ChildDetailModal child={selectedChild} visible={showDetail} onClose={() => setShowDetail(false)} onDelete={() => deleteChildData(selectedChild?.uid)} />
      <ConfirmModal visible={showDeleteAll} title="Delete ALL Children's Data?" message="This will permanently remove all data. This cannot be undone." onCancel={() => setShowDeleteAll(false)} onConfirm={deleteAllChildrenData} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3E8FF" },
  hero: { paddingHorizontal: 22, paddingBottom: 28, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: "hidden" },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 20, marginBottom: 18 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  backBtnHidden: { opacity: 0, backgroundColor: "transparent" },
  headerTextContainer: { flex: 1, alignItems: "flex-end", justifyContent: "center", marginRight: 12 },
  heroTitle: { fontSize: 24, fontFamily: "Poppins-ExtraBold", color: "white", textAlign: "right" },
  heroSub: { fontSize: 16, fontFamily: "Poppins-Medium", color: "rgba(255,255,255,0.85)", marginTop: 2, textAlign: "right" },
  summaryStrip: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 22, paddingVertical: 16, paddingHorizontal: 4 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryEmoji: { fontSize: 24, marginBottom: 3 },
  summaryVal: { fontSize: 24, fontFamily: "Poppins-ExtraBold", color: "white" },
  summaryLabel: { fontSize: 11, fontFamily: "Poppins-SemiBold", color: "rgba(255,255,255,0.85)", marginTop: 2 },
  sectionTitle: { fontSize: 22, fontFamily: "Poppins-ExtraBold", color: "#1A1A2E" },
  sectionSub: { fontSize: 13, fontFamily: "Poppins-Medium", color: "#444444", marginTop: 4 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 26, marginHorizontal: 16, marginBottom: 12, padding: 16, elevation: 4 },
  cardAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1, marginLeft: 14 },
  cardName: { fontSize: 16, fontFamily: "Poppins-Bold", color: "#1A1A2E" },
  cardChar: { fontSize: 12, fontFamily: "Poppins-Medium", color: "#8A8A8A" },
  cardLastSession: { fontSize: 11, fontFamily: "Poppins-Medium", color: "#AAA", marginTop: 2 },
  cardScore: { alignItems: "center" },
  cardScoreNum: { fontSize: 24, fontFamily: "Poppins-ExtraBold" },
  cardScoreLabel: { fontSize: 10, fontFamily: "Poppins-Medium", color: "#AAA" },
  deleteAllBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, marginTop: 16, paddingVertical: 16, borderRadius: 18, borderWidth: 2, borderColor: "rgba(255,59,48,0.3)", backgroundColor: "rgba(255,59,48,0.06)" },
  deleteAllText: { fontSize: 15, fontFamily: "Poppins-SemiBold", color: "#FF3B30" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  modalSheet: { backgroundColor: "white", borderRadius: 30, padding: 28, alignItems: "center", width: "100%" },
  modalIconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: "Poppins-ExtraBold", color: "#1A1A2E", textAlign: "center", marginBottom: 10 },
  modalMessage: { fontSize: 13, fontFamily: "Poppins-Medium", color: "#777", textAlign: "center", marginBottom: 24 },
  modalBtnRow: { flexDirection: "row", gap: 12, width: "100%" },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, borderWidth: 2, borderColor: "#EEEEEE", alignItems: "center" },
  modalCancelText: { fontSize: 14, fontFamily: "Poppins-Bold", color: "#777" },
  modalConfirmBtn: { flex: 1, paddingVertical: 14,paddingHorizontal: 12, borderRadius: 16, alignItems: "center" },
  modalConfirmText: { fontSize: 14, fontFamily: "Poppins-Bold", color: "white" },
  detailBgDim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  detailSheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "white", borderTopLeftRadius: 32, borderTopRightRadius: 32, height: height * 0.85, overflow: "hidden" },
  detailHandle: { width: 44, height: 5, borderRadius: 99, backgroundColor: "#DDD", alignSelf: "center", marginTop: 10 },
  detailHero: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 24 },
  detailHeroRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  detailAvatar: { width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.5)" },
  detailHeroName: { fontSize: 24, fontFamily: "Poppins-ExtraBold", color: "white" },
  detailHeroMeta: { fontSize: 12, fontFamily: "Poppins-Medium", color: "rgba(255,255,255,0.75)", marginTop: 2 },
  detailCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  detailLevelBadge: { backgroundColor: "rgba(255,255,255,0.22)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, alignSelf: "flex-start", marginTop: 6 },
  detailLevelBadgeText: { fontSize: 12, fontFamily: "Poppins-Bold", color: "white" },
  detailStatsRow: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 18, paddingVertical: 14, marginTop: 8 },
  detailStatItem: { flex: 1, alignItems: "center" },
  detailStatEmoji: { fontSize: 20, marginBottom: 3 },
  detailStatVal: { fontSize: 22, fontFamily: "Poppins-ExtraBold", color: "white" },
  detailStatLabel: { fontSize: 10, fontFamily: "Poppins-SemiBold", color: "rgba(255,255,255,0.75)", marginTop: 2 },
  detailCard: { backgroundColor: "#F8F8F8", borderRadius: 24, padding: 20, marginHorizontal: 16, marginTop: 16 },
  detailCardTitle: { fontSize: 18, fontFamily: "Poppins-Bold", color: "#1A1A2E", marginBottom: 12 },
  detailSessionRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#EEE" },
  detailSessionTopic: { fontSize: 15, fontFamily: "Poppins-Medium", color: "#333" },
  detailSessionMeta: { fontSize: 12, fontFamily: "Poppins-Medium", color: "#AAA", marginTop: 2 },
  detailNoSessions: { fontSize: 13, fontFamily: "Poppins-Medium", color: "#AAA", textAlign: "center", paddingVertical: 20 },
  detailDeleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, marginTop: 16, paddingVertical: 16, borderRadius: 18, borderWidth: 2, borderColor: "rgba(255,59,48,0.3)", backgroundColor: "rgba(255,59,48,0.06)" },
  detailDeleteText: { fontSize: 14, fontFamily: "Poppins-SemiBold", color: "#FF3B30" },
});