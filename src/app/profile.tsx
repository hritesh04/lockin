import { updateMe } from "@/lib/api";
import { tokens } from "@/theme/tokens";
import { useRouter } from "expo-router";
import { ChevronLeft, LogOut, Target, Timer } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../store/auth";
import { useUserStore } from "../store/user";

const GOALS = [
  "Learn a new skill",
  "Ace an exam",
  "Career switch",
  "Personal growth",
  "Stay sharp",
];

const COMMITMENT_OPTIONS = [5, 10, 15, 20, 30];

export default function ProfileScreen() {
  const router = useRouter();
  const goal = useUserStore((s) => s.goal);
  const dailyCommitment = useUserStore((s) => s.dailyCommitment);
  const serverEmail = useUserStore((s) => s.serverEmail);
  const hydrateUser = useUserStore((s) => s.hydrateFromServer);
  const clearTokens = useAuthStore((s) => s.clearTokens);

  const [selectedGoal, setSelectedGoal] = useState<string>(goal ?? "");
  const [customGoal, setCustomGoal] = useState<string>(
    goal && !GOALS.includes(goal) ? goal : ""
  );
  const [commitment, setCommitment] = useState<number>(dailyCommitment ?? 15);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const effectiveGoal = customGoal.trim() || selectedGoal;

  const handleSave = useCallback(async () => {
    if (!effectiveGoal) return;
    setSaving(true);
    try {
      const user = await updateMe({
        goal: effectiveGoal,
        daily_commitment: commitment,
      });
      hydrateUser(user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save profile:", e);
      Alert.alert("Error", "Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [effectiveGoal, commitment, hydrateUser]);

  const handleLogout = async () => {
    await clearTokens();
    router.replace("/auth");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={20} color={tokens.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {serverEmail?.charAt(0).toUpperCase() ?? "U"}
            </Text>
          </View>
          <Text style={styles.email}>{serverEmail}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Target size={16} color={tokens.colors.accent} />
            <Text style={styles.sectionTitle}>Learning Goal</Text>
          </View>
          {GOALS.map((g) => (
            <TouchableOpacity
              key={g}
              style={[
                styles.optionCard,
                effectiveGoal === g && !customGoal && styles.optionCardActive,
              ]}
              onPress={() => {
                setSelectedGoal(g);
                setCustomGoal("");
              }}
            >
              <View
                style={[
                  styles.radio,
                  effectiveGoal === g && !customGoal && styles.radioActive,
                ]}
              />
              <Text
                style={[
                  styles.optionText,
                  effectiveGoal === g && !customGoal && styles.optionTextActive,
                ]}
              >
                {g}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.customInputWrap}>
            <TextInput
              style={styles.customInput}
              placeholder="Or type your own goal..."
              placeholderTextColor={tokens.colors.textTertiary}
              value={customGoal}
              onChangeText={(v) => {
                setCustomGoal(v);
                if (v.trim()) setSelectedGoal("");
              }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Timer size={16} color={tokens.colors.accent} />
            <Text style={styles.sectionTitle}>Daily Commitment</Text>
          </View>
          <View style={styles.commitmentRow}>
            {COMMITMENT_OPTIONS.map((min) => (
              <TouchableOpacity
                key={min}
                style={[
                  styles.commitmentChip,
                  commitment === min && styles.commitmentChipActive,
                ]}
                onPress={() => setCommitment(min)}
              >
                <Text
                  style={[
                    styles.commitmentText,
                    commitment === min && styles.commitmentTextActive,
                  ]}
                >
                  {min}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              (!effectiveGoal || saving) && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={!effectiveGoal || saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>
                {saved ? "Saved!" : "Save Changes"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={16} color="#ef4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.base,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.full,
    borderWidth: 2,
    borderColor: tokens.colors.border,
  },
  headerTitle: {
    fontSize: tokens.fontSize.lg,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
  },
  scrollContent: {
    padding: 24,
    gap: 28,
  },
  avatarSection: {
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: tokens.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFF",
    fontSize: tokens.fontSize.xl,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
  },
  email: {
    fontSize: tokens.fontSize.base,
    fontFamily: tokens.fontFamily.body,
    color: tokens.colors.textSecondary,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    padding: 14,
  },
  optionCardActive: {
    backgroundColor: "rgba(0, 113, 227, 0.04)",
    borderColor: tokens.colors.accent,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: tokens.colors.border,
  },
  radioActive: {
    borderColor: tokens.colors.accent,
    backgroundColor: tokens.colors.accent,
  },
  optionText: {
    fontSize: tokens.fontSize.base,
    fontFamily: tokens.fontFamily.bodyMedium,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.textPrimary,
  },
  optionTextActive: {
    color: tokens.colors.accent,
  },
  customInputWrap: {
    marginTop: 4,
  },
  customInput: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: tokens.fontSize.base,
    fontFamily: tokens.fontFamily.body,
    color: tokens.colors.textPrimary,
  },
  commitmentRow: {
    flexDirection: "row",
    gap: 10,
  },
  commitmentChip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    alignItems: "center",
  },
  commitmentChipActive: {
    backgroundColor: tokens.colors.accent,
    borderColor: tokens.colors.accent,
  },
  commitmentText: {
    fontSize: tokens.fontSize.base,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
  },
  commitmentTextActive: {
    color: "#FFF",
  },
  saveBtn: {
    backgroundColor: tokens.colors.accent,
    paddingVertical: 16,
    borderRadius: tokens.radius.full,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: "#FFF",
    fontSize: tokens.fontSize.lg,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    backgroundColor: "rgba(239, 68, 68, 0.04)",
  },
  logoutText: {
    color: "#ef4444",
    fontSize: tokens.fontSize.lg,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
  },
});
