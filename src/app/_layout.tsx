import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { useUserStore } from '../store/user';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  const hasCompletedOnboarding = useUserStore(state => state.hasCompletedOnboarding);
  const hydrated = useUserStore(state => state.hydrated);
  const token = useAuthStore(state => state.token);
  const segments = useSegments();
  const router = useRouter();
  const hydrate = useAuthStore(state => state.hydrate);
  const authHydrated = useAuthStore(state => state.hydrated);

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (!authHydrated) return;

    const s = segments as string[];
    const inAuthGroup = s[0] === 'auth' || s[0] === 'forgot-password';
    const inOnboarding = s[0] === 'onboarding';

    if (!token) {
      if (!inAuthGroup) {
        router.replace('/auth');
      }
    } else {
      if (inAuthGroup) {
        router.replace('/');
        return;
      }
      if (hydrated) {
        if (!hasCompletedOnboarding && !inOnboarding) {
          router.replace('/onboarding');
        } else if (hasCompletedOnboarding && inOnboarding) {
          router.replace('/');
        }
      }
    }
  }, [token, segments, hasCompletedOnboarding, hydrated, authHydrated]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar hidden />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f5f5f7' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="stats" />
        <Stack.Screen name="review/index" />
        <Stack.Screen name="profile" />
      </Stack>
    </GestureHandlerRootView>
  );
}
