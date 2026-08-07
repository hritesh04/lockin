import React from "react";
import { StyleSheet, View } from "react-native";
import { tokens } from "../theme/tokens";
import { StatCard } from "./StatCard";

interface StatRowProps {
  stats: {
    icon: string | React.ReactNode;
    label: string;
    value: string;
    sub: string;
    onPress?: () => void;
  }[];
}

export function StatRow({ stats }: StatRowProps) {
  return (
    <View style={styles.row}>
      {stats.map((stat, i) => (
        <StatCard key={i} {...stat} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: tokens.spacing[3],
  },
});
