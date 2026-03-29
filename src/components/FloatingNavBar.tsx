import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FloatingNavBarProps {
  onAddPress: () => void;
  activeScreen: string;
}

export default function FloatingNavBar({ onAddPress, activeScreen }: FloatingNavBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.navContainer, { bottom: Math.max(insets.bottom, 24) }]}>
      <View style={styles.navInner}>
        <TouchableOpacity style={styles.navItem} onPress={()=> { activeScreen !== 'home' && router.push('/'); }}>
          <Feather name="home" size={24} color={activeScreen === "home" ? "#FFFFFF" : "#64748B"} />
        </TouchableOpacity>
        
        <View />

        <TouchableOpacity style={styles.navItem} onPress={()=> { activeScreen !== 'stats' && router.push('/stats'); }}>
          <Feather name="bar-chart-2" size={24} color={activeScreen === "stats" ? "#FFFFFF" : "#64748B"} />
        </TouchableOpacity>
      </View>

      <View style={styles.fabWrapper}>
        <TouchableOpacity 
          style={styles.fabButton} 
          activeOpacity={0.8}
          onPress={onAddPress}
        >
          <Feather name="plus" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    height: 80,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  navInner: {
    backgroundColor: '#0F172A',
    borderRadius: 100,
    height: 64,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    shadowColor: '#94A3B8',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 20,
  },
  navItem: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabWrapper: {
    position: 'absolute',
    top: 0,
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F97316',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 10,
  },
});
