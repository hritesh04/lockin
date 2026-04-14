import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { useUserStore } from '../store/user';

export default function RootLayout() {
  const hasCompletedOnboarding = useUserStore(state => state.hasCompletedOnboarding);
  const token = useAuthStore(state => state.token);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const s = segments as string[];
    const inAuthGroup = s[0] === 'auth' || s[0] === 'forgot-password';
    const inOnboarding = s[0] === 'onboarding';

    if (!token) {
      if (!inAuthGroup) {
        router.replace('/auth');
      }
    } else {
      // User is logged in
      if (inAuthGroup) {
        router.replace('/');
      }
      /*
      else if (!hasCompletedOnboarding && !inOnboarding) {
        router.replace('/onboarding');
      } else if (hasCompletedOnboarding && inOnboarding) {
        router.replace('/');
      }
      */
    }
  }, [token, segments, hasCompletedOnboarding]);

  return (
    <>
      <StatusBar hidden />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F8FAFC' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="stats" />
      </Stack>
    </>
  );
}
