import React from 'react';
import { StyleSheet, View } from 'react-native';
import { tokens } from '../theme/tokens';

interface StreakDotsProps {
  total: number;
  active: number;
}

export function StreakDots({ total, active }: StreakDotsProps) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < active && styles.dotActive,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 28,
    height: 6,
    borderRadius: tokens.radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  dotActive: {
    backgroundColor: tokens.colors.accent,
  },
});
