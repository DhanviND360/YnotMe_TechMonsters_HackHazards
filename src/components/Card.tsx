import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { theme } from "../theme";

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(21, 24, 36, 0.86)",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: theme.spacing.md,
  },
});
