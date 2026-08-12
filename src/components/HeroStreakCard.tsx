import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "../theme/tokens";
import { StreakDots } from "./StreakDots";

interface HeroStreakCardProps {
  streakCount: number;
  dailyCommitment: number | null;
  daysActive: number;
  pastDaysActive: boolean[];
  todayMet: boolean;
}

export function HeroStreakCard({
  streakCount,
  dailyCommitment,
  daysActive,
  pastDaysActive,
  todayMet,
}: HeroStreakCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View>
          <Text style={styles.label}>DAY STREAK</Text>
          <Text style={styles.number}>{streakCount}</Text>
          <Text style={styles.sub}>
            {dailyCommitment
              ? `${dailyCommitment} min daily goal`
              : "Set a daily goal"}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.fire}>🔥</Text>
          <Text style={styles.days}>{daysActive} / 7 DAYS</Text>
        </View>
      </View>
      <StreakDots days={pastDaysActive} todayMet={todayMet} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.colors.darkBase,
    borderRadius: tokens.radius["3xl"],
    padding: tokens.spacing[6],
    marginTop: tokens.spacing[4],
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: tokens.spacing[6],
  },
  label: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.bold,
    color: "rgba(255, 255, 255, 0.5)",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  number: {
    fontSize: tokens.fontSize.hero,
    fontFamily: "SpaceGrotesk-Bold",
    fontWeight: tokens.fontWeight.bold,
    color: "#ffffff",
    lineHeight: 52,
    letterSpacing: -2,
  },
  sub: {
    fontSize: tokens.fontSize.sm,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  right: {
    alignItems: "flex-end",
  },
  fire: {
    fontSize: 32,
  },
  days: {
    fontSize: tokens.fontSize.xs,
    color: "rgba(255, 255, 255, 0.4)",
    letterSpacing: 0.5,
    marginTop: 4,
  },
});
