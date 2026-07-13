import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme";

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <LinearGradient colors={["#090A0F", "#11131C", "#090A0F"]} style={styles.gradient}>
      <SafeAreaView style={[styles.safe, style]}>{children}</SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: {
    flex: 1,
    backgroundColor: "transparent",
    paddingHorizontal: theme.spacing.lg,
  },
});
