import { login, register } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { tokens } from "@/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ArrowRight, Lock, Mail } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AuthMode = "login" | "register";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setTokens = useAuthStore((state) => state.setTokens);

  const switchMode = (newMode: AuthMode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMode(newMode);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!email) {
      setError("Email is required");
      return;
    }
    if (mode === "login" || mode === "register") {
      if (!password) {
        setError("Password is required");
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      if (mode === "login") {
        const resp = await login(email, password);
        await setTokens(resp.token, resp.refresh_token);
        router.replace("/");
      } else if (mode === "register") {
        const resp = await register(email, password);
        await setTokens(resp.token, resp.refresh_token);
        router.replace("/onboarding");
      }
    } catch (e: any) {
      setError(
        e.response?.data?.error || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (mode === "login") return "Welcome Back";
    return "Create Account";
  };

  const getSubtitle = () => {
    if (mode === "login") return "Sign in to continue your journey.";
    return "Start your journey towards deep work.";
  };

  const getButtonText = () => {
    if (mode === "login") return "Sign In";
    return "Create Account";
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="flame" color="#FFF" size={28} />
          </View>
          <Text style={styles.brandName}>LockIn</Text>
        </View>

        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>{getTitle()}</Text>
          <Text style={styles.welcomeSubtitle}>{getSubtitle()}</Text>
        </View>

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

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>PASSWORD</Text>
              {mode === "login" && (
                <TouchableOpacity
                  onPress={() => router.push("/forgot-password")}
                >
                  <Text style={styles.forgotText}>Forgot?</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.inputWrapper}>
              <Lock
                color={tokens.colors.textTertiary}
                size={18}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={tokens.colors.textTertiary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.actionBtnText}>{getButtonText()}</Text>
                <ArrowRight color="#FFF" size={18} style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
          <View style={styles.dividerLine} />
        </View> */}

        {/* <TouchableOpacity
          style={styles.socialBtnDisabled}
          disabled
          activeOpacity={1}
        >
          <Ionicons
            name="logo-google"
            size={18}
            color={tokens.colors.textTertiary}
            style={{ marginRight: 12 }}
          />
          <Text style={styles.socialBtnTextDisabled}>
            Google Account (coming soon)
          </Text>
        </TouchableOpacity> */}

        <View style={styles.footer}>
          {mode === "login" ? (
            <>
              <Text style={styles.footerText}>
                Don&apos;t have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => switchMode("register")}>
                <Text style={styles.linkText}>Sign up</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => switchMode("login")}>
                <Text style={styles.linkText}>Sign in</Text>
              </TouchableOpacity>
            </>
          )}
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
    // @ts-ignore
    boxShadow: "0 4px 16px rgba(0, 113, 227, 0.25)",
  },
  brandName: {
    fontSize: tokens.fontSize["2xl"],
    fontFamily: tokens.fontFamily.display,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
    marginTop: 12,
    letterSpacing: -0.5,
  },
  welcomeSection: {
    marginBottom: 32,
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
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textSecondary,
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  forgotText: {
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.accent,
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
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: tokens.colors.borderSubtle,
  },
  dividerText: {
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textTertiary,
    marginHorizontal: 12,
    letterSpacing: 0.5,
  },
  socialBtnDisabled: {
    height: 56,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.6,
  },
  socialBtnTextDisabled: {
    fontSize: tokens.fontSize.lg,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textTertiary,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 32,
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
