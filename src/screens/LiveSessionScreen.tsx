import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Headphones, LightBulb, Spark, Square } from "../components/Icons";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { theme } from "../theme";
import { CoachSuggestion, GraphFact, RootStackParamList, TranscriptTurn } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "LiveSession">;

// ── Waveform bar animation ──────────────────────────────────────────────
function WaveBar({ delay, active }: { delay: number; active: boolean }) {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    if (!active) {
      Animated.timing(anim, { toValue: 0.3, duration: 300, useNativeDriver: true }).start();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 400 + delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 400 + delay, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, delay, anim]);

  return (
    <Animated.View
      style={[
        styles.waveBar,
        { transform: [{ scaleY: anim }], opacity: active ? 0.7 : 0.25 },
      ]}
    />
  );
}

// ── Pulsing circle ──────────────────────────────────────────────────────
function PulsingCircle({ active }: { active: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.35, duration: 1200, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, scale, opacity]);

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        { transform: [{ scale }], opacity },
      ]}
    />
  );
}

// ── Chat Bubble ─────────────────────────────────────────────────────────
function ChatBubble({ turn }: { turn: TranscriptTurn }) {
  const isUser = turn.speaker === "user";
  const isCoach = turn.speaker === "coach";
  const label = isUser ? "You" : isCoach ? "AI" : "Her";
  const time = new Date(turn.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const bubbleStyle = isUser
    ? styles.youBubble
    : isCoach
    ? styles.coachBubble
    : styles.herBubble;

  const labelColor = isUser
    ? "#6390FF"
    : isCoach
    ? theme.colors.green
    : theme.colors.accentStrong;

  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowRight]}>
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: isCoach ? "rgba(74, 222, 128, 0.15)" : "rgba(168, 139, 255, 0.15)" }]}>
          <Text style={[styles.avatarText, { color: labelColor }]}>{label[0]}</Text>
        </View>
      )}
      <View style={[styles.bubble, bubbleStyle, isUser && { marginLeft: 48 }, !isUser && { marginRight: 48 }]}>
        <View style={styles.bubbleMeta}>
          <Text style={[styles.bubbleLabel, { color: labelColor }]}>{label}</Text>
          <Text style={styles.bubbleTime}>{time}</Text>
        </View>
        <Text style={styles.bubbleText}>{turn.text}</Text>
      </View>
      {isUser && (
        <View style={[styles.avatar, { backgroundColor: "rgba(99, 144, 255, 0.15)" }]}>
          <Text style={[styles.avatarText, { color: "#6390FF" }]}>Y</Text>
        </View>
      )}
    </View>
  );
}

// ── Key Moment Card ─────────────────────────────────────────────────────
function KeyMomentCard({ fact }: { fact: GraphFact }) {
  return (
    <View style={styles.factCard}>
      <Text style={styles.factSubject}>{fact.subject}</Text>
      <Text style={styles.factRelation}>{fact.relation}</Text>
      <Text style={styles.factObject}>{fact.object}</Text>
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────
export function LiveSessionScreen({ navigation, route }: Props) {
  const { accessToken } = useAuth();
  const sessionId = route.params.sessionId;

  const [listening, setListening] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [suggestions, setSuggestions] = useState<CoachSuggestion[]>([]);
  const [facts, setFacts] = useState<GraphFact[]>([]);
  const [activeTab, setActiveTab] = useState<"transcript" | "moments">("transcript");
  const [elapsed, setElapsed] = useState(0);
  const [ended, setEnded] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const listeningRef = useRef(false);
  const chunkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextChunkRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Timer
  useEffect(() => {
    tickRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  useEffect(() => {
    return () => {
      if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current);
      if (nextChunkRef.current) clearTimeout(nextChunkRef.current);
    };
  }, []);

  const formatTime = (s: number) => {
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  // ── Audio recording logic ──
  const startListening = useCallback(async () => {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) return;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    listeningRef.current = true;
    setListening(true);
    recordChunk();
  }, []);

  const recordChunk = useCallback(async () => {
    if (sessionId === "demo" || recorder.isRecording) return;
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      chunkTimerRef.current = setTimeout(() => void stopChunk(), 7800);
    } catch (e) {
      console.error("Record chunk error:", e);
    }
  }, [sessionId, recorder]);

  const stopChunk = useCallback(async () => {
    if (!recorder.isRecording) return;
    try {
      if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current);
      await recorder.stop();
      if (!recorder.uri) return;
      setUploading(true);
      const res = await api.uploadAudio(sessionId, recorder.uri, accessToken);
      if (res.newTurns && res.newTurns.length > 0) {
        setTranscript((prev) => [...prev, ...res.newTurns!]);
      } else if (res.transcript) {
        setTranscript((prev) => [...prev, res.transcript!]);
      }
      if (res.suggestions) setSuggestions(res.suggestions);
      if (res.facts) setFacts((prev) => {
        const map = new Map(prev.map((f) => [`${f.subject}:${f.relation}:${f.object}`, f]));
        for (const f of res.facts!) map.set(`${f.subject}:${f.relation}:${f.object}`, f);
        return [...map.values()];
      });
    } catch (e) {
      console.error("Upload error:", e);
    } finally {
      setUploading(false);
      if (listeningRef.current) {
        nextChunkRef.current = setTimeout(() => void recordChunk(), 300);
      }
    }
  }, [sessionId, recorder, accessToken, recordChunk]);

  const pauseListening = useCallback(async () => {
    listeningRef.current = false;
    if (nextChunkRef.current) clearTimeout(nextChunkRef.current);
    setListening(false);
    await stopChunk();
  }, [stopChunk]);

  const endDate = useCallback(async () => {
    listeningRef.current = false;
    if (nextChunkRef.current) clearTimeout(nextChunkRef.current);
    setListening(false);
    if (tickRef.current) clearInterval(tickRef.current);
    if (recorder.isRecording) await stopChunk();
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Tabs");
    }
  }, [sessionId, recorder, accessToken, stopChunk, navigation]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcript.length > 0 && activeTab === "transcript") {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [transcript.length, activeTab]);

  const currentSuggestion = suggestions[suggestions.length - 1];

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#090A0F", "#0E1018", "#090A0F"]} style={StyleSheet.absoluteFill} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("Tabs");
            }
          }}
          style={styles.backBtn}
        >
          <ChevronLeft size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Live Session</Text>
          <View style={styles.headerSub}>
            <View style={[styles.statusDot, listening && styles.statusDotActive]} />
            <Text style={styles.headerSubText}>
              {listening ? "AI Coaching Active" : "Ready to listen"}
            </Text>
          </View>
        </View>
        <Pressable onPress={endDate} style={styles.endBtn}>
          <Square size={12} color={theme.colors.red} />
          <Text style={styles.endBtnText}>End Date</Text>
        </Pressable>
      </View>

      {/* ── Listening Visualization ── */}
      <View style={styles.vizCard}>
        <Text style={styles.vizTitle}>
          {listening ? "AI is listening..." : "Tap to start listening"}
        </Text>
        <View style={styles.vizCenter}>
          {/* Waveform left */}
          <View style={styles.waveGroup}>
            {[80, 40, 120, 60, 100].map((d, i) => (
              <WaveBar key={`l${i}`} delay={d} active={listening} />
            ))}
          </View>

          {/* Center mic circle */}
          <Pressable onPress={listening ? pauseListening : startListening} style={styles.micOuter}>
            <PulsingCircle active={listening} />
            <View style={[styles.micInner, listening && styles.micInnerActive]}>
              <Headphones size={28} color={listening ? "#fff" : theme.colors.muted} />
            </View>
          </Pressable>

          {/* Waveform right */}
          <View style={styles.waveGroup}>
            {[100, 60, 120, 40, 80].map((d, i) => (
              <WaveBar key={`r${i}`} delay={d} active={listening} />
            ))}
          </View>
        </View>

        <Text style={styles.timer}>{formatTime(elapsed)}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDotSmall, listening && styles.statusDotSmallActive]} />
          <Text style={styles.statusText}>
            {listening
              ? "Building context • Providing live suggestions"
              : uploading
              ? "Processing audio..."
              : "Tap the circle to begin"}
          </Text>
        </View>
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabs}>
        <Pressable
          onPress={() => setActiveTab("transcript")}
          style={[styles.tab, activeTab === "transcript" && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === "transcript" && styles.tabTextActive]}>
            Transcript
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("moments")}
          style={[styles.tab, activeTab === "moments" && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === "moments" && styles.tabTextActive]}>
            Key Moments
          </Text>
          {facts.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{facts.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* ── Content ── */}
      {activeTab === "transcript" ? (
        <FlatList
          ref={flatListRef}
          data={transcript}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatBubble turn={item} />}
          contentContainerStyle={styles.chatList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {listening
                  ? "Listening... transcript will appear here"
                  : "Start listening to see the conversation transcript"}
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={facts}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => <KeyMomentCard fact={item} />}
          contentContainerStyle={styles.chatList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Key moments will be extracted as the conversation progresses</Text>
            </View>
          }
        />
      )}

      {/* ── AI Suggestion Footer ── */}
      <View style={styles.footer}>
        {uploading ? (
          <View style={styles.suggestionRow}>
            <View style={styles.suggestionIconWrap}>
              <Spark size={16} color={theme.colors.accentStrong} />
              <Spark size={12} color={theme.colors.accent} />
            </View>
            <Text style={styles.suggestionThinking}>AI is thinking of a suggestion...</Text>
            <ActivityIndicator size="small" color={theme.colors.accent} />
          </View>
        ) : currentSuggestion ? (
          <View style={styles.suggestionRow}>
            <View style={styles.suggestionIconWrap}>
              <Spark size={16} color={theme.colors.accentStrong} />
              <Spark size={12} color={theme.colors.accent} />
            </View>
            <View style={styles.suggestionContent}>
              <Text style={styles.suggestionTitle}>{currentSuggestion.title}</Text>
              <Text style={styles.suggestionDetail} numberOfLines={2}>{currentSuggestion.detail}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.suggestionRow}>
            <View style={styles.suggestionIconWrap}>
              <Spark size={16} color={theme.colors.subtle} />
            </View>
            <Text style={styles.suggestionThinking}>Suggestions will appear after your first audio clip</Text>
          </View>
        )}
        <View style={styles.tipRow}>
          <LightBulb size={14} color={theme.colors.amber} />
          <Text style={styles.tipText}>Tip: Ask follow-up questions to learn more</Text>
        </View>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 12,
  },
  backBtn: { padding: 8 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "800" },
  headerSub: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  headerSubText: { color: theme.colors.muted, fontSize: 12, fontWeight: "600" },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.subtle },
  statusDotActive: { backgroundColor: theme.colors.green },
  endBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.redSoft,
    borderRadius: theme.radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 107, 107, 0.3)",
  },
  endBtnText: { color: theme.colors.red, fontSize: 13, fontWeight: "800" },

  // Visualization
  vizCard: {
    alignItems: "center",
    paddingVertical: 20,
    marginHorizontal: 16,
    backgroundColor: "rgba(21, 24, 36, 0.5)",
    borderRadius: theme.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  vizTitle: { color: theme.colors.muted, fontSize: 14, fontWeight: "700", marginBottom: 16 },
  vizCenter: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 16 },
  waveGroup: { flexDirection: "row", alignItems: "center", gap: 3, height: 40 },
  waveBar: {
    width: 3,
    height: 30,
    borderRadius: 2,
    backgroundColor: "rgba(168, 139, 255, 0.5)",
  },
  micOuter: { width: 80, height: 80, alignItems: "center", justifyContent: "center" },
  pulseRing: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: theme.colors.green,
  },
  micInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    borderWidth: 2,
    borderColor: "rgba(74, 222, 128, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  micInnerActive: {
    backgroundColor: "rgba(74, 222, 128, 0.2)",
    borderColor: theme.colors.green,
  },
  timer: { color: theme.colors.text, fontSize: 28, fontWeight: "900", letterSpacing: 1 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  statusDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.subtle },
  statusDotSmallActive: { backgroundColor: theme.colors.green },
  statusText: { color: theme.colors.muted, fontSize: 12, fontWeight: "600" },

  // Tabs
  tabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    marginRight: 24,
    gap: 6,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: theme.colors.text },
  tabText: { color: theme.colors.subtle, fontSize: 14, fontWeight: "800" },
  tabTextActive: { color: theme.colors.text },
  badge: {
    backgroundColor: theme.colors.accentStrong,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "900" },

  // Chat
  chatList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  bubbleRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12, gap: 8 },
  bubbleRowRight: { justifyContent: "flex-end" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  avatarText: { fontSize: 14, fontWeight: "900" },
  bubble: {
    borderRadius: 16,
    padding: 12,
    maxWidth: "75%",
    borderWidth: StyleSheet.hairlineWidth,
  },
  herBubble: {
    backgroundColor: theme.colors.herBubble,
    borderColor: theme.colors.herBorder,
    borderTopLeftRadius: 4,
  },
  youBubble: {
    backgroundColor: theme.colors.youBubble,
    borderColor: theme.colors.youBorder,
    borderTopRightRadius: 4,
  },
  coachBubble: {
    backgroundColor: theme.colors.coachBubble,
    borderColor: theme.colors.coachBorder,
    borderTopLeftRadius: 4,
  },
  bubbleMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  bubbleLabel: { fontSize: 12, fontWeight: "900" },
  bubbleTime: { color: theme.colors.subtle, fontSize: 11 },
  bubbleText: { color: theme.colors.text, fontSize: 14, lineHeight: 20 },

  // Key moments
  factCard: {
    backgroundColor: "rgba(21, 24, 36, 0.7)",
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 10,
    gap: 4,
  },
  factSubject: { color: theme.colors.accent, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  factRelation: { color: theme.colors.muted, fontSize: 13, fontWeight: "700" },
  factObject: { color: theme.colors.text, fontSize: 16, fontWeight: "800" },

  // Empty
  emptyState: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 32 },
  emptyText: { color: theme.colors.subtle, fontSize: 14, textAlign: "center", lineHeight: 20 },

  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 34,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    backgroundColor: "rgba(14, 16, 24, 0.95)",
  },
  suggestionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  suggestionIconWrap: { flexDirection: "row", alignItems: "center", gap: -4 },
  suggestionContent: { flex: 1, gap: 2 },
  suggestionTitle: { color: theme.colors.text, fontSize: 13, fontWeight: "800" },
  suggestionDetail: { color: theme.colors.muted, fontSize: 12, lineHeight: 16 },
  suggestionThinking: { color: theme.colors.muted, fontSize: 13, flex: 1 },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    justifyContent: "center",
  },
  tipText: { color: theme.colors.subtle, fontSize: 12 },
});
