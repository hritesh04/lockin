import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { tokens } from "../theme/tokens";

interface TopicCardProps {
  title: string;
  sessions: number;
  progress: number;
  emoji: string;
  isGenerating?: boolean;
  onPress: () => void;
}

export function TopicCard({
  title,
  sessions,
  progress,
  emoji,
  isGenerating,
  onPress,
}: TopicCardProps) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={onPress}>
      {/* <View style={styles.iconContainer}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View> */}
      <View style={styles.info}>
        <Text style={styles.title}>{title}</Text>
        {isGenerating ? (
          <View style={styles.generatingRow}>
            <ActivityIndicator
              size="small"
              color={tokens.colors.accent}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.generatingText}>Generating roadmap...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sub}>Continue where you left off</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(progress, 100)}%` },
                ]}
              />
            </View>
          </>
        )}
      </View>
      <View style={styles.playButton}>
        {isGenerating ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.playIcon}>▶</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.xl,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    // @ts-ignore
    boxShadow: tokens.shadow.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.base,
    alignItems: "center",
    justifyContent: "center",
    marginRight: tokens.spacing[4],
  },
  emoji: {
    fontSize: 22,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
  },
  sub: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textSecondary,
    marginTop: 2,
  },
  generatingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  generatingText: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.accent,
  },
  progressBar: {
    height: 4,
    backgroundColor: tokens.colors.base,
    borderRadius: tokens.radius.full,
    marginTop: tokens.spacing[2],
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: tokens.colors.accent,
    borderRadius: tokens.radius.full,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: tokens.spacing[3],
  },
  playIcon: {
    color: "#ffffff",
    fontSize: 16,
    marginLeft: 2,
  },
});
