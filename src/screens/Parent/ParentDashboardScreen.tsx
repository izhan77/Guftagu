// src/screens/Parent/ParentDashboardScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
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
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../../services/firebase/config";

const { width, height } = Dimensions.get("window");

// ─── Constants (same as before) ───────────────────────────────────────────────
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
const CHAR_BG: Record<string, string> = {
  zara: "#F3E8FF",
  robo: "#E8F4FF",
  ustad: "#E8FFF3",
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

// ─── Helper: Calculate weekly scores from sessions ───────────────────────────
const calculateWeeklyScores = (sessions: any[]): number[] => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekSessions = sessions.filter((s) => s.sessionDate?.toDate() >= weekAgo);
  const scoresByDay: Record<number, number[]> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayKey = d.toDateString();
    scoresByDay[dayKey] = [];
  }
  weekSessions.forEach((s) => {
    const date = s.sessionDate.toDate();
    const dayKey = date.toDateString();
    if (scoresByDay[dayKey]) scoresByDay[dayKey].push(s.sessionScore);
  });
  const weeklyAverages = Object.values(scoresByDay).map((scores) =>
    scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  );
  return weeklyAverages;
};

// ─── Mini Line Chart (same as before) ─────────────────────────────────────────
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
      {[25, 50, 75].map((v) => {
        const y = CHART_H - PAD - (v / 100) * (CHART_H - PAD * 2);
        return (
          <View key={v} style={{ position: "absolute", top: y, left: 0, right: 0, height: 1, backgroundColor: "rgba(0,0,0,0.05)" }}>
            <Text style={{ position: "absolute", right: 0, top: -8, fontSize: 9, color: "#BBBBBB", fontFamily: "Poppins-Medium" }}>{v}</Text>
          </View>
        );
      })}
      {pts.slice(0, -1).map((p, i) => {
        const next = pts[i + 1];
        const dx = next.x - p.x,
          dy = next.y - p.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              width: len,
              height: 3,
              borderRadius: 2,
              backgroundColor: color,
              transform: [{ rotate: `${angle}deg` }],
              transformOrigin: "left center",
              shadowColor: color,
              shadowOpacity: 0.5,
              shadowRadius: 4,
            }}
          />
        );
      })}
      {pts.map((p, i) => (
        <View key={i}>
          <View style={{ position: "absolute", left: p.x - 9, top: p.y - 9, width: 18, height: 18, borderRadius: 9, backgroundColor: color + "30" }} />
          <View style={{ position: "absolute", left: p.x - 5, top: p.y - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: color, borderWidth: 2, borderColor: "white", elevation: 3, shadowColor: color, shadowOpacity: 0.5, shadowRadius: 4 }} />
          {i === pts.length - 1 && (
            <View style={{ position: "absolute", left: p.x - 16, top: p.y - 24, backgroundColor: color, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
              <Text style={{ fontSize: 10, color: "white", fontFamily: "Poppins-Bold" }}>{p.s}</Text>
            </View>
          )}
          <Text style={{ position: "absolute", left: p.x - 14, top: CHART_H + 6, width: 28, fontSize: 9, color: "#AAAAAA", fontFamily: "Poppins-Medium", textAlign: "center" }}>
            {DAY_LABELS[i]}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Confirm Modal (same as original, unchanged) ──────────────────────────────
function ConfirmModal({ visible, title, message, onConfirm, onCancel }: { visible: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  const scale = useRef(new Animated.Value(0.88)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([Animated.spring(scale, { toValue: 1, tension: 65, friction: 10, useNativeDriver: true }), Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true })]).start();
    } else {
      scale.setValue(0.88);
      op.setValue(0);
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
  sheet: { backgroundColor: "white", borderRadius: 30, padding: 28, alignItems: "center", width: "100%", elevation: 20 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { fontSize: 20, fontFamily: "Poppins-ExtraBold", color: "#1A1A2E", textAlign: "center", marginBottom: 10 },
  message: { fontSize: 13, fontFamily: "Poppins-Medium", color: "#777777", textAlign: "center", lineHeight: 20, marginBottom: 24 },
  btnRow: { flexDirection: "row", gap: 12, width: "100%" },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, borderWidth: 2, borderColor: "#EEEEEE", alignItems: "center" },
  cancelText: { fontSize: 14, fontFamily: "Poppins-Bold", color: "#777777" },
  confirmBtn: { flex: 1, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, alignItems: "center" },
  confirmText: { fontSize: 14, fontFamily: "Poppins-Bold", color: "white" },
});

// ─── Child Detail Modal (using real data) ─────────────────────────────────────
function ChildDetailModal({ child, visible, onClose, onDelete }: { child: any; visible: boolean; onClose: () => void; onDelete: () => void }) {
  const slideY = useRef(new Animated.Value(height)).current;
  const bgOp = useRef(new Animated.Value(0)).current;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  useEffect(() => {
    if (visible) {
      Animated.parallel([Animated.spring(slideY, { toValue: 0, tension: 52, friction: 11, useNativeDriver: true }), Animated.timing(bgOp, { toValue: 1, duration: 280, useNativeDriver: true })]).start();
    } else {
      Animated.parallel([Animated.timing(slideY, { toValue: height, duration: 260, useNativeDriver: true }), Animated.timing(bgOp, { toValue: 0, duration: 260, useNativeDriver: true })]).start();
    }
  }, [visible]);
  if (!child) return null;
  const color = CHAR_COLORS[child.chosenCharacter] || "#7C5CBF";
  const gradient = CHAR_GRADIENT[child.chosenCharacter] || ["#7C5CBF", "#5A3D9A"];
  const scoreColor = getScoreColor(child.confidenceScore);
  const weekDelta = child.weeklyScores[6] - child.weeklyScores[0];
  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <Animated.View style={[cdm.bgDim, { opacity: bgOp }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>
      <Animated.View style={[cdm.sheet, { transform: [{ translateY: slideY }] }]}>
        <View style={cdm.handle} />
        <LinearGradient colors={gradient} style={cdm.sheetHero} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}>
          <View style={cdm.blobTR} /><View style={cdm.blobBL} />
          <View style={cdm.heroRow}>
            <View style={[cdm.avatar, { backgroundColor: "rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.5)", borderWidth: 2 }]}>
              <Text style={{ fontSize: 32 }}>{CHAR_EMOJI[child.chosenCharacter]}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={cdm.heroName}>{child.nickname}</Text>
              <Text style={cdm.heroMeta}>Age {child.age} · {CHAR_LABELS[child.chosenCharacter]}</Text>
              <View style={cdm.levelBadge}><Text style={cdm.levelBadgeText}>{getScoreLabel(child.confidenceScore)}</Text></View>
            </View>
            <TouchableOpacity style={cdm.closeBtn} onPress={onClose}><Ionicons name="close" size={18} color="white" /></TouchableOpacity>
          </View>
          <View style={cdm.statsRow}>
            {[
              { emoji: "🎯", val: child.confidenceScore, label: "Score" },
              { emoji: "🔥", val: child.sessionStreak, label: "Streak" },
              { emoji: "🎙️", val: child.totalSessions, label: "Sessions" },
            ].map((s, i) => (
              <View key={i} style={cdm.statItem}>
                <Text style={cdm.statEmoji}>{s.emoji}</Text>
                <Text style={cdm.statVal}>{s.val}</Text>
                <Text style={cdm.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
          <View style={cdm.card}>
            <View style={cdm.cardHeaderRow}>
              <Text style={cdm.cardTitle}>Weekly Progress 📈</Text>
              <View style={[cdm.deltaPill, { backgroundColor: weekDelta >= 0 ? "#E8FFF3" : "#FFE8E8" }]}>
                <Ionicons name={weekDelta >= 0 ? "trending-up" : "trending-down"} size={13} color={weekDelta >= 0 ? "#4CAF50" : "#FF3B30"} />
                <Text style={[cdm.deltaText, { color: weekDelta >= 0 ? "#4CAF50" : "#FF3B30" }]}>{weekDelta >= 0 ? "+" : ""}{weekDelta} pts</Text>
              </View>
            </View>
            <MiniLineChart scores={child.weeklyScores} color={color} />
          </View>
          <LinearGradient colors={[color + "15", color + "05"]} style={cdm.lastTopicCard}>
            <View style={[cdm.lastTopicIcon, { backgroundColor: color + "25" }]}><Text style={{ fontSize: 22 }}>💬</Text></View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={cdm.lastTopicLabel}>Last Practiced Topic</Text>
              <Text style={cdm.lastTopicValue}>{child.lastTopic}</Text>
              <Text style={cdm.lastTopicDate}>{child.lastSessionDate}</Text>
            </View>
            <Text style={[cdm.lastTopicScore, { color }]}>{child.sessions[0]?.score ?? "—"}</Text>
          </LinearGradient>
          <View style={cdm.card}>
            <View style={cdm.cardHeaderRow}>
              <Text style={cdm.cardTitle}>Confidence Meter</Text>
              <View style={[cdm.scorePill, { backgroundColor: color }]}><Text style={cdm.scorePillText}>{child.confidenceScore} / 100</Text></View>
            </View>
            <View style={cdm.progressTrack}>
              <LinearGradient colors={gradient} style={[cdm.progressFill, { width: `${child.confidenceScore}%` }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={cdm.progressEmoji}>{child.confidenceScore >= 80 ? "👑" : child.confidenceScore >= 60 ? "🌟" : child.confidenceScore >= 40 ? "🌱" : "🐣"}</Text>
              </LinearGradient>
            </View>
            <View style={cdm.progressLabels}><Text style={cdm.progressLabelText}>Shy Seedling</Text><Text style={cdm.progressLabelText}>Voice Champion</Text></View>
            <View style={cdm.milestones}>
              {[25, 50, 75, 100].map((m) => (
                <View key={m} style={[cdm.milestone, child.confidenceScore >= m && { backgroundColor: color }]}>
                  <Text style={[cdm.milestoneText, child.confidenceScore >= m && { color: "white" }]}>{m}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={cdm.card}>
            <Text style={cdm.cardTitle}>All Sessions 📋</Text>
            <View style={{ marginTop: 14 }}>
              {child.sessions.map((sess: any, i: number) => {
                const sc = CHAR_COLORS[sess.character] || "#7C5CBF";
                const sg = CHAR_GRADIENT[sess.character] || ["#7C5CBF","#5A3D9A"];
                const barColor = sess.score >= 70 ? "#4CAF50" : sess.score >= 50 ? "#FF9500" : "#FF3B30";
                return (
                  <View key={i} style={[cdm.sessRow, i < child.sessions.length - 1 && cdm.sessRowBorder]}>
                    <LinearGradient colors={sg} style={cdm.sessCharDot}><Text style={{ fontSize: 18 }}>{CHAR_EMOJI[sess.character]}</Text></LinearGradient>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={cdm.sessTopic}>{sess.topic}</Text>
                      <Text style={cdm.sessMeta}>{sess.date} · {CHAR_LABELS[sess.character]} · {sess.duration}</Text>
                      <View style={cdm.sessBarTrack}><View style={[cdm.sessBarFill, { width: `${sess.score}%`, backgroundColor: barColor }]} /></View>
                    </View>
                    <View style={[cdm.sessScorePill, { backgroundColor: barColor + "20" }]}><Text style={[cdm.sessScoreNum, { color: barColor }]}>{sess.score}</Text></View>
                  </View>
                );
              })}
            </View>
          </View>
          <TouchableOpacity style={cdm.deleteBtn} onPress={() => setShowDeleteConfirm(true)} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
            <Text style={cdm.deleteBtnText}>Delete {child.nickname}'s Data</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
      <ConfirmModal visible={showDeleteConfirm} title={`Delete ${child.nickname}'s Data?`} message={`This will permanently remove all sessions, scores, and progress for ${child.nickname}. This cannot be undone.`} onCancel={() => setShowDeleteConfirm(false)} onConfirm={() => { setShowDeleteConfirm(false); onDelete(); onClose(); }} />
    </Modal>
  );
}
const cdm = StyleSheet.create({
  bgDim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FAFAFA", borderTopLeftRadius: 32, borderTopRightRadius: 32, height: height * 0.92, overflow: "hidden" },
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
  statVal: { fontSize: 22, fontFamily: "Poppins-ExtraBold", color: "white" },
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
  lastTopicDate: { fontSize: 11, fontFamily: "Poppins-Medium", color: "#AAAAAA", marginTop: 2 },
  lastTopicScore: { fontSize: 26, fontFamily: "Poppins-ExtraBold" },
  scorePill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 99 },
  scorePillText: { fontSize: 13, fontFamily: "Poppins-Bold", color: "white" },
  progressTrack: { height: 32, backgroundColor: "#F0EFF7", borderRadius: 16, overflow: "hidden", marginTop: 10 },
  progressFill: { height: "100%", borderRadius: 16, alignItems: "flex-end", justifyContent: "center", paddingRight: 10, minWidth: 32 },
  progressEmoji: { fontSize: 18 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
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
  sessScoreNum: { fontSize: 15, fontFamily: "Poppins-ExtraBold" },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, marginTop: 16, paddingVertical: 16, borderRadius: 18, borderWidth: 2, borderColor: "rgba(255,59,48,0.3)", backgroundColor: "rgba(255,59,48,0.06)" },
  deleteBtnText: { fontSize: 14, fontFamily: "Poppins-SemiBold", color: "#FF3B30" },
});

// ─── Child Card (real data) ───────────────────────────────────────────────────
function ChildCard({ child, index, onPress }: { child: any; index: number; onPress: () => void }) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const color = CHAR_COLORS[child.chosenCharacter] || "#7C5CBF";
  const gradient = CHAR_GRADIENT[child.chosenCharacter] || ["#7C5CBF","#5A3D9A"];
  const scoreColor = getScoreColor(child.confidenceScore);
  const weekDelta = child.weeklyScores[6] - child.weeklyScores[0];
  useEffect(() => {
    Animated.parallel([Animated.spring(scale, { toValue: 1, tension: 58, friction: 9, delay: index * 100, useNativeDriver: true }), Animated.timing(opacity, { toValue: 1, duration: 380, delay: index * 100, useNativeDriver: true })]).start();
  }, []);
  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.88}>
        <View style={cc.card}>
          <View style={[cc.accentStrip, { backgroundColor: color }]} />
          <View style={cc.topRow}>
            <LinearGradient colors={gradient} style={cc.avatar}><Text style={{ fontSize: 26 }}>{CHAR_EMOJI[child.chosenCharacter]}</Text></LinearGradient>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Text style={cc.name}>{child.nickname}</Text>
                <View style={[cc.agePill, { backgroundColor: color + "18" }]}><Text style={[cc.agePillText, { color }]}>Age {child.age}</Text></View>
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
          <View style={cc.barTrack}>
            <LinearGradient colors={gradient} style={[cc.barFill, { width: `${child.confidenceScore}%` }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
          </View>
          <View style={cc.footer}>
            <View style={[cc.levelPill, { backgroundColor: scoreColor + "18" }]}><Text style={[cc.levelPillText, { color: scoreColor }]}>{getScoreLabel(child.confidenceScore)}</Text></View>
            <View style={[cc.trendPill, { backgroundColor: weekDelta >= 0 ? "#E8FFF3" : "#FFE8E8" }]}>
              <Ionicons name={weekDelta >= 0 ? "trending-up" : "trending-down"} size={12} color={weekDelta >= 0 ? "#4CAF50" : "#FF3B30"} />
              <Text style={[cc.trendText, { color: weekDelta >= 0 ? "#4CAF50" : "#FF3B30" }]}>{weekDelta >= 0 ? "+" : ""}{weekDelta} this week</Text>
            </View>
            <View style={cc.tapHint}><Text style={cc.tapHintText}>Details</Text><Ionicons name="chevron-forward" size={12} color="#BBBBBB" /></View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
const cc = StyleSheet.create({
  card: { backgroundColor: "white", borderRadius: 26, marginHorizontal: 16, marginBottom: 12, padding: 18, paddingLeft: 24, overflow: "hidden", elevation: 6, shadowColor: "#7C5CBF", shadowOpacity: 0.1, shadowRadius: 14 },
  accentStrip: { position: "absolute", left: 0, top: 0, bottom: 0, width: 5 },
  topRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  avatar: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 18, fontFamily: "Poppins-ExtraBold", color: "#1A1A2E" },
  agePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  agePillText: { fontSize: 11, fontFamily: "Poppins-Bold" },
  lastSession: { fontSize: 11, fontFamily: "Poppins-Medium", color: "#6e6d6d", marginBottom: 2 },
  charLabel: { fontSize: 12, fontFamily: "Poppins-Bold" },
  sessCount: { fontSize: 11, fontFamily: "Poppins-Medium", color: "#6e6d6d" },
  scoreWrap: { alignItems: "center", marginLeft: 8 },
  scoreNum: { fontSize: 32, fontFamily: "Poppins-ExtraBold" },
  scoreSubLabel: { fontSize: 10, fontFamily: "Poppins-Medium", color: "#6e6d6d" },
  barTrack: { height: 8, backgroundColor: "#F0EFF7", borderRadius: 4, overflow: "hidden", marginBottom: 12 },
  barFill: { height: "100%", borderRadius: 4 },
  footer: { flexDirection: "row", alignItems: "center", gap: 8 },
  levelPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  levelPillText: { fontSize: 11, fontFamily: "Poppins-Bold" },
  trendPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
  trendText: { fontSize: 11, fontFamily: "Poppins-Bold" },
  tapHint: { flexDirection: "row", alignItems: "center", gap: 2, marginLeft: "auto" },
  tapHintText: { fontSize: 11, fontFamily: "Poppins-Medium", color: "#6e6d6d" },
});

// ─── Skeleton Loader ─────────────────────────────────────────────────────────
function ParentDashboardSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: "#F3E8FF", justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#7C5CBF" />
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ParentDashboardScreen({ navigation, route }: any) {
  const { childUids = [], parentId } = route.params || {};
  const [isLoading, setIsLoading] = useState(true);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const childrenData = [];
      for (const childUid of childUids) {
        // Fetch child user document
        const childRef = doc(db, "users", childUid);
        const childSnap = await getDoc(childRef);
        if (!childSnap.exists()) continue;
        const childData = childSnap.data();
        // Fetch sessions for this child (up to 20, ordered)
        const sessionsQuery = query(collection(db, "sessions"), where("childUid", "==", childUid), orderBy("sessionDate", "desc"), limit(20));
        const sessionsSnap = await getDocs(sessionsQuery);
        const sessions = sessionsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        // Format sessions for display
        const formattedSessions = sessions.map((s) => ({
          date: s.sessionDate?.toDate().toLocaleDateString("en-PK", { month: "short", day: "numeric" }) || "Unknown",
          topic: s.topics?.[0] || "General Conversation",
          score: s.sessionScore || 0,
          character: s.characterId || childData.chosenCharacter || "zara",
          duration: s.sessionDuration ? `${Math.floor(s.sessionDuration / 60)} min` : "? min",
        }));
        // Calculate weekly scores
        const weeklyScores = calculateWeeklyScores(sessions);
        // Determine last topic and date
        const lastSession = sessions[0];
        const lastTopic = lastSession?.topics?.[0] || "No sessions yet";
        const lastSessionDate = lastSession?.sessionDate?.toDate().toLocaleDateString("en-PK", { month: "short", day: "numeric" }) || "Never";
        childrenData.push({
          uid: childUid,
          nickname: childData.nickname || "Child",
          age: childData.age || 0,
          chosenCharacter: childData.chosenCharacter || "zara",
          confidenceScore: childData.confidenceScore || 50,
          confidenceLevel: childData.confidenceLevel || "Growing Voice",
          sessionStreak: childData.sessionStreak || 0,
          totalSessions: childData.totalSessions || 0,
          lastSessionDate,
          lastTopic,
          weeklyScores,
          sessions: formattedSessions,
        });
      }
      setChildren(childrenData);
    } catch (error) {
      console.error("Failed to load parent dashboard data:", error);
      Alert.alert("Error", "Failed to load data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (childUids.length === 0) {
      Alert.alert("No Children", "No children linked to this parent account.");
      navigation.goBack();
      return;
    }
    loadData();
  }, [childUids]);

  const deleteChildData = async (childUid: string) => {
    try {
      // Delete all sessions of this child
      const sessionsQuery = query(collection(db, "sessions"), where("childUid", "==", childUid));
      const sessionsSnap = await getDocs(sessionsQuery);
      const batch = writeBatch(db);
      sessionsSnap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
      await batch.commit();
      // Delete user document
      await deleteDoc(doc(db, "users", childUid));
      // Remove child UID from parent's linkedChildren array
      if (parentId) {
        const parentRef = doc(db, "parents", parentId);
        const parentSnap = await getDoc(parentRef);
        if (parentSnap.exists()) {
          const currentList = parentSnap.data().linkedChildren || [];
          const updatedList = currentList.filter((uid: string) => uid !== childUid);
          await updateDoc(parentRef, { linkedChildren: updatedList, updatedAt: Timestamp.now() });
        }
      }
      // Reload data
      await loadData();
    } catch (error) {
      console.error("Delete child error:", error);
      Alert.alert("Error", "Failed to delete child data. Please try again.");
    }
  };

  const deleteAllChildrenData = async () => {
    try {
      const allChildUids = [...children.map((c) => c.uid)];
      for (const childUid of allChildUids) {
        // Delete sessions
        const sessionsQuery = query(collection(db, "sessions"), where("childUid", "==", childUid));
        const sessionsSnap = await getDocs(sessionsQuery);
        const batch = writeBatch(db);
        sessionsSnap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
        await batch.commit();
        // Delete user document
        await deleteDoc(doc(db, "users", childUid));
      }
      // Clear parent's linkedChildren array
      if (parentId) {
        await updateDoc(doc(db, "parents", parentId), { linkedChildren: [], updatedAt: Timestamp.now() });
      }
      setChildren([]);
      Alert.alert("Deleted", "All children's data has been removed.");
      navigation.goBack();
    } catch (error) {
      console.error("Delete all error:", error);
      Alert.alert("Error", "Failed to delete all data. Please try again.");
    }
  };

  if (isLoading) return <ParentDashboardSkeleton />;

  const totalSessions = children.reduce((s, c) => s + c.totalSessions, 0);
  const avgScore = children.length ? Math.round(children.reduce((s, c) => s + c.confidenceScore, 0) / children.length) : 0;
  const totalStreak = children.reduce((s, c) => s + c.sessionStreak, 0);
  const avgScoreColor = getScoreColor(avgScore);

  return (
    <View style={{ flex: 1, backgroundColor: "#F3E8FF" }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Header (same as before) */}
        <LinearGradient colors={["#7C5CBF", "#5A3D9A"]} style={ms.hero} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}>
          <View style={ms.blobTR} /><View style={ms.blobBL} />
          <SafeAreaView>
            <View style={ms.navRow}>
              <TouchableOpacity style={ms.backBtn} onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={24} color="white" /></TouchableOpacity>
              <View style={ms.headerTextContainer}>
                <Text style={ms.heroTitle}>Parent Dashboard</Text>
                <Text style={ms.heroSub}>{children.length} child{children.length !== 1 ? "ren" : ""} linked</Text>
              </View>
            </View>
            <View style={ms.summaryStrip}>
              {[
                { emoji: "👶", val: children.length, label: "Children" },
                { emoji: "🎯", val: avgScore, label: "Avg Score" },
                { emoji: "🎙️", val: totalSessions, label: "Sessions" },
                { emoji: "🔥", val: totalStreak, label: "Streaks" },
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

        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6 }}>
          <Text style={ms.sectionTitle}>Your Children 👨‍👩‍👧‍👦</Text>
          <Text style={ms.sectionSub}>Tap any card to view detailed progress & analytics</Text>
        </View>

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

        <View style={ms.safetyCard}>
          <View style={ms.safetyIconWrap}><Ionicons name="shield-checkmark" size={26} color="#7C5CBF" /></View>
          <View style={{ flex: 1 }}>
            <Text style={ms.safetyTitle}>COPPA Compliant 🔒</Text>
            <Text style={ms.safetyText}>Voice recordings are deleted after transcription. Only nicknames and scores are stored.</Text>
          </View>
        </View>

        {children.length > 0 && (
          <TouchableOpacity style={ms.deleteAllBtn} onPress={() => setShowDeleteAll(true)} activeOpacity={0.8}>
            <Ionicons name="warning-outline" size={18} color="#FF3B30" />
            <Text style={ms.deleteAllText}>Delete All Children's Data</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 60 }} />
      </ScrollView>

      <ChildDetailModal child={selectedChild} visible={showDetail} onClose={() => setShowDetail(false)} onDelete={() => deleteChildData(selectedChild?.uid)} />
      <ConfirmModal visible={showDeleteAll} title="Delete ALL Children's Data?" message="This will permanently wipe every session, score, and progress record for ALL your children. This CANNOT be undone." onCancel={() => setShowDeleteAll(false)} onConfirm={() => deleteAllChildrenData()} />
    </View>
  );
}

const ms = StyleSheet.create({
  root: { flex: 1 },
  hero: { paddingHorizontal: 22, paddingBottom: 28, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: "hidden" },
  blobTR: { position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.1)" },
  blobBL: { position: "absolute", bottom: -20, left: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.08)" },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 20, marginBottom: 18 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
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
  emptyState: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 22, fontFamily: "Poppins-ExtraBold", color: "#1A1A2E", marginBottom: 8 },
  emptySub: { fontSize: 15, fontFamily: "Poppins-Medium", color: "#555555", textAlign: "center" },
  safetyCard: { flexDirection: "row", alignItems: "flex-start", gap: 14, backgroundColor: "white", borderRadius: 26, padding: 18, marginHorizontal: 16, marginTop: 8, elevation: 4, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10 },
  safetyIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#EDE8FF", alignItems: "center", justifyContent: "center" },
  safetyTitle: { fontSize: 16, fontFamily: "Poppins-ExtraBold", color: "#1A1A2E", marginBottom: 4 },
  safetyText: { fontSize: 13, fontFamily: "Poppins-Medium", color: "#444444", lineHeight: 20 },
  deleteAllBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, marginTop: 16, paddingVertical: 16, borderRadius: 18, borderWidth: 2, borderColor: "rgba(255,59,48,0.3)", backgroundColor: "rgba(255,59,48,0.06)" },
  deleteAllText: { fontSize: 15, fontFamily: "Poppins-SemiBold", color: "#FF3B30" },
});