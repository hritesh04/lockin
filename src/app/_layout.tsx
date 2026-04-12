import { login } from '@/lib/api';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { useUserStore } from '../store/user';

export default function RootLayout() {
  const hasCompletedOnboarding = useUserStore(state => state.hasCompletedOnboarding);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await login('user@example.com', 'supersecret');
        if (!cancelled) {
          useAuthStore.getState().setTokens(resp.token, resp.refresh_token);
          useUserStore.getState().hydrateFromServer(resp.user);
        }
      } catch (e) {
        console.warn('[dev] user bootstrap failed', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Basic auth / onboarding redirect routing
    const inOnboarding = segments[0] === 'onboarding';

    if (!hasCompletedOnboarding && !inOnboarding) {
      router.replace('/onboarding');
    } else if (hasCompletedOnboarding && inOnboarding) {
      router.replace('/');
    }
  }, [hasCompletedOnboarding, segments]);

  return (
    <>
      <StatusBar hidden />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#050505' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="stats" />
      </Stack>
    </>
  );
}
