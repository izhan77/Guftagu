// src/screens/Parent/ParentDashboardScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, Animated, Modal, FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

// ─── Mock Data ───────────────────────────────────────────────────────────────
const MOCK_CHILDREN = [
  {
    uid: "child_001",
    nickname: "Bilal",
    age: 10,
    chosenCharacter: "zara",
    confidenceScore: 72,
    confidenceLevel: "Confident Speaker",
    sessionStreak: 5,
    totalSessions: 18,
    lastSessionDate: "May 26, 2026",
    lastTopic: "My School Day",
    weeklyScores: [45, 52, 58, 61, 67, 70, 72],
    sessions: [
      { date: "May 26", topic: "My School Day",   score: 72, character: "zara",  duration: "4 min" },
      { date: "May 25", topic: "My Best Friend",  score: 68, character: "robo",  duration: "5 min" },
      { date: "May 24", topic: "Favourite Food",  score: 65, character: "zara",  duration: "3 min" },
      { date: "May 23", topic: "Dream House",     score: 61, character: "ustad", duration: "6 min" },
      { date: "May 22", topic: "Favourite Game",  score: 58, character: "zara",  duration: "4 min" },
    ],
  },
  {
    uid: "child_002",
    nickname: "Ayesha",
    age: 8,
    chosenCharacter: "robo",
    confidenceScore: 45,
    confidenceLevel: "Growing Voice",
    sessionStreak: 2,
    totalSessions: 7,
    lastSessionDate: "May 25, 2026",
    lastTopic: "My Favourite Game",
    weeklyScores: [30, 33, 35, 38, 40, 42, 45],
    sessions: [
      { date: "May 25", topic: "My Favourite Game", score: 45, character: "robo", duration: "3 min" },
      { date: "May 24", topic: "My School Day",     score: 42, character: "robo", duration: "4 min" },
      { date: "May 22", topic: "My Pet",            score: 40, character: "robo", duration: "3 min" },
    ],
  },
  {
    uid: "child_003",
    nickname: "Hamza",
    age: 12,
    chosenCharacter: "ustad",
    confidenceScore: 88,
    confidenceLevel: "Voice Champion",
    sessionStreak: 11,
    totalSessions: 34,
    lastSessionDate: "May 27, 2026",
    lastTopic: "My Future Goals",
    weeklyScores: [70, 74, 77, 80, 83, 86, 88],
    sessions: [
      { date: "May 27", topic: "My Future Goals", score: 88, character: "ustad", duration: "7 min" },
      { date: "May 26", topic: "Karachi City",    score: 85, character: "ustad", duration: "6 min" },
      { date: "May 25", topic: "My Hero",         score: 83, character: "zara",  duration: "5 min" },
      { date: "May 24", topic: "My School",       score: 80, character: "ustad", duration: "4 min" },
    ],
  },
];

const CHAR_COLORS: Record<string, string> = {
  zara: "#7C5CBF", robo: "#2196F3", ustad: "#4CAF50",
};
const CHAR_GRADIENT: Record<string, [string, string]> = {
  zara:  ["#7C5CBF", "#5A3D9A"],
  robo:  ["#2196F3", "#1565C0"],
  ustad: ["#4CAF50", "#2E7D32"],
};
const CHAR_BG: Record<string, string> = {
  zara: "#F3E8FF", robo: "#E8F4FF", ustad: "#E8FFF3",
};
const CHAR_EMOJI: Record<string, string> = {
  zara: "🧕", robo: "🤖", ustad: "👴",
};
const CHAR_LABELS: Record<string, string> = {
  zara: "Zara", robo: "Robo Bhaya", ustad: "Ustad Sahab",
};
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getScoreColor = (s: number) =>
  s >= 80 ? "#7C5CBF" : s >= 60 ? "#2196F3" : s >= 40 ? "#FF9500" : "#FF3B30";
const getScoreLabel = (s: number) =>
  s >= 80 ? "Champion 👑" : s >= 60 ? "Confident 🌟" : s >= 40 ? "Growing 🌱" : "Starting 🐣";

// ─── Shimmer (matches child dashboard) ───────────────────────────────────────
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
  const tx = anim.interpolate({ inputRange: [0, 1], outputRange: [-60, 60] });
  return (
    <View style={[{ width: w as any, height: h, borderRadius: radius, overflow: "hidden", backgroundColor: "#E8E3F5" }, style]}>
      <Animated.View style={{
        position: "absolute", top: 0, bottom: 0, left: 0, right: 0,
        opacity, transform: [{ translateX: tx }],
        backgroundColor: "rgba(255,255,255,0.6)", borderRadius: radius,
      }} />
    </View>
  );
}

// ─── Skeleton (same warm purple palette as child dashboard) ──────────────────
function ParentDashboardSkeleton() {
  const shimmer = useShimmer();
  const op = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  return (
    <View style={{ flex: 1, backgroundColor: "#F3E8FF" }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <Animated.View style={{ opacity: op }}>
          <LinearGradient colors={["#C4B0E8", "#D4C4F0"]} style={sk.heroSkel}>
            <SafeAreaView>
              <View style={sk.heroNavRow}>
                <Bone w={44} h={44} radius={22} />
                <View style={{ alignItems: "center", gap: 6 }}>
                  <Bone w={160} h={22} radius={11} />
                  <Bone w={110} h={13} radius={6} />
                </View>
                <Bone w={44} h={44} radius={22} />
              </View>
              {/* Summary strip */}
              <View style={sk.summaryStrip}>
                {[0, 1, 2, 3].map(i => (
                  <View key={i} style={{ flex: 1, alignItems: "center", gap: 0 }}>
                    <Bone w={28} h={28} radius={14} />
                    <Bone w={36} h={22} radius={9} style={{ marginTop: 6 }} />
                    <Bone w={44} h={11} radius={5} style={{ marginTop: 4 }} />
                  </View>
                ))}
              </View>
            </SafeAreaView>
          </LinearGradient>
        </Animated.View>

        {/* Section title */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 4 }}>
          <Bone w={170} h={24} radius={12} />
          <Bone w={230} h={13} radius={6} style={{ marginTop: 8 }} />
        </View>

        {/* Child cards */}
        {[0, 1, 2].map(i => (
          <View key={i} style={sk.childCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <Bone w={58} h={58} radius={29} />
              <View style={{ flex: 1, gap: 8 }}>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <Bone w={90} h={18} radius={9} />
                  <Bone w={52} h={18} radius={9} />
                </View>
                <Bone w="80%" h={12} radius={6} />
                <Bone w="55%" h={12} radius={6} />
              </View>
              <View style={{ alignItems: "center", gap: 4 }}>
                <Bone w={48} h={34} radius={10} />
                <Bone w={36} h={11} radius={5} />
              </View>
            </View>
            <Bone w="100%" h={10} radius={5} style={{ marginTop: 16 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
              <Bone w={100} h={28} radius={14} />
              <Bone w={100} h={28} radius={14} />
            </View>
          </View>
        ))}

        {/* Safety card */}
        <View style={sk.safetyCard}>
          <Bone w={52} h={52} radius={26} />
          <View style={{ flex: 1, gap: 8 }}>
            <Bone w={130} h={14} radius={7} />
            <Bone w="90%" h={11} radius={5} />
            <Bone w="70%" h={11} radius={5} />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const sk = StyleSheet.create({
  heroSkel: { paddingHorizontal: 22, paddingBottom: 28, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  heroNavRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10, marginBottom: 20 },
  summaryStrip: {
    flexDirection: "row", backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 22, paddingVertical: 16, paddingHorizontal: 8,
  },
  childCard: {
    backgroundColor: "white", borderRadius: 26, padding: 18,
    marginHorizontal: 16, marginBottom: 12,
    elevation: 4, shadowColor: "#7C5CBF", shadowOpacity: 0.08, shadowRadius: 12,
  },
  safetyCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 14,
    backgroundColor: "white", borderRadius: 22, padding: 18,
    marginHorizontal: 16, marginTop: 8,
    elevation: 4, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10,
  },
});

// ─── Mini Line Chart ──────────────────────────────────────────────────────────
function MiniLineChart({ scores, color }: { scores: number[]; color: string }) {
  const CHART_W = width - 72;
  const CHART_H = 100;
  const PAD = 8;
  const pts = scores.map((s, i) => ({
    x: PAD + (i / (scores.length - 1)) * (CHART_W - PAD * 2),
    y: CHART_H - PAD - (s / 100) * (CHART_H - PAD * 2),
    s,
  }));

  return (
    <View style={{ height: CHART_H + 28, marginTop: 10 }}>
      {/* Grid lines */}
      {[25, 50, 75].map(v => {
        const y = CHART_H - PAD - (v / 100) * (CHART_H - PAD * 2);
        return (
          <View key={v} style={{ position: "absolute", top: y, left: 0, right: 0, height: 1, backgroundColor: "rgba(0,0,0,0.05)" }}>
            <Text style={{ position: "absolute", right: 0, top: -8, fontSize: 9, color: "#BBBBBB", fontFamily: "Poppins-Medium" }}>{v}</Text>
          </View>
        );
      })}

      {/* Lines between dots */}
      {pts.slice(0, -1).map((p, i) => {
        const next = pts[i + 1];
        const dx = next.x - p.x, dy = next.y - p.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View key={i} style={{
            position: "absolute", left: p.x, top: p.y,
            width: len, height: 3, borderRadius: 2,
            backgroundColor: color,
            transform: [{ rotate: `${angle}deg` }],
            // @ts-ignore
            transformOrigin: "left center",
            shadowColor: color, shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
          }} />
        );
      })}

      {/* Dots */}
      {pts.map((p, i) => (
        <View key={i}>
          <View style={{
            position: "absolute", left: p.x - 9, top: p.y - 9,
            width: 18, height: 18, borderRadius: 9,
            backgroundColor: color + "30",
          }} />
          <View style={{
            position: "absolute", left: p.x - 5, top: p.y - 5,
            width: 10, height: 10, borderRadius: 5,
            backgroundColor: color, borderWidth: 2, borderColor: "white",
            elevation: 3, shadowColor: color, shadowOpacity: 0.5, shadowRadius: 4,
          }} />
          {i === pts.length - 1 && (
            <View style={{
              position: "absolute", left: p.x - 16, top: p.y - 24,
              backgroundColor: color, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
            }}>
              <Text style={{ fontSize: 10, color: "white", fontFamily: "Poppins-Bold" }}>{p.s}</Text>
            </View>
          )}
          <Text style={{
            position: "absolute", left: p.x - 14, top: CHART_H + 6,
            width: 28, fontSize: 9, color: "#AAAAAA",
            fontFamily: "Poppins-Medium", textAlign: "center",
          }}>{DAY_LABELS[i]}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Confirm Modal (warm theme) ───────────────────────────────────────────────
function ConfirmModal({ visible, title, message, onConfirm, onCancel }: {
  visible: boolean; title: string; message: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  const scale = useRef(new Animated.Value(0.88)).current;
  const op    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, tension: 65, friction: 10, useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.88); op.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;
  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onCancel}>
      <Animated.View style={[conf.overlay, { opacity: op }]}>
        <Animated.View style={[conf.sheet, { transform: [{ scale }] }]}>
          <LinearGradient colors={["#FF3B30", "#FF6B6B"]} style={conf.iconCircle}>
            <Ionicons name="warning" size={28} color="white" />
          </LinearGradient>
          <Text style={conf.title}>{title}</Text>
          <Text style={conf.message}>{message}</Text>
          <View style={conf.btnRow}>
            <TouchableOpacity style={conf.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
              <Text style={conf.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} onPress={onConfirm}>
              <LinearGradient colors={["#FF3B30", "#FF6B6B"]} style={conf.confirmBtn}>
                <Text style={conf.confirmText}>Delete</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const conf = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  sheet: { backgroundColor: "white", borderRadius: 30, padding: 28, alignItems: "center", width: "100%", elevation: 20, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title:   { fontSize: 20, fontFamily: "Poppins-ExtraBold", color: "#1A1A2E", textAlign: "center", marginBottom: 10 },
  message: { fontSize: 13, fontFamily: "Poppins-Medium", color: "#777777", textAlign: "center", lineHeight: 20, marginBottom: 24 },
  btnRow:  { flexDirection: "row", gap: 12, width: "100%" },
  cancelBtn:  { flex: 1, paddingVertical: 14, borderRadius: 16, borderWidth: 2, borderColor: "#EEEEEE", alignItems: "center" },
  cancelText: { fontSize: 14, fontFamily: "Poppins-Bold", color: "#777777" },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: "center" },
  confirmText:{ fontSize: 14, fontFamily: "Poppins-Bold", color: "white" },
});

// ─── Child Detail Modal ───────────────────────────────────────────────────────
function ChildDetailModal({ child, visible, onClose, onDelete }: {
  child: any; visible: boolean; onClose: () => void; onDelete: () => void;
}) {
  const slideY = useRef(new Animated.Value(height)).current;
  const bgOp   = useRef(new Animated.Value(0)).current;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, tension: 52, friction: 11, useNativeDriver: true }),
        Animated.timing(bgOp,   { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: height, duration: 260, useNativeDriver: true }),
        Animated.timing(bgOp,   { toValue: 0,      duration: 260, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!child) return null;

  const color      = CHAR_COLORS[child.chosenCharacter] || "#7C5CBF";
  const gradient   = CHAR_GRADIENT[child.chosenCharacter] || ["#7C5CBF", "#5A3D9A"];
  const scoreColor = getScoreColor(child.confidenceScore);
  const weekDelta  = child.weeklyScores[6] - child.weeklyScores[0];

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <Animated.View style={[cdm.bgDim, { opacity: bgOp }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      <Animated.View style={[cdm.sheet, { transform: [{ translateY: slideY }] }]}>
        <View style={cdm.handle} />

        {/* Header — matches child dashboard hero */}
        <LinearGradient colors={gradient as any} style={cdm.sheetHero} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}>
          {/* Blobs */}
          <View style={cdm.blobTR} /><View style={cdm.blobBL} />

          <View style={cdm.heroRow}>
            <View style={[cdm.avatar, { backgroundColor: "rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.5)", borderWidth: 2 }]}>
              <Text style={{ fontSize: 32 }}>{CHAR_EMOJI[child.chosenCharacter]}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={cdm.heroName}>{child.nickname}</Text>
              <Text style={cdm.heroMeta}>Age {child.age} · {CHAR_LABELS[child.chosenCharacter]}</Text>
              <View style={cdm.levelBadge}>
                <Text style={cdm.levelBadgeText}>{getScoreLabel(child.confidenceScore)}</Text>
              </View>
            </View>
            <TouchableOpacity style={cdm.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color="white" />
            </TouchableOpacity>
          </View>

          {/* Score pills row */}
          <View style={cdm.statsRow}>
            {[
              { emoji: "🎯", val: child.confidenceScore, label: "Score"    },
              { emoji: "🔥", val: child.sessionStreak,   label: "Streak"   },
              { emoji: "🎙️",val: child.totalSessions,   label: "Sessions" },
            ].map((s, i) => (
              <View key={i} style={cdm.statItem}>
                <Text style={cdm.statEmoji}>{s.emoji}</Text>
                <Text style={cdm.statVal}>{s.val}</Text>
                <Text style={cdm.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }}>

          {/* Weekly Chart */}
          <View style={cdm.card}>
            <View style={cdm.cardHeaderRow}>
              <Text style={cdm.cardTitle}>Weekly Progress 📈</Text>
              <View style={[cdm.deltaPill, { backgroundColor: weekDelta >= 0 ? "#E8FFF3" : "#FFE8E8" }]}>
                <Ionicons name={weekDelta >= 0 ? "trending-up" : "trending-down"} size={13} color={weekDelta >= 0 ? "#4CAF50" : "#FF3B30"} />
                <Text style={[cdm.deltaText, { color: weekDelta >= 0 ? "#4CAF50" : "#FF3B30" }]}>
                  {weekDelta >= 0 ? "+" : ""}{weekDelta} pts
                </Text>
              </View>
            </View>
            <MiniLineChart scores={child.weeklyScores} color={color} />
          </View>

          {/* Last topic highlight */}
          <LinearGradient colors={[color + "15", color + "05"]} style={cdm.lastTopicCard}>
            <View style={[cdm.lastTopicIcon, { backgroundColor: color + "25" }]}>
              <Text style={{ fontSize: 22 }}>💬</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={cdm.lastTopicLabel}>Last Practiced Topic</Text>
              <Text style={cdm.lastTopicValue}>{child.lastTopic}</Text>
              <Text style={cdm.lastTopicDate}>{child.lastSessionDate}</Text>
            </View>
            <Text style={[cdm.lastTopicScore, { color }]}>{child.sessions[0]?.score ?? "—"}</Text>
          </LinearGradient>

          {/* Confidence meter — mirrors child dashboard exactly */}
          <View style={cdm.card}>
            <View style={cdm.cardHeaderRow}>
              <Text style={cdm.cardTitle}>Confidence Meter</Text>
              <View style={[cdm.scorePill, { backgroundColor: color }]}>
                <Text style={cdm.scorePillText}>{child.confidenceScore} / 100</Text>
              </View>
            </View>
            <View style={cdm.progressTrack}>
              <LinearGradient
                colors={gradient as any}
                style={[cdm.progressFill, { width: `${child.confidenceScore}%` as any }]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Text style={cdm.progressEmoji}>{child.confidenceScore >= 80 ? "👑" : child.confidenceScore >= 60 ? "🌟" : child.confidenceScore >= 40 ? "🌱" : "🐣"}</Text>
              </LinearGradient>
            </View>
            <View style={cdm.progressLabels}>
              <Text style={cdm.progressLabelText}>Shy Seedling</Text>
              <Text style={cdm.progressLabelText}>Voice Champion</Text>
            </View>
            <View style={cdm.milestones}>
              {[25, 50, 75, 100].map(m => (
                <View key={m} style={[cdm.milestone, child.confidenceScore >= m && { backgroundColor: color }]}>
                  <Text style={[cdm.milestoneText, child.confidenceScore >= m && { color: "white" }]}>{m}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Sessions list */}
          <View style={cdm.card}>
            <Text style={cdm.cardTitle}>All Sessions 📋</Text>
            <View style={{ marginTop: 14 }}>
              {child.sessions.map((sess: any, i: number) => {
                const sc = CHAR_COLORS[sess.character] || "#7C5CBF";
                const sg = CHAR_GRADIENT[sess.character] || ["#7C5CBF","#5A3D9A"];
                const barColor = sess.score >= 70 ? "#4CAF50" : sess.score >= 50 ? "#FF9500" : "#FF3B30";
                return (
                  <View key={i} style={[cdm.sessRow, i < child.sessions.length - 1 && cdm.sessRowBorder]}>
                    <LinearGradient colors={sg as any} style={cdm.sessCharDot}>
                      <Text style={{ fontSize: 18 }}>{CHAR_EMOJI[sess.character]}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={cdm.sessTopic}>{sess.topic}</Text>
                      <Text style={cdm.sessMeta}>{sess.date} · {CHAR_LABELS[sess.character]} · {sess.duration}</Text>
                      <View style={cdm.sessBarTrack}>
                        <View style={[cdm.sessBarFill, { width: `${sess.score}%` as any, backgroundColor: barColor }]} />
                      </View>
                    </View>
                    <View style={[cdm.sessScorePill, { backgroundColor: barColor + "20" }]}>
                      <Text style={[cdm.sessScoreNum, { color: barColor }]}>{sess.score}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Delete */}
          <TouchableOpacity
            style={cdm.deleteBtn}
            onPress={() => setShowDeleteConfirm(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
            <Text style={cdm.deleteBtnText}>Delete {child.nickname}'s Data</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      <ConfirmModal
        visible={showDeleteConfirm}
        title={`Delete ${child.nickname}'s Data?`}
        message={`This will permanently remove all sessions, scores, and progress for ${child.nickname}. This cannot be undone.`}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => { setShowDeleteConfirm(false); onDelete(); onClose(); }}
      />
    </Modal>
  );
}

const cdm = StyleSheet.create({
  bgDim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#FAFAFA",
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    height: height * 0.92, overflow: "hidden",
  },
  handle: { width: 44, height: 5, borderRadius: 99, backgroundColor: "#DDDDDD", alignSelf: "center", marginTop: 10 },
  sheetHero: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 24, overflow: "hidden" },
  blobTR: { position: "absolute", top: -40, right: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.1)" },
  blobBL: { position: "absolute", bottom: -20, left: -20, width: 110, height: 110, borderRadius: 55, backgroundColor: "rgba(255,255,255,0.08)" },
  heroRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  avatar: { width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center" },
  heroName: { fontSize: 24, fontFamily: "Poppins-ExtraBold", color: "white" },
  heroMeta: { fontSize: 12, fontFamily: "Poppins-Medium", color: "rgba(255,255,255,0.75)", marginTop: 2, marginBottom: 6 },
  levelBadge: { backgroundColor: "rgba(255,255,255,0.22)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, alignSelf: "flex-start" },
  levelBadgeText: { fontSize: 12, fontFamily: "Poppins-Bold", color: "white" },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 18, paddingVertical: 14 },
  statItem: { flex: 1, alignItems: "center" },
  statEmoji: { fontSize: 20, marginBottom: 3 },
  statVal:   { fontSize: 22, fontFamily: "Poppins-ExtraBold", color: "white" },
  statLabel: { fontSize: 10, fontFamily: "Poppins-SemiBold", color: "rgba(255,255,255,0.75)", marginTop: 2 },
  card: { backgroundColor: "white", borderRadius: 26, padding: 20, marginHorizontal: 16, marginTop: 14, elevation: 4, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 12 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardTitle: { fontSize: 17, fontFamily: "Poppins-ExtraBold", color: "#1A1A2E" },
  deltaPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  deltaText: { fontSize: 12, fontFamily: "Poppins-Bold" },
  lastTopicCard: { flexDirection: "row", alignItems: "center", borderRadius: 26, padding: 16, marginHorizontal: 16, marginTop: 14 },
  lastTopicIcon: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  lastTopicLabel: { fontSize: 10, fontFamily: "Poppins-Medium", color: "#AAAAAA", marginBottom: 3 },
  lastTopicValue: { fontSize: 15, fontFamily: "Poppins-ExtraBold", color: "#1A1A2E" },
  lastTopicDate:  { fontSize: 11, fontFamily: "Poppins-Medium", color: "#AAAAAA", marginTop: 2 },
  lastTopicScore: { fontSize: 26, fontFamily: "Poppins-ExtraBold" },
  scorePill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 99 },
  scorePillText: { fontSize: 13, fontFamily: "Poppins-Bold", color: "white" },
  progressTrack: { height: 32, backgroundColor: "#F0EFF7", borderRadius: 16, overflow: "hidden", marginTop: 10 },
  progressFill:  { height: "100%", borderRadius: 16, alignItems: "flex-end", justifyContent: "center", paddingRight: 10, minWidth: 32 },
  progressEmoji: { fontSize: 18 },
  progressLabels:{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  progressLabelText: { fontSize: 12, fontFamily: "Poppins-SemiBold", color: "#AAAAAA" },
  milestones: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  milestone: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#F0EFF7", alignItems: "center", justifyContent: "center" },
  milestoneText: { fontSize: 13, fontFamily: "Poppins-Bold", color: "#BBBBBB" },
  sessRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  sessRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F5F5F5" },
  sessCharDot: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  sessTopic: { fontSize: 13, fontFamily: "Poppins-Bold", color: "#1A1A2E", marginBottom: 2 },
  sessMeta: { fontSize: 10, fontFamily: "Poppins-Medium", color: "#BBBBBB", marginBottom: 6 },
  sessBarTrack: { height: 6, backgroundColor: "#F0EFF7", borderRadius: 3, overflow: "hidden" },
  sessBarFill: { height: "100%", borderRadius: 3 },
  sessScorePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, minWidth: 44, alignItems: "center", marginLeft: 10 },
  sessScoreNum:  { fontSize: 15, fontFamily: "Poppins-ExtraBold" },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, marginTop: 16, paddingVertical: 16, borderRadius: 18, borderWidth: 2, borderColor: "rgba(255,59,48,0.3)", backgroundColor: "rgba(255,59,48,0.06)" },
  deleteBtnText: { fontSize: 14, fontFamily: "Poppins-SemiBold", color: "#FF3B30" },
});

// ─── Child Card ───────────────────────────────────────────────────────────────
function ChildCard({ child, index, onPress }: { child: any; index: number; onPress: () => void }) {
  const scale   = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const color    = CHAR_COLORS[child.chosenCharacter] || "#7C5CBF";
  const gradient = CHAR_GRADIENT[child.chosenCharacter] || ["#7C5CBF","#5A3D9A"];
  const scoreColor = getScoreColor(child.confidenceScore);
  const weekDelta  = child.weeklyScores[6] - child.weeklyScores[0];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, tension: 58, friction: 9, delay: index * 100, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 380, delay: index * 100, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.88}>
        <View style={cc.card}>
          {/* Colored left accent strip */}
          <View style={[cc.accentStrip, { backgroundColor: color }]} />

          {/* Top row */}
          <View style={cc.topRow}>
            <LinearGradient colors={gradient as any} style={cc.avatar}>
              <Text style={{ fontSize: 26 }}>{CHAR_EMOJI[child.chosenCharacter]}</Text>
            </LinearGradient>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Text style={cc.name}>{child.nickname}</Text>
                <View style={[cc.agePill, { backgroundColor: color + "18" }]}>
                  <Text style={[cc.agePillText, { color }]}>Age {child.age}</Text>
                </View>
              </View>
              <Text style={cc.lastSession}>{child.lastTopic} · {child.lastSessionDate}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 }}>
                <Text style={[cc.charLabel, { color }]}>{CHAR_LABELS[child.chosenCharacter]}</Text>
                <Text style={cc.sessCount}>{child.totalSessions} sessions</Text>
              </View>
            </View>
            <View style={cc.scoreWrap}>
              <Text style={[cc.scoreNum, { color: scoreColor }]}>{child.confidenceScore}</Text>
              <Text style={cc.scoreSubLabel}>score</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={cc.barTrack}>
            <LinearGradient
              colors={gradient as any}
              style={[cc.barFill, { width: `${child.confidenceScore}%` as any }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            />
          </View>

          {/* Footer row */}
          <View style={cc.footer}>
            <View style={[cc.levelPill, { backgroundColor: scoreColor + "18" }]}>
              <Text style={[cc.levelPillText, { color: scoreColor }]}>{getScoreLabel(child.confidenceScore)}</Text>
            </View>
            <View style={[cc.trendPill, { backgroundColor: weekDelta >= 0 ? "#E8FFF3" : "#FFE8E8" }]}>
              <Ionicons name={weekDelta >= 0 ? "trending-up" : "trending-down"} size={12} color={weekDelta >= 0 ? "#4CAF50" : "#FF3B30"} />
              <Text style={[cc.trendText, { color: weekDelta >= 0 ? "#4CAF50" : "#FF3B30" }]}>
                {weekDelta >= 0 ? "+" : ""}{weekDelta} this week
              </Text>
            </View>
            <View style={cc.tapHint}>
              <Text style={cc.tapHintText}>Details</Text>
              <Ionicons name="chevron-forward" size={12} color="#BBBBBB" />
            </View>
          </View>

          {/* Streak badge */}
          {child.sessionStreak >= 3 && (
            <View style={cc.streakBadge}>
              <Text style={cc.streakBadgeText}>🔥 {child.sessionStreak}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const cc = StyleSheet.create({
  card: {
    backgroundColor: "white", borderRadius: 26,
    marginHorizontal: 16, marginBottom: 12,
    padding: 18, paddingLeft: 24, overflow: "hidden",
    elevation: 6, shadowColor: "#7C5CBF", shadowOpacity: 0.1, shadowRadius: 14,
  },
  accentStrip: { position: "absolute", left: 0, top: 0, bottom: 0, width: 5 },
  topRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  avatar: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 18, fontFamily: "Poppins-ExtraBold", color: "#1A1A2E" },
  agePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  agePillText: { fontSize: 11, fontFamily: "Poppins-Bold" },
  lastSession: { fontSize: 11, fontFamily: "Poppins-Medium", color: "#AAAAAA", marginBottom: 2 },
  charLabel:   { fontSize: 12, fontFamily: "Poppins-Bold" },
  sessCount:   { fontSize: 11, fontFamily: "Poppins-Medium", color: "#BBBBBB" },
  scoreWrap:   { alignItems: "center", marginLeft: 8 },
  scoreNum:    { fontSize: 32, fontFamily: "Poppins-ExtraBold" },
  scoreSubLabel: { fontSize: 10, fontFamily: "Poppins-Medium", color: "#BBBBBB" },
  barTrack: { height: 8, backgroundColor: "#F0EFF7", borderRadius: 4, overflow: "hidden", marginBottom: 12 },
  barFill:  { height: "100%", borderRadius: 4 },
  footer:   { flexDirection: "row", alignItems: "center", gap: 8 },
  levelPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  levelPillText: { fontSize: 11, fontFamily: "Poppins-Bold" },
  trendPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
  trendText: { fontSize: 11, fontFamily: "Poppins-Bold" },
  tapHint:   { flexDirection: "row", alignItems: "center", gap: 2, marginLeft: "auto" },
  tapHintText: { fontSize: 11, fontFamily: "Poppins-Medium", color: "#BBBBBB" },
  streakBadge: { position: "absolute", top: 12, right: 12, backgroundColor: "rgba(255,149,0,0.12)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  streakBadgeText: { fontSize: 11, fontFamily: "Poppins-Bold", color: "#FF9500" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ParentDashboardScreen({ navigation }: any) {
  const [isLoading,     setIsLoading]     = useState(true);
  const [children,      setChildren]      = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [showDetail,    setShowDetail]    = useState(false);
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim  = useRef(new Animated.Value(0)).current;
  const cardAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => {
      setChildren(MOCK_CHILDREN);
      setIsLoading(false);
      Animated.stagger(120, [
        Animated.spring(headerAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
        Animated.spring(statsAnim,  { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
        Animated.spring(cardAnim,   { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      ]).start();
    }, 1400);
  }, []);

  if (isLoading) return <ParentDashboardSkeleton />;

  const totalSessions = children.reduce((s, c) => s + c.totalSessions, 0);
  const avgScore      = children.length ? Math.round(children.reduce((s, c) => s + c.confidenceScore, 0) / children.length) : 0;
  const totalStreak   = children.reduce((s, c) => s + c.sessionStreak, 0);
  const avgScoreColor = getScoreColor(avgScore);

  return (
    <View style={ms.root}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ══ HERO — matches child dashboard hero exactly ══ */}
        <Animated.View style={{
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
        }}>
          <LinearGradient colors={["#7C5CBF", "#5A3D9A"]} style={ms.hero} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}>
            {/* Decorative blobs */}
            <View style={ms.blobTR} /><View style={ms.blobBL} />

            <SafeAreaView>
              {/* Nav row */}
              <View style={ms.navRow}>
                <TouchableOpacity style={ms.backBtn} onPress={() => navigation.goBack()}>
                  <Ionicons name="chevron-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={ms.heroTitle}>Parent Dashboard</Text>
                  <Text style={ms.heroSub}>{children.length} child{children.length !== 1 ? "ren" : ""} linked</Text>
                </View>
                <View style={{ width: 44 }} />
              </View>

              {/* Summary strip — same pattern as child dashboard stats row */}
              <View style={ms.summaryStrip}>
                {[
                  { emoji: "👶", val: children.length, label: "Children"  },
                  { emoji: "🎯", val: avgScore,         label: "Avg Score" },
                  { emoji: "🎙️",val: totalSessions,    label: "Sessions"  },
                  { emoji: "🔥", val: totalStreak,      label: "Streaks"   },
                ].map((item, i) => (
                  <View key={i} style={ms.summaryItem}>
                    <Text style={ms.summaryEmoji}>{item.emoji}</Text>
                    <Text style={ms.summaryVal}>{item.val}</Text>
                    <Text style={ms.summaryLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </SafeAreaView>
          </LinearGradient>
        </Animated.View>

        {/* ══ STAT CARDS — same 3-card grid as child dashboard ══ */}
        <Animated.View style={[ms.statsRow, {
          opacity: statsAnim,
          transform: [{ scale: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
        }]}>
          {[
            { emoji: "🎯", value: avgScore,       label: "Avg Score",  grad: ["#7C5CBF","#5A3D9A"] as [string,string] },
            { emoji: "🔥", value: totalStreak,    label: "Day Streaks",grad: ["#FF6B6B","#EE4444"] as [string,string] },
            { emoji: "🎙️",value: totalSessions,  label: "Sessions",   grad: ["#00C9B8","#00A3A3"] as [string,string] },
          ].map((s, i) => (
            <LinearGradient key={i} colors={s.grad} style={ms.statCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={ms.statEmoji}>{s.emoji}</Text>
              <Text style={ms.statValue}>{s.value}</Text>
              <Text style={ms.statLabel}>{s.label}</Text>
            </LinearGradient>
          ))}
        </Animated.View>

        {/* ══ SECTION TITLE ══ */}
        <Animated.View style={{ opacity: cardAnim, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6 }}>
          <Text style={ms.sectionTitle}>Your Children 👨‍👩‍👧‍👦</Text>
          <Text style={ms.sectionSub}>Tap any card to view detailed progress & analytics</Text>
        </Animated.View>

        {/* ══ CHILDREN ══ */}
        <Animated.View style={{ opacity: cardAnim }}>
          {children.length === 0 ? (
            <View style={ms.emptyState}>
              <Text style={{ fontSize: 60, marginBottom: 14 }}>👶</Text>
              <Text style={ms.emptyTitle}>No children linked</Text>
              <Text style={ms.emptySub}>All data has been removed.</Text>
            </View>
          ) : (
            children.map((child, i) => (
              <ChildCard key={child.uid} child={child} index={i} onPress={() => { setSelectedChild(child); setShowDetail(true); }} />
            ))
          )}
        </Animated.View>

        {/* ══ SAFETY CARD — white card like child dashboard ══ */}
        <Animated.View style={[ms.safetyCard, { opacity: cardAnim }]}>
          <View style={ms.safetyIconWrap}>
            <Ionicons name="shield-checkmark" size={26} color="#7C5CBF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ms.safetyTitle}>COPPA Compliant 🔒</Text>
            <Text style={ms.safetyText}>Voice recordings are deleted after transcription. Only nicknames and scores are stored.</Text>
          </View>
        </Animated.View>

        {/* ══ DELETE ALL ══ */}
        {children.length > 0 && (
          <Animated.View style={{ opacity: cardAnim }}>
            <TouchableOpacity
              style={ms.deleteAllBtn}
              onPress={() => setShowDeleteAll(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="warning-outline" size={18} color="#FF3B30" />
              <Text style={ms.deleteAllText}>Delete All Children's Data</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Child Detail Modal */}
      <ChildDetailModal
        child={selectedChild}
        visible={showDetail}
        onClose={() => setShowDetail(false)}
        onDelete={() => setChildren(prev => prev.filter(c => c.uid !== selectedChild?.uid))}
      />

      {/* Delete All Confirm */}
      <ConfirmModal
        visible={showDeleteAll}
        title="Delete ALL Children's Data?"
        message="This will permanently wipe every session, score, and progress record for ALL your children. This CANNOT be undone."
        onCancel={() => setShowDeleteAll(false)}
        onConfirm={() => { setShowDeleteAll(false); setChildren([]); }}
      />
    </View>
  );
}

const ms = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3E8FF" },

  // Hero — same shape/padding as child dashboard
  hero: { paddingHorizontal: 22, paddingBottom: 28, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: "hidden" },
  blobTR: { position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.1)" },
  blobBL: { position: "absolute", bottom: -20, left: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.08)" },

  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10, marginBottom: 18 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 18, fontFamily: "Poppins-ExtraBold", color: "white" },
  heroSub:   { fontSize: 12, fontFamily: "Poppins-Medium", color: "rgba(255,255,255,0.75)", marginTop: 2 },

  summaryStrip: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 22, paddingVertical: 16, paddingHorizontal: 4 },
  summaryItem:  { flex: 1, alignItems: "center" },
  summaryEmoji: { fontSize: 22, marginBottom: 3 },
  summaryVal:   { fontSize: 22, fontFamily: "Poppins-ExtraBold", color: "white" },
  summaryLabel: { fontSize: 10, fontFamily: "Poppins-SemiBold", color: "rgba(255,255,255,0.8)", marginTop: 2 },

  // Stat cards — same as child dashboard
  statsRow: { flexDirection: "row", marginHorizontal: 16, marginTop: 16, gap: 10 },
  statCard:  { flex: 1, borderRadius: 22, paddingVertical: 16, alignItems: "center", elevation: 6, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8 },
  statEmoji: { fontSize: 26, marginBottom: 4 },
  statValue: { fontSize: 26, fontFamily: "Poppins-ExtraBold", color: "white" },
  statLabel: { fontSize: 11, fontFamily: "Poppins-SemiBold", color: "rgba(255,255,255,0.85)", marginTop: 2 },

  sectionTitle: { fontSize: 20, fontFamily: "Poppins-ExtraBold", color: "#1A1A2E" },
  sectionSub:   { fontSize: 12, fontFamily: "Poppins-Medium", color: "#8A8A8A", marginTop: 4 },

  emptyState: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontFamily: "Poppins-ExtraBold", color: "#1A1A2E", marginBottom: 8 },
  emptySub:   { fontSize: 14, fontFamily: "Poppins-Medium", color: "#AAAAAA", textAlign: "center" },

  // Safety — white card
  safetyCard: { flexDirection: "row", alignItems: "flex-start", gap: 14, backgroundColor: "white", borderRadius: 26, padding: 18, marginHorizontal: 16, marginTop: 8, elevation: 4, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10 },
  safetyIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#EDE8FF", alignItems: "center", justifyContent: "center" },
  safetyTitle: { fontSize: 14, fontFamily: "Poppins-ExtraBold", color: "#1A1A2E", marginBottom: 4 },
  safetyText:  { fontSize: 12, fontFamily: "Poppins-Medium", color: "#8A8A8A", lineHeight: 18 },

  deleteAllBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, marginTop: 16, paddingVertical: 16, borderRadius: 18, borderWidth: 2, borderColor: "rgba(255,59,48,0.3)", backgroundColor: "rgba(255,59,48,0.06)" },
  deleteAllText: { fontSize: 14, fontFamily: "Poppins-SemiBold", color: "#FF3B30" },
});