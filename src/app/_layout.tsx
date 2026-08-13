import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { useUserStore } from '../store/user';
import { useUIStore } from '../store/ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomNav } from '../components/BottomNav';

export default function RootLayout() {
  const hasCompletedOnboarding = useUserStore(state => state.hasCompletedOnboarding);
  const hydrated = useUserStore(state => state.hydrated);
  const token = useAuthStore(state => state.token);
  const segments = useSegments();
  const router = useRouter();
  const hydrate = useAuthStore(state => state.hydrate);
  const authHydrated = useAuthStore(state => state.hydrated);
  const onAddPress = useUIStore(state => state.onAddPress);
  const hideBottomNav = useUIStore(state => state.hideBottomNav);
  const triggerAutoOpenAddModal = useUIStore(state => state.triggerAutoOpenAddModal);

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

  const s = segments as string[];
  const currentRoute = s[0] ?? '';
  const showBottomNav = token && hasCompletedOnboarding && !hideBottomNav &&
    (currentRoute === '' || currentRoute === 'stats' || currentRoute === 'review');

  const activeScreen =
    currentRoute === 'stats' ? 'stats' :
    currentRoute === 'review' ? 'review' :
    'home';

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
      {showBottomNav && (
        <BottomNav
          activeScreen={activeScreen}
          onAddPress={() => {
            if (currentRoute === '') {
              onAddPress?.();
            } else {
              triggerAutoOpenAddModal();
              router.replace('/');
            }
          }}
        />
      )}
    </GestureHandlerRootView>
  );
}
