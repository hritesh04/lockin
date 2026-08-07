import { useRouter } from "expo-router";
import { ChartBar, House, Plus } from "lucide-react-native";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tokens } from "../theme/tokens";

interface BottomNavProps {
  onAddPress?: () => void;
  activeScreen: string;
}

export function BottomNav({ onAddPress, activeScreen }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            if (activeScreen !== "home") router.replace("/");
          }}
        >
          <House
            size={20}
            color={
              activeScreen === "home"
                ? tokens.colors.accent
                : tokens.colors.textSecondary
            }
          />
          <View
            style={[
              styles.activeIndicator,
              activeScreen !== "home" && styles.inactiveIndicator,
            ]}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fabContainer}
          activeOpacity={0.8}
          onPress={onAddPress ?? (() => { if (activeScreen !== "home") router.replace("/"); })}
        >
          <View style={styles.fab}>
            <Plus size={28} color="#ffffff" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            if (activeScreen !== "stats") router.push("/stats");
          }}
        >
          <ChartBar
            size={20}
            color={
              activeScreen === "stats"
                ? tokens.colors.accent
                : tokens.colors.textSecondary
            }
          />
          <View
            style={[
              styles.activeIndicator,
              activeScreen !== "stats" && styles.inactiveIndicator,
            ]}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: tokens.spacing[5],
  },
  navBar: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    alignSelf: "stretch",
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: tokens.spacing[8],
    paddingVertical: tokens.spacing[3],
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    // @ts-ignore
    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.06)",
  },
  navItem: {
    alignItems: "center",
    gap: 3,
    padding: tokens.spacing[2],
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.colors.accent,
  },
  inactiveIndicator: {
    backgroundColor: "transparent",
  },
  fabContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    // backgroundColor: tokens.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -24,
    // @ts-ignore
    // boxShadow: "0 4px 12px rgba(0, 113, 227, 0.25)",
  },
  fab: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 100,
    backgroundColor: tokens.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -24,
    // @ts-ignore
    boxShadow: "0 4px 12px rgba(0, 113, 227, 0.25)",
  },
});
