import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { Spark } from "../components/Icons";
import { useAuth } from "../context/AuthContext";
import { theme } from "../theme";

export function AuthScreen() {
  const { enterApp } = useAuth();

  return (
    <Screen>
      <View style={styles.wrap}>
        <View>
          <Text style={styles.kicker}>HackHazards'26</Text>
          <Text style={styles.logo}>YnotMe</Text>
          <Text style={styles.tagline}>
            Your live AI conversation coach for the dates you actually show up for.
          </Text>
        </View>

        <View style={styles.features}>
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Spark size={16} color={theme.colors.accent} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Live AI Coaching</Text>
              <Text style={styles.featureDesc}>Real-time suggestions during your conversation</Text>
            </View>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Spark size={16} color={theme.colors.green} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Conversation Memory</Text>
              <Text style={styles.featureDesc}>Knowledge graph remembers what matters</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottom}>
          <Button title="Enter YnotMe" onPress={enterApp} />
          <Text style={styles.note}>Demo mode • No login required for hackathon preview</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "space-between", paddingBottom: 34, paddingTop: 54 },
  kicker: { color: theme.colors.accent, fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.5 },
  logo: { color: theme.colors.text, fontSize: 52, fontWeight: "900", marginTop: 8 },
  tagline: { color: theme.colors.muted, fontSize: 18, lineHeight: 26, marginTop: 12 },
  features: { gap: 16 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  featureIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(215, 199, 255, 0.08)", alignItems: "center", justifyContent: "center" },
  featureText: { flex: 1, gap: 2 },
  featureTitle: { color: theme.colors.text, fontSize: 15, fontWeight: "800" },
  featureDesc: { color: theme.colors.muted, fontSize: 13 },
  bottom: { gap: 12 },
  note: { color: theme.colors.subtle, fontSize: 12, textAlign: "center" },
});
