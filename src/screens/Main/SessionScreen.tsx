// src/screens/Main/SessionScreen.tsx
import React, { useState, useRef, useEffect } from "react"
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Animated, SafeAreaView, ScrollView, Platform
} from "react-native"
import { VideoView, useVideoPlayer } from "expo-video"
import { Ionicons } from "@expo/vector-icons"
import { BlurView } from "expo-blur"
import { Audio } from "expo-av"
import { LinearGradient } from "expo-linear-gradient"
import { useFirestoreSync } from "../../hooks/useFirestoreSync"
import { getCharacterResponse } from "../../services/openai"
import { getCharacterAudio } from "../../services/elevenlabs"
import { transcribeAudio } from "../../services/whisper"
import { analyzeExchange, calculateExchangeScore, getSessionTip } from "../../services/scoring"
import type { ExchangeMetrics } from "../../services/scoring"

const { width, height } = Dimensions.get("window")

const CHAR_ASSETS: Record<string, { idle: any; talking: any }> = {
  zara: {
    idle: require("../../../assets/videos/zara/zara_idle.mp4"),
    talking: require("../../../assets/videos/zara/zara_talking.mp4"),
  },
  robo: {
    idle: require("../../../assets/videos/robo_bhaya/robo_idle.mp4"),
    talking: require("../../../assets/videos/robo_bhaya/robo_talking.mp4"),
  },
  ustad: {
    idle: require("../../../assets/videos/ustad_sahab/ustad_idle.mp4"),
    talking: require("../../../assets/videos/ustad_sahab/ustad_talking.mp4"),
  },
}

const MAX_EXCHANGES = 3

export default function SessionScreen({ navigation, route }: any) {
  const { character, childName } = route.params || {}
  const charId = character?.id && CHAR_ASSETS[character.id] ? character.id : "zara"
  const themeColor = character?.buttonColor || "#7C5CBF"
  const activeAssets = CHAR_ASSETS[charId]

  const [status, setStatus] = useState<"idle" | "listening" | "thinking" | "talking">("idle")
  const [chat, setChat] = useState<{ role: string; text: string }[]>([])
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [openingShown, setOpeningShown] = useState(false)
  const [exchangeCount, setExchangeCount] = useState(0)
  const [showChat, setShowChat] = useState(false)
  const [exchangeMetrics, setExchangeMetrics] = useState<ExchangeMetrics[]>([])
  const [exchangeScores, setExchangeScores] = useState<number[]>([])
  const talkingEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useFirestoreSync(navigation)

  const talkOpacity = useRef(new Animated.Value(0)).current
  const micScale = useRef(new Animated.Value(1)).current
  const micGlow = useRef(new Animated.Value(0)).current
  const pulseLoop = useRef<any>(null)
  const scrollRef = useRef<ScrollView>(null)

  const idlePlayer = useVideoPlayer(activeAssets.idle, (p) => {
    p.loop = true
    p.muted = true
    try { p.play() } catch (e) {}
  })

  const talkPlayer = useVideoPlayer(activeAssets.talking, (p) => {
    p.loop = true
    p.muted = true
  })

  useEffect(() => {
    if (status === "talking") {
      try { talkPlayer.play() } catch (e) {}
      Animated.timing(talkOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start()
    } else {
      Animated.timing(talkOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        try { talkPlayer.pause() } catch (e) {}
      })
    }
  }, [status])

  useEffect(() => {
    return () => {
      if (sound) { try { sound.unloadAsync() } catch (e) {} }
      if (recording) { try { recording.stopAndUnloadAsync() } catch (e) {} }
    }
  }, [sound, recording])

  useEffect(() => {
    if (!openingShown) {
      const openings: Record<string, string> = {
        zara: `Yaar ${childName}! Finally you're here! Bolo — kya chal raha hai? 😄`,
        robo: `BEEP BOOP! Hello ${childName}! Ready for an EPIC conversation? 🤖`,
        ustad: `Aaao beta, baithao. ${childName} — bahut pyaara naam hai. Ready ho? ☕`,
      }
      setTimeout(() => {
        setChat([{ role: "ai", text: openings[charId] || openings.zara }])
        setOpeningShown(true)
      }, 600)
    }
  }, [])

  const startMicPulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(micScale, { toValue: 1.15, duration: 700, useNativeDriver: true }),
          Animated.timing(micGlow, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(micScale, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(micGlow, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]),
      ])
    )
    pulseLoop.current.start()
  }

  const stopMicPulse = () => {
    pulseLoop.current?.stop()
    Animated.parallel([
      Animated.timing(micScale, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(micGlow, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start()
  }

  const handlePressIn = async () => {
    try {
      if (recording) {
        try { await recording.stopAndUnloadAsync() } catch (e) {}
        setRecording(null)
      }
      const { status: perm } = await Audio.requestPermissionsAsync()
      if (perm !== "granted") return
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
      const { recording: newRec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
      setRecording(newRec)
      setStatus("listening")
      startMicPulse()
    } catch (err) {
      setStatus("idle")
    }
  }

  const handlePressOut = async () => {
    if (!recording) { setStatus("idle"); return }
    stopMicPulse()
    setStatus("thinking")

    try {
      await recording.stopAndUnloadAsync()
      const uri = recording.getURI()
      setRecording(null)
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true })
      if (!uri) { setStatus("idle"); return }

      const userSpeech = await transcribeAudio(uri)
      const finalText = userSpeech || "I want to talk"

      // Analyze speech
      const metrics = analyzeExchange(finalText)
      const score = calculateExchangeScore(metrics)
      const newMetrics = [...exchangeMetrics, metrics]
      const newScores = [...exchangeScores, score]
      setExchangeMetrics(newMetrics)
      setExchangeScores(newScores)

      const updatedChat = [...chat, { role: "user", text: finalText }]
      setChat(updatedChat)

      const aiText = await getCharacterResponse(finalText, charId, childName, updatedChat)
      const finalChat = [...updatedChat, { role: "ai", text: aiText }]
      setChat(finalChat)

      const newCount = exchangeCount + 1
      setExchangeCount(newCount)

      const base64Audio = await getCharacterAudio(aiText, charId)
      if (base64Audio) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: base64Audio }, { shouldPlay: true }
        )
        setSound(newSound)
        setStatus("talking")
        newSound.setOnPlaybackStatusUpdate((ps) => {
          if (ps.isLoaded && ps.didJustFinish) {
            newSound.unloadAsync()
            if (newCount >= MAX_EXCHANGES) {
              // Go to session complete
              navigation.navigate("SessionComplete", {
                childName,
                character,
                exchangeScores: newScores,
                exchangeMetrics: newMetrics,
                sessionTip: getSessionTip(newMetrics),
              })
            } else {
              setStatus("idle")
            }
          }
        })
      } else {
        setStatus("talking")
        const readMs = Math.min(8000, Math.max(2500, aiText.length * 45))
        talkingEndTimer.current = setTimeout(() => {
          if (newCount >= MAX_EXCHANGES) {
            navigation.navigate("SessionComplete", {
              childName, character,
              exchangeScores: newScores,
              exchangeMetrics: newMetrics,
              sessionTip: getSessionTip(newMetrics),
            })
          } else {
            setStatus("idle")
          }
        }, readMs)
      }

      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
    } catch (error) {
      setStatus("idle")
    }
  }

  const lastTwoMessages = chat.slice(-2)
  const glowColor = micGlow.interpolate({ inputRange: [0, 1], outputRange: ['transparent', themeColor + '60'] })

  return (
    <View style={styles.root}>
      {/* ── CHARACTER TOP HALF ── */}
      <View style={[styles.topHalf]}>
        {/* Idle Video */}
        <VideoView player={idlePlayer} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />

        {/* Talking overlay */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: talkOpacity }]}>
          <VideoView player={talkPlayer} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
        </Animated.View>

        {/* Top gradient overlay */}
        <LinearGradient
          colors={["rgba(0,0,0,0.35)", "transparent"]}
          style={[StyleSheet.absoluteFill, { height: 120 }]}
          pointerEvents="none"
        />

        {/* Bottom fade to white */}
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.08)", "#FFFFFF"]}
          style={styles.bottomFade}
          locations={[0.55, 0.85, 1]}
          pointerEvents="none"
        />

        {/* Header bar */}
        <SafeAreaView style={styles.headerOverlay}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={20} color="white" />
            </TouchableOpacity>

            <BlurView intensity={30} tint="dark" style={styles.charNamePill}>
              <Text style={styles.charNameText}>{character?.name || "Zara"}</Text>
            </BlurView>

            <BlurView intensity={30} tint="dark" style={styles.counterPill}>
              <Text style={[styles.counterText, { color: themeColor }]}>{exchangeCount}/{MAX_EXCHANGES}</Text>
            </BlurView>
          </View>
        </SafeAreaView>

        {/* State chip */}
        {status !== "idle" && (
          <View style={[styles.stateChip, { backgroundColor: themeColor }]}>
            <Text style={styles.stateChipText}>
              {status === "listening" ? "👂 Listening..." :
               status === "thinking"  ? "🤔 Thinking..."  :
               "💬 Speaking..."}
            </Text>
          </View>
        )}
      </View>

      {/* ── BOTTOM HALF ── */}
      <View style={styles.bottomHalf}>

        {/* Last messages — compact, always visible */}
        <View style={styles.messagesPreview}>
          {lastTwoMessages.length === 0 ? (
            <View style={styles.hintMsg}>
              <Text style={styles.hintMsgText}>Hold the mic and start speaking! 🎙️</Text>
            </View>
          ) : (
            lastTwoMessages.map((msg, i) => (
              <View key={i} style={[
                styles.msgRow,
                msg.role === "ai" ? styles.aiRow : styles.userRow
              ]}>
                <View style={[
                  styles.msgBubble,
                  msg.role === "ai"
                    ? [styles.aiBubble, { borderLeftColor: themeColor }]
                    : [styles.userBubble, { backgroundColor: themeColor + "20" }]
                ]}>
                  <Text style={[
                    styles.msgBubbleText,
                    msg.role === "user" && { color: "#555" }
                  ]} numberOfLines={3}>
                    {msg.text}
                  </Text>
                </View>
              </View>
            ))
          )}

          {status === "thinking" && (
            <View style={[styles.msgRow, styles.aiRow]}>
              <View style={[styles.msgBubble, styles.aiBubble, { borderLeftColor: themeColor }]}>
                <ThinkingDots color={themeColor} />
              </View>
            </View>
          )}
        </View>

        {/* See full chat toggle */}
        {chat.length > 2 && (
          <TouchableOpacity style={styles.seeAllBtn} onPress={() => setShowChat(!showChat)}>
            <Text style={[styles.seeAllText, { color: themeColor }]}>
              {showChat ? "Hide chat ↑" : `See all ${chat.length} messages ↓`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Full chat expandable */}
        {showChat && (
          <ScrollView
            ref={scrollRef}
            style={[styles.fullChat, { maxHeight: height * 0.2 }]}
            showsVerticalScrollIndicator={false}
          >
            {chat.map((msg, i) => (
              <View key={i} style={[styles.msgRow, msg.role === "ai" ? styles.aiRow : styles.userRow]}>
                <View style={[
                  styles.msgBubble,
                  msg.role === "ai"
                    ? [styles.aiBubble, { borderLeftColor: themeColor }]
                    : [styles.userBubble, { backgroundColor: themeColor + "20" }]
                ]}>
                  <Text style={[styles.msgBubbleText, msg.role === "user" && { color: "#555" }]}>
                    {msg.text}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Mic Area */}
        <View style={styles.micArea}>
          {/* Progress dots */}
          <View style={styles.progressDots}>
            {Array.from({ length: MAX_EXCHANGES }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i < exchangeCount
                    ? { backgroundColor: themeColor, width: 24 }
                    : { backgroundColor: "#E0E0E0", width: 8 }
                ]}
              />
            ))}
          </View>

          <Text style={styles.hintText}>
            {status === "idle"      ? "Hold to speak 🎙️"        :
             status === "listening" ? "Release when done ✋"     :
             status === "thinking"  ? `${character?.name} is thinking...` :
                                      `${character?.name} is speaking...`}
          </Text>

          {/* Mic with glow rings */}
          <View style={styles.micWrapper}>
            <Animated.View style={[styles.glowRing, {
              borderColor: themeColor,
              opacity: micGlow,
              transform: [{ scale: micScale }],
            }]} />
            <Animated.View style={{ transform: [{ scale: micScale }] }}>
              <TouchableOpacity
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={status === "thinking" || status === "talking"}
                style={[
                  styles.micBtn,
                  { backgroundColor: status === "listening" ? "#FF3B30" : themeColor },
                  (status === "thinking" || status === "talking") && { opacity: 0.5 }
                ]}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={status === "listening" ? "stop" : "mic"}
                  size={32}
                  color="white"
                />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  )
}

function ThinkingDots({ color }: { color: string }) {
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ]
  useEffect(() => {
    dots.forEach((dot, i) => {
      Animated.loop(Animated.sequence([
        Animated.delay(i * 200),
        Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ])).start()
    })
  }, [])
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center", height: 20 }}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={{
          width: 8, height: 8, borderRadius: 4,
          backgroundColor: color, opacity: dot,
          transform: [{ scale: dot }],
        }} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  topHalf: {
    height: height * 0.52,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
  },
  bottomFade: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: 100,
  },
  headerOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 44 : 8,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  charNamePill: {
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, overflow: "hidden",
  },
  charNameText: {
    color: "white", fontSize: 16,
    fontFamily: "Poppins-Bold",
  },
  counterPill: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 12, overflow: "hidden",
  },
  counterText: { fontSize: 13, fontFamily: "Poppins-Bold" },
  stateChip: {
    position: "absolute",
    bottom: 52,
    alignSelf: "center",
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20,
  },
  stateChipText: {
    color: "white", fontSize: 12,
    fontFamily: "Poppins-SemiBold",
  },
  bottomHalf: {
    flex: 1, backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  messagesPreview: {
    gap: 8,
    minHeight: 80,
  },
  hintMsg: {
    backgroundColor: "#F5F5F5",
    borderRadius: 16, padding: 14,
    alignSelf: "flex-start", maxWidth: "85%",
  },
  hintMsgText: {
    fontSize: 14, fontFamily: "Poppins-Medium",
    color: "#888888",
  },
  msgRow: { marginBottom: 4 },
  aiRow: { alignSelf: "flex-start", maxWidth: "88%" },
  userRow: { alignSelf: "flex-end", maxWidth: "75%" },
  msgBubble: { borderRadius: 18, padding: 12 },
  aiBubble: {
    backgroundColor: "#F5F5F5",
    borderTopLeftRadius: 4,
    borderLeftWidth: 3,
  },
  userBubble: {
    borderTopRightRadius: 4,
  },
  msgBubbleText: {
    fontSize: 14, fontFamily: "Poppins-Medium",
    color: "#2D2D2D", lineHeight: 20,
  },
  seeAllBtn: {
    alignSelf: "center",
    paddingVertical: 6,
  },
  seeAllText: {
    fontSize: 12, fontFamily: "Poppins-SemiBold",
  },
  fullChat: { marginBottom: 4 },
  micArea: {
    alignItems: "center",
    paddingBottom: Platform.OS === "ios" ? 24 : 20,
    paddingTop: 8,
    gap: 6,
    marginTop: "auto",
  },
  progressDots: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    marginBottom: 4,
  },
  progressDot: {
    height: 8, borderRadius: 4,
  },
  hintText: {
    fontSize: 12, fontFamily: "Poppins-Medium",
    color: "#AAAAAA",
  },
  micWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 90, height: 90,
  },
  glowRing: {
    position: "absolute",
    width: 86, height: 86,
    borderRadius: 43, borderWidth: 2.5,
  },
  micBtn: {
    width: 70, height: 70, borderRadius: 35,
    alignItems: "center", justifyContent: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.25, shadowRadius: 10,
  },
})