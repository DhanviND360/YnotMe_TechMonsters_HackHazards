import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { History as HistoryIcon } from "../components/Icons";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { theme } from "../theme";
import { DateSession, RootStackParamList } from "../types";

export function HistoryScreen() {
  const { accessToken } = useAuth();
  const [sessions, setSessions] = useState<DateSession[]>([]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    api.listSessions(accessToken).then((d) => setSessions(d.sessions)).catch(() => {});
  }, [accessToken]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Your dates</Text>
        <Text style={styles.title}>History</Text>
      </View>
      <FlatList
        data={sessions}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate("DateDetail", { sessionId: item.id })}>
            <Card style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.iconWrap}>
                  <HistoryIcon size={18} color={theme.colors.accent} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                  <Text style={styles.cardSummary} numberOfLines={2}>{item.summary}</Text>
                </View>
              </View>
              {item.analysis && (
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Score</Text>
                  <Text style={styles.scoreValue}>{item.analysis.conversationScore}</Text>
                </View>
              )}
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No sessions yet. Start your first date!</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 16, marginBottom: 16 },
  kicker: { color: theme.colors.accent, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1.2 },
  title: { color: theme.colors.text, fontSize: 34, fontWeight: "900", marginTop: 4 },
  list: { paddingBottom: 34, gap: 12 },
  card: { gap: 12 },
  cardRow: { flexDirection: "row", gap: 12 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(215, 199, 255, 0.08)",
    alignItems: "center", justifyContent: "center",
  },
  cardContent: { flex: 1, gap: 2 },
  cardTitle: { color: theme.colors.text, fontSize: 15, fontWeight: "800" },
  cardDate: { color: theme.colors.subtle, fontSize: 11 },
  cardSummary: { color: theme.colors.muted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  scoreRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderTopColor: theme.colors.border, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10,
  },
  scoreLabel: { color: theme.colors.muted, fontSize: 12, fontWeight: "700" },
  scoreValue: { color: theme.colors.green, fontSize: 18, fontWeight: "900" },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyText: { color: theme.colors.subtle, fontSize: 14 },
});
