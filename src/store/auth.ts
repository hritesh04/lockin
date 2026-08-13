import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token';
const REFRESH_KEY = 'auth_refresh_token';

const isWeb = Platform.OS === 'web';

async function getItem(key: string): Promise<string | null> {
  try {
    if (isWeb) {
      return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  try {
    if (isWeb) {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Persistence is best-effort; in-memory state still updates below.
  }
}

async function deleteItem(key: string): Promise<void> {
  try {
    if (isWeb) {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Ignore.
  }
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  setTokens: (token: string, refreshToken: string) => void;
  clearTokens: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  hydrated: false,
  setTokens: async (token, refreshToken) => {
    set({ token, refreshToken });
    await setItem(TOKEN_KEY, token);
    await setItem(REFRESH_KEY, refreshToken);
  },
  clearTokens: async () => {
    set({ token: null, refreshToken: null });
    await deleteItem(TOKEN_KEY);
    await deleteItem(REFRESH_KEY);
  },
  hydrate: async () => {
    const token = await getItem(TOKEN_KEY);
    const refreshToken = await getItem(REFRESH_KEY);
    set({ token, refreshToken, hydrated: true });
  },
}));
