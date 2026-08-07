import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { tokens } from "../theme/tokens";

interface StatCardProps {
  icon: string | React.ReactNode;
  label: string;
  value: string;
  sub: string;
  onPress?: () => void;
}

export function StatCard({ icon, label, value, sub, onPress }: StatCardProps) {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        {typeof icon === "string" ? (
          <Text style={styles.icon}>{icon}</Text>
        ) : (
          icon
        )}
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.sub}>{sub}</Text>
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing[4],
    borderWidth: 1,
    borderColor: tokens.colors.border,
    // @ts-ignore
    boxShadow: tokens.shadow.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.colors.base,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: tokens.spacing[2],
  },
  icon: {
    fontSize: 18,
  },
  label: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  value: {
    fontSize: tokens.fontSize["3xl"],
    fontFamily: "SpaceGrotesk-Bold",
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
  },
  sub: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textSecondary,
    marginTop: 2,
  },
});
