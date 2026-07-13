import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { Spark, Mic } from "../components/Icons";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { theme } from "../theme";
import { DateSession, RootStackParamList } from "../types";

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { accessToken, signOut } = useAuth();
  const [sessions, setSessions] = useState<DateSession[]>([]);

  useEffect(() => {
    api.listSessions(accessToken).then((d) => setSessions(d.sessions)).catch(() => {});
  }, [accessToken]);

  async function handleStartDate() {
    try {
      const res = await api.startSession(accessToken);
      navigation.navigate("LiveSession", { sessionId: res.session.id });
    } catch (e) {
      // If backend is down, still navigate with a placeholder
      navigation.navigate("LiveSession", { sessionId: "demo" });
    }
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Tonight's coach</Text>
            <Text style={styles.title}>Make the{"\n"}shot count.</Text>
          </View>
          <Pressable onPress={signOut}>
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
        </View>

        <Pressable onPress={handleStartDate}>
          <LinearGradient
            colors={["rgba(168, 139, 255, 0.15)", "rgba(99, 144, 255, 0.08)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.startCard}
          >
            <View style={styles.micCircle}>
              <Mic size={32} color={theme.colors.text} />
            </View>
            <Text style={styles.startTitle}>Start a Date</Text>
            <Text style={styles.startDesc}>Tap to begin live AI coaching</Text>
          </LinearGradient>
        </Pressable>

        {sessions.length > 0 && (
          <Card>
            <View style={styles.sectionHeader}>
              <Spark size={16} color={theme.colors.accent} />
              <Text style={styles.sectionTitle}>Recent Sessions</Text>
            </View>
            {sessions.slice(0, 3).map((s) => (
              <Pressable key={s.id} onPress={() => navigation.navigate("DateDetail", { sessionId: s.id })}>
                <View style={styles.sessionRow}>
                  <Text style={styles.sessionTitle}>{s.title}</Text>
                  <Text style={styles.sessionDate}>
                    {new Date(s.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </Pressable>
            ))}
          </Card>
        )}

        <Card>
          <Text style={styles.sectionTitle}>How it works</Text>
          <Text style={styles.body}>
            1. Start a date and enable AI listening{"\n"}
            2. Speak naturally — audio is captured in short chunks{"\n"}
            3. Sarvam AI transcribes and analyzes in real-time{"\n"}
            4. Get live coaching suggestions and key facts{"\n"}
            5. End the date for a full conversation analysis
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 34, paddingTop: 16, gap: 18 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  kicker: { color: theme.colors.accent, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1.2 },
  title: { color: theme.colors.text, fontSize: 34, fontWeight: "900", marginTop: 6, lineHeight: 40 },
  signOut: { color: theme.colors.muted, fontWeight: "800", paddingTop: 4, fontSize: 13 },
  startCard: {
    alignItems: "center",
    borderRadius: theme.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(168, 139, 255, 0.25)",
    padding: 32,
    gap: 12,
  },
  micCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(168, 139, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  startTitle: { color: theme.colors.text, fontSize: 20, fontWeight: "900" },
  startDesc: { color: theme.colors.muted, fontSize: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "900", marginBottom: 8 },
  sessionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  sessionTitle: { color: theme.colors.text, fontWeight: "700", flex: 1 },
  sessionDate: { color: theme.colors.muted, fontSize: 12 },
  body: { color: theme.colors.muted, fontSize: 14, lineHeight: 22 },
});
