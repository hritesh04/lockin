import { forgotPassword } from "@/lib/api";
import { tokens } from "@/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleForgot = async () => {
    if (!email) {
      setError("Email is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (e: any) {
      setError(
        e.response?.data?.error || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={tokens.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="flame" color="#FFF" size={28} />
          </View>
        </View>

        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Reset Password</Text>
          <Text style={styles.welcomeSubtitle}>
            {success
              ? "If an account exists, we've sent instructions to your email."
              : "Enter your email address and we'll send you instructions to reset your password."}
          </Text>
        </View>

        {!success ? (
          <View style={styles.form}>
            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <View style={styles.inputWrapper}>
                <Mail
                  color={tokens.colors.textTertiary}
                  size={18}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor={tokens.colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleForgot}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.actionBtnText}>Send Instructions</Text>
                  <ArrowRight
                    color="#FFF"
                    size={18}
                    style={{ marginLeft: 8 }}
                  />
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.replace("/auth")}
          >
            <Text style={styles.actionBtnText}>Back to Login</Text>
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Remember your password? </Text>
          <TouchableOpacity onPress={() => router.replace("/auth")}>
            <Text style={styles.linkText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.base,
  },
  scrollContent: {
    paddingHorizontal: 32,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tokens.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    width: 64,
    height: 64,
    backgroundColor: tokens.colors.accent,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 16px rgba(0, 113, 227, 0.25)",
  },
  welcomeSection: {
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: tokens.fontSize["4xl"],
    fontFamily: tokens.fontFamily.display,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
    letterSpacing: -1,
  },
  welcomeSubtitle: {
    fontSize: tokens.fontSize.lg,
    fontFamily: tokens.fontFamily.body,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.textSecondary,
    marginTop: 8,
    lineHeight: 24,
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textSecondary,
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: tokens.fontSize.lg,
    fontFamily: tokens.fontFamily.bodyMedium,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.textPrimary,
  },
  errorText: {
    color: "#ef4444",
    fontSize: tokens.fontSize.base,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.semibold,
    textAlign: "center",
  },
  actionBtn: {
    backgroundColor: tokens.colors.accent,
    height: 56,
    borderRadius: tokens.radius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(0, 113, 227, 0.25)",
    marginTop: 10,
  },
  actionBtnText: {
    color: "#FFF",
    fontSize: tokens.fontSize.lg,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 40,
  },
  footerText: {
    fontSize: tokens.fontSize.base,
    fontFamily: tokens.fontFamily.body,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.textSecondary,
  },
  linkText: {
    fontSize: tokens.fontSize.base,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.accent,
  },
});
