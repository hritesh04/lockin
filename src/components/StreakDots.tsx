import React from "react";
import { StyleSheet, View } from "react-native";
import { tokens } from "../theme/tokens";

interface StreakDotsProps {
  days: boolean[];
  todayMet: boolean;
}

export function StreakDots({ days, todayMet }: StreakDotsProps) {
  return (
    <View style={styles.dots}>
      {days.map((active, i) => (
        <View key={i} style={[styles.dot, active && styles.dotActive]} />
      ))}
      <View
        style={[styles.dot, todayMet ? styles.dotActive : styles.dotToday]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 28,
    height: 6,
    borderRadius: tokens.radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  dotActive: {
    backgroundColor: tokens.colors.accent,
  },
  dotToday: {
    backgroundColor: tokens.colors.textSecondary,
  },
});
