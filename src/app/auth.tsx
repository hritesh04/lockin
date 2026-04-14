import { login, register } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AuthMode = 'login' | 'register';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setTokens = useAuthStore(state => state.setTokens);

  const switchMode = (newMode: AuthMode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMode(newMode);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!email) {
       setError('Email is required');
       return;
    }
    if (mode === 'login' || mode === 'register') {
      if (!password) {
        setError('Password is required');
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') {
        const resp = await login(email, password);
        setTokens(resp.token, resp.refresh_token);
        router.replace('/');
      } else if (mode === 'register') {
        const resp = await register(email, password);
        setTokens(resp.token, resp.refresh_token);
        // router.replace('/onboarding');
        router.replace('/');
      }
    } catch (e: any) {
      setError(e.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (mode === 'login') return 'Welcome Back';
    return 'Create Account';
  };

  const getSubtitle = () => {
    if (mode === 'login') return 'Sign in to continue your journey.';
    return 'Start your journey towards deep work.';
  };

  const getButtonText = () => {
    if (mode === 'login') return 'Sign In';
    return 'Create Account';
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Branding Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="flame" color="#FFF" size={32} />
          </View>
          <Text style={styles.brandName}>LockIn</Text>
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>{getTitle()}</Text>
          <Text style={styles.welcomeSubtitle}>{getSubtitle()}</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {error && <Text style={styles.errorText}>{error}</Text>}
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <View style={styles.inputWrapper}>
              <Feather name="mail" color="#94A3B8" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor="#CBD5E1"
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
                  {mode === 'login' && (
                    <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                      <Text style={styles.forgotText}>Forgot?</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.inputWrapper}>
                  <Feather name="lock" color="#94A3B8" size={20} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#CBD5E1"
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
                <Feather name="arrow-right" color="#FFF" size={20} style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        </View>

        <>
          {/* Social login */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.socialBtn}>
            <Ionicons name="logo-google" size={20} color="#475569" style={{ marginRight: 12 }} />
            <Text style={styles.socialBtnText}>Google Account</Text>
          </TouchableOpacity>
        </>

        {/* Footer */}
        <View style={styles.footer}>
          {mode === 'login' ? (
            <>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => switchMode('register')}>
                <Text style={styles.linkText}>Sign up</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => switchMode('login')}>
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
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#F97316',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
    letterSpacing: -0.5,
  },
  welcomeSection: {
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -1,
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
    marginLeft: 4,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F97316',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionBtn: {
    backgroundColor: '#F97316',
    height: 60,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 10,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#CBD5E1',
    marginHorizontal: 12,
    letterSpacing: 1,
  },
  socialBtn: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F97316',
  },
});
