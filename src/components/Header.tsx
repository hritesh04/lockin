import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { tokens } from '../theme/tokens';

interface HeaderProps {
  greeting: string;
  subtitle: string;
  initials: string;
  onAvatarPress?: () => void;
}

export function Header({ greeting, subtitle, initials, onAvatarPress }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <TouchableOpacity style={styles.avatar} onPress={onAvatarPress} activeOpacity={0.7}>
        <Text style={styles.avatarText}>{initials}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: tokens.fontSize.xl,
    fontFamily: 'SpaceGrotesk-Bold',
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textSecondary,
    marginTop: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.semibold,
  },
});
