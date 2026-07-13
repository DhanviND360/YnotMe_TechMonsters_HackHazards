import React, { useEffect, useState, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Ellipsis, Coffee, LightBulb } from "../components/Icons";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { KnowledgeGraph } from "../components/KnowledgeGraph";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { theme } from "../theme";
import { DateSession, RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "DateDetail">;

// ── Circular Score Ring ──────────────────────────────────────────────────
function CircularScore({ score }: { score: number }) {
  const ratingText = score >= 85 ? "Superb" : score >= 75 ? "Great" : "Good";
  const progress = (score / 100) * 100;
  
  return (
    <View style={styles.scoreOuter}>
      <View style={styles.scoreRing}>
        <Text style={styles.scoreNum}>{score}</Text>
        <Text style={styles.scoreLabel}>{ratingText}</Text>
      </View>
    </View>
  );
}

// ── Flashcard Item Component ─────────────────────────────────────────────
function FlashcardItem({ front, back }: { front: string; back: string }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <Pressable onPress={() => setFlipped(!flipped)} style={styles.flashcardWrapper}>
      <Card style={StyleSheet.flatten([styles.flashcardInner, flipped ? styles.flashcardFlipped : null])}>
        <View style={styles.flashHeader}>
          <Text style={[styles.flashLabel, { color: flipped ? theme.colors.green : theme.colors.accentStrong }]}>
            {flipped ? "Memory Answer" : "Memory Cue"}
          </Text>
          <View style={[styles.flashDot, { backgroundColor: flipped ? theme.colors.green : theme.colors.accentStrong }]} />
        </View>
        <Text style={styles.flashText}>{flipped ? back : front}</Text>
        <Text style={styles.flashAction}>Tap to reveal {flipped ? "cue" : "fact"}</Text>
      </Card>
    </Pressable>
  );
}

// ── Date Detail Screen ────────────────────────────────────────────────────
export function DateDetailScreen({ navigation, route }: Props) {
  const { accessToken } = useAuth();
  const { sessionId } = route.params;

  const [session, setSession] = useState<DateSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "flashcards" | "transcript" | "analysis">("flashcards");
  const [subTab, setSubTab] = useState<"graph" | "flash">("graph");

  useEffect(() => {
    setLoading(true);
    api
      .listSessions(accessToken)
      .then((d) => {
        const found = d.sessions.find((s) => s.id === sessionId);
        if (found) {
          setSession(found);
        } else {
          // Mock preview data if not found or demo mode
          setSession({
            id: sessionId,
            title: "Coffee & Conversations",
            status: "ended",
            createdAt: new Date().toISOString(),
            summary: "A warm first conversation with strong listening moments. You discovered travel goals, food preferences, and a shared interest in slow weekend routines.",
            transcript: [
              { id: "t1", speaker: "date", text: "I'm really into travel. Last year I spent a month in Japan and it was magical ✨", timestamp: new Date().toISOString() },
              { id: "t2", speaker: "user", text: "That's amazing! What was your favorite place there?", timestamp: new Date().toISOString() },
              { id: "t3", speaker: "date", text: "Kyoto, for sure. The culture, the food, everything felt so peaceful.", timestamp: new Date().toISOString() }
            ],
            suggestions: [],
            facts: [
              { subject: "Her", relation: "Likes", object: "Coffee", confidence: 0.94 },
              { subject: "Her", relation: "Likes", object: "Roses", confidence: 0.88 },
              { subject: "Her", relation: "Likes", object: "Golden Retriever", confidence: 0.95 },
              { subject: "Her", relation: "Likes", object: "Italian Food", confidence: 0.89 },
              { subject: "Her", relation: "Dislikes", object: "Rude People", confidence: 0.91 },
              { subject: "Her", relation: "Dislikes", object: "Spicy Food", confidence: 0.85 },
              { subject: "Her", relation: "Interests", object: "Photography", confidence: 0.92 },
              { subject: "Her", relation: "Interests", object: "Reading", confidence: 0.9 },
              { subject: "Her", relation: "Interests", object: "Indie Music", confidence: 0.87 },
              { subject: "Her", relation: "Values", object: "Honesty", confidence: 0.96 },
              { subject: "Her", relation: "Values", object: "Kindness", confidence: 0.93 }
            ],
            flashcards: [
              { front: "Her favorite beverage?", back: "Coffee (specifically slow mornings)" },
              { front: "Dream flower preference?", back: "Roses (loves classic details)" },
              { front: "Her ideal companion pet?", back: "Golden Retriever" },
              { front: "Must-visit dream travel spot?", back: "Japan during spring" }
            ],
            analysis: {
              conversationScore: 82,
              confidenceScore: 78,
              listeningScore: 88,
              balance: 62,
              elo: 1420,
              missedOpportunities: ["Ask one deeper feeling-based follow-up after a concrete preference."],
              greatResponses: ["You kept the conversation anchored to her interests instead of rushing to perform."],
              betterMoves: [{ blunder: "That's nice, I like that too.", bestMove: "What made that become your thing?" }],
              tips: ["Mirror one keyword before asking your next question.", "Let personal details become future plans, not trivia."]
            }
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken, sessionId]);

  const fallbackAnalysis = useMemo(() => {
    return session?.analysis ?? {
      conversationScore: 82,
      confidenceScore: 78,
      listeningScore: 88,
      balance: 62,
      elo: 1420,
      missedOpportunities: ["Ask one deeper feeling-based follow-up after a concrete preference."],
      greatResponses: ["You kept the conversation anchored to her interests instead of rushing to perform."],
      betterMoves: [{ blunder: "That's nice, I like that too.", bestMove: "What made that become your thing?" }],
      tips: ["Mirror one keyword before asking your next question.", "Let personal details become future plans, not trivia."]
    };
  }, [session]);

  const dynamicTakeaways = useMemo(() => {
    if (session?.facts && session.facts.length > 0) {
      return session.facts.slice(0, 3).map((f) => {
        const relation = f.relation.toLowerCase();
        const subject = f.subject === "Her" ? "She" : f.subject;
        return `${subject} ${relation} ${f.object}.`;
      });
    }
    return [
      "Loves meaningful conversations over small talk.",
      "Dreams of visiting Switzerland and Iceland.",
      "Has a soft spot for dogs and cozy places."
    ];
  }, [session?.facts]);

  const dynamicMoments = useMemo(() => {
    if (session?.facts && session.facts.length > 0) {
      const times = ["05:14", "12:30", "18:45"];
      const tags = ["Travel", "Interest", "Personal", "Values"];
      const colors = [theme.colors.green, theme.colors.accentStrong, theme.colors.red, "#6390FF"];
      const bgColors = ["rgba(74, 222, 128, 0.1)", "rgba(168, 139, 255, 0.1)", "rgba(255, 107, 107, 0.1)", "rgba(99, 144, 255, 0.1)"];
      
      return session.facts.slice(0, 3).map((f, i) => {
        const tag = tags[i % tags.length];
        const color = colors[i % colors.length];
        const bg = bgColors[i % bgColors.length];
        return {
          time: times[i % times.length],
          text: `She shared detail about: ${f.object}`,
          tag,
          color,
          bg
        };
      });
    }
    return [
      { time: "07:21", text: "She talked about her solo trip to Japan.", tag: "Travel", color: theme.colors.green, bg: "rgba(74, 222, 128, 0.1)" },
      { time: "14:08", text: "Shared her love for indie music.", tag: "Interest", color: theme.colors.accentStrong, bg: "rgba(168, 139, 255, 0.1)" },
      { time: "28:45", text: "Mentioned wanting a golden retriever!", tag: "Personal", color: theme.colors.red, bg: "rgba(255, 107, 107, 0.1)" }
    ];
  }, [session?.facts]);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Tabs");
    }
  };

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.errorText}>Session not found</Text>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screenPadding}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        {/* ── Top Bar ── */}
        <View style={styles.navBar}>
          <Pressable onPress={handleBack} style={styles.navIcon}>
            <ChevronLeft size={22} color={theme.colors.text} />
          </Pressable>
          <Pressable style={styles.navIcon}>
            <Ellipsis size={22} color={theme.colors.text} />
          </Pressable>
        </View>

        {/* ── Header Details ── */}
        <View style={styles.header}>
          <View style={styles.headerProfile}>
            <View style={styles.profileBox}>
              <Coffee size={36} color={theme.colors.accent} />
            </View>
            <View style={styles.profileContent}>
              <Text style={styles.profileTitle}>{session.title}</Text>
              <Text style={styles.profileMeta}>
                {new Date(session.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} • 7:42 PM • 45 min
              </Text>
              <View style={styles.tagRow}>
                <View style={[styles.tag, { backgroundColor: "rgba(74, 222, 128, 0.1)" }]}>
                  <Text style={[styles.tagText, { color: theme.colors.green }]}>Fun</Text>
                </View>
                <View style={[styles.tag, { backgroundColor: "rgba(99, 144, 255, 0.1)" }]}>
                  <Text style={[styles.tagText, { color: "#6390FF" }]}>Deep</Text>
                </View>
              </View>
            </View>
          </View>
          <CircularScore score={fallbackAnalysis.conversationScore} />
        </View>

        {/* ── Tabs Navigator ── */}
        <View style={styles.tabsContainer}>
          {(["overview", "flashcards", "transcript", "analysis"] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            >
              <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Content View based on activeTab ── */}
        {activeTab === "overview" && (
          <View style={styles.tabContent}>
            <Card>
              <Text style={styles.sectionTitle}>Overview</Text>
              <Text style={styles.bodyText}>{session.summary}</Text>
            </Card>
            <Card style={styles.takeawaysCard}>
              <Text style={styles.sectionTitle}>Key Takeaways</Text>
              {dynamicTakeaways.map((takeaway, idx) => {
                const colors = [theme.colors.green, "#6390FF", theme.colors.amber];
                const color = colors[idx % colors.length];
                return (
                  <View key={idx} style={styles.takeawayItem}>
                    <View style={[styles.takeawayDot, { backgroundColor: color }]} />
                    <Text style={styles.takeawayText}>{takeaway}</Text>
                  </View>
                );
              })}
            </Card>
          </View>
        )}

        {activeTab === "flashcards" && (
          <View style={styles.tabContent}>
            {/* Memory Graph / Flashcards Sub-toggle */}
            <View style={styles.subToggleContainer}>
              <Pressable
                onPress={() => setSubTab("graph")}
                style={[styles.subToggleBtn, subTab === "graph" && styles.subToggleBtnActive]}
              >
                <Text style={[styles.subToggleText, subTab === "graph" && styles.subToggleTextActive]}>
                  Memory Graph
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSubTab("flash")}
                style={[styles.subToggleBtn, subTab === "flash" && styles.subToggleBtnActive]}
              >
                <Text style={[styles.subToggleText, subTab === "flash" && styles.subToggleTextActive]}>
                  Flashcards
                </Text>
              </Pressable>
            </View>

            {subTab === "graph" ? (
              <View style={styles.graphContainer}>
                <View style={styles.graphHeader}>
                  <Text style={styles.graphTitle}>Memory Graph</Text>
                  <Text style={styles.graphDesc}>AI extracted insights and connections from this conversation.</Text>
                </View>
                
                {/* ── Knowledge Graph Canvas ── */}
                <KnowledgeGraph facts={session.facts} />

                {/* ── Key Takeaways ── */}
                <Card style={styles.takeawaysCard}>
                  <Text style={styles.sectionTitle}>Key Takeaways</Text>
                  {dynamicTakeaways.map((takeaway, idx) => {
                    const colors = [theme.colors.green, "#6390FF", theme.colors.amber];
                    const color = colors[idx % colors.length];
                    return (
                      <View key={idx} style={styles.takeawayItem}>
                        <View style={[styles.takeawayDot, { backgroundColor: color }]} />
                        <Text style={styles.takeawayText}>{takeaway}</Text>
                      </View>
                    );
                  })}
                </Card>

                {/* ── Top Conversation Moments ── */}
                <Card style={styles.momentsCard}>
                  <View style={styles.momentsHeader}>
                    <Text style={styles.sectionTitle}>Top Conversation Moments</Text>
                    <Pressable>
                      <Text style={styles.seeAllText}>See All</Text>
                    </Pressable>
                  </View>
                  {dynamicMoments.map((moment, idx) => (
                    <View key={idx} style={styles.momentRow}>
                      <Text style={[styles.momentTime, { color: moment.color }]}>{moment.time}</Text>
                      <Text style={styles.momentText}>{moment.text}</Text>
                      <View style={[styles.momentTag, { backgroundColor: moment.bg }]}>
                        <Text style={[styles.momentTagText, { color: moment.color }]}>{moment.tag}</Text>
                      </View>
                    </View>
                  ))}
                </Card>
              </View>
            ) : (
              <View style={styles.flashcardsGrid}>
                {session.flashcards.length > 0 ? (
                  session.flashcards.map((card, idx) => (
                    <FlashcardItem key={idx} front={card.front} back={card.back} />
                  ))
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No flashcards generated yet. Keep the conversation going next time!</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {activeTab === "transcript" && (
          <View style={styles.tabContent}>
            <Card>
              <Text style={styles.sectionTitle}>Replay chat turns</Text>
              {session.transcript.length > 0 ? (
                session.transcript.map((turn) => {
                  const isUser = turn.speaker === "user";
                  const speakerLabel = isUser ? "You" : turn.speaker === "coach" ? "AI Coach" : "Her";
                  return (
                    <View key={turn.id} style={styles.transcriptTurn}>
                      <Text style={[styles.transcriptSpeaker, { color: isUser ? "#6390FF" : theme.colors.accentStrong }]}>
                        {speakerLabel}
                      </Text>
                      <Text style={styles.transcriptText}>{turn.text}</Text>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.bodyText}>Transcript empty</Text>
              )}
            </Card>
          </View>
        )}

        {activeTab === "analysis" && (
          <View style={styles.tabContent}>
            <Card>
              <Text style={styles.sectionTitle}>Blunders vs Best Moves</Text>
              {fallbackAnalysis.betterMoves.map((move, idx) => (
                <View key={idx} style={styles.betterMoveRow}>
                  <View style={styles.blunderBox}>
                    <Text style={styles.betterMoveLabel}>Blunder</Text>
                    <Text style={styles.betterMoveText}>{move.blunder}</Text>
                  </View>
                  <View style={styles.bestMoveBox}>
                    <Text style={styles.betterMoveLabel}>Best Move</Text>
                    <Text style={[styles.betterMoveText, { color: theme.colors.green }]}>{move.bestMove}</Text>
                  </View>
                </View>
              ))}
            </Card>

            <Card style={styles.analysisCard}>
              <Text style={styles.sectionTitle}>Improvement Tips</Text>
              {fallbackAnalysis.tips.map((tip, idx) => (
                <View key={idx} style={styles.tipRow}>
                  <LightBulb size={18} color={theme.colors.amber} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </Card>
          </View>
        )}

      </ScrollView>
    </Screen>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", flex: 1 },
  screenPadding: { paddingHorizontal: 0 },
  errorText: { color: theme.colors.red, fontSize: 16 },
  content: { paddingBottom: 48 },

  // Nav
  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 12,
  },
  navIcon: { padding: 8 },

  // Header Details
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  headerProfile: { flexDirection: "row", gap: 14, flex: 1, marginRight: 12 },
  profileBox: {
    width: 68,
    height: 68,
    borderRadius: theme.radius.md,
    backgroundColor: "rgba(215, 199, 255, 0.08)",
    borderWidth: 1.2,
    borderColor: "rgba(215, 199, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileContent: { justifyContent: "center", gap: 4 },
  profileTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "900" },
  profileMeta: { color: theme.colors.muted, fontSize: 11, fontWeight: "600" },
  tagRow: { flexDirection: "row", gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 10, fontWeight: "900", textTransform: "uppercase" },

  // Circular score ring
  scoreOuter: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3,
    borderColor: theme.colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreRing: { alignItems: "center" },
  scoreNum: { color: theme.colors.text, fontSize: 16, fontWeight: "900" },
  scoreLabel: { color: theme.colors.green, fontSize: 8, fontWeight: "800", textTransform: "uppercase" },

  // Tab switcher
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 12,
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.accentStrong,
  },
  tabBtnText: { color: theme.colors.subtle, fontSize: 13, fontWeight: "800" },
  tabBtnTextActive: { color: theme.colors.text },

  // Sub tabs selection
  subToggleContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(215, 199, 255, 0.06)",
    borderRadius: theme.radius.sm,
    padding: 3,
    marginHorizontal: 16,
    marginBottom: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  subToggleBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: theme.radius.sm - 2,
  },
  subToggleBtnActive: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  subToggleText: { color: theme.colors.muted, fontSize: 13, fontWeight: "800" },
  subToggleTextActive: { color: theme.colors.text },

  // Content block
  tabContent: { gap: 16 },
  bodyText: { color: theme.colors.muted, fontSize: 14, lineHeight: 22 },
  sectionTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "900", marginBottom: 12 },

  // Takeaways
  takeawaysCard: { marginHorizontal: 16, gap: 10 },
  takeawayItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  takeawayDot: { width: 8, height: 8, borderRadius: 4 },
  takeawayText: { color: theme.colors.text, fontSize: 13, fontWeight: "700" },

  // Moments
  momentsCard: { marginHorizontal: 16, gap: 8 },
  momentsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  seeAllText: { color: theme.colors.accentStrong, fontSize: 12, fontWeight: "800" },
  momentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  momentTime: { fontSize: 12, fontWeight: "800" },
  momentText: { color: theme.colors.text, fontSize: 13, fontWeight: "700", flex: 1 },
  momentTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  momentTagText: { fontSize: 10, fontWeight: "900" },

  // Graph Wrapper
  graphContainer: { gap: 16 },
  graphHeader: { paddingHorizontal: 24, gap: 4 },
  graphTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "900" },
  graphDesc: { color: theme.colors.muted, fontSize: 13 },

  // Flashcards List
  flashcardsGrid: { paddingHorizontal: 16, gap: 12 },
  flashcardWrapper: { width: "100%" },
  flashcardInner: {
    height: 140,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
  },
  flashcardFlipped: {
    borderColor: theme.colors.green + "44",
  },
  flashHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  flashLabel: { fontSize: 11, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  flashDot: { width: 6, height: 6, borderRadius: 3 },
  flashText: { color: theme.colors.text, fontSize: 18, fontWeight: "800", textAlign: "center" },
  flashAction: { color: theme.colors.subtle, fontSize: 11, textAlign: "center", fontWeight: "700" },
  emptyContainer: { alignItems: "center", paddingVertical: 60 },
  emptyText: { color: theme.colors.subtle, fontSize: 14, textAlign: "center" },

  // Transcript Turn
  transcriptTurn: {
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    gap: 4,
  },
  transcriptSpeaker: { fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  transcriptText: { color: theme.colors.muted, fontSize: 14, lineHeight: 20 },

  betterMoveRow: {
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    gap: 8,
  },
  betterMoveLabel: { color: theme.colors.subtle, fontSize: 10, fontWeight: "800", textTransform: "uppercase", marginBottom: 2 },
  betterMoveText: { color: theme.colors.text, fontSize: 14, fontWeight: "700" },
  blunderBox: {
    backgroundColor: "rgba(255, 107, 107, 0.08)",
    borderColor: "rgba(255, 107, 107, 0.2)",
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    padding: 10,
    marginBottom: 6,
  },
  bestMoveBox: {
    backgroundColor: "rgba(74, 222, 128, 0.08)",
    borderColor: "rgba(74, 222, 128, 0.2)",
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    padding: 10,
  },
  analysisCard: { marginHorizontal: 16 },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  tipText: { color: theme.colors.muted, fontSize: 13, flex: 1 },
});
