import React, { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme";

export function Button({
  title,
  onPress,
  variant = "primary",
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  style?: ViewStyle;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const content = <Text style={[styles.text, variant !== "primary" && styles.secondaryText]}>{title}</Text>;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      >
        {variant === "primary" ? (
          <LinearGradient colors={["#E4D8FF", "#9F83FF"]} style={styles.primary}>
            {content}
          </LinearGradient>
        ) : (
          <Animated.View style={[styles.secondary, variant === "danger" && styles.danger]}>{content}</Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  primary: {
    alignItems: "center",
    borderRadius: theme.radius.sm,
    paddingVertical: 15,
  },
  secondary: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 15,
  },
  danger: {
    backgroundColor: "rgba(255, 107, 107, 0.12)",
    borderColor: "rgba(255, 107, 107, 0.32)",
  },
  text: {
    color: "#14121C",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  secondaryText: {
    color: theme.colors.text,
  },
});
