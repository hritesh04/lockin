import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserStore } from '../store/user';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const MOTIVATIONAL_TEXTS = [
  "Amazing consistency! Keep the focus going.",
  "You're on fire! Another day, another win.",
  "Small steps every day lead to massive results.",
  "Your dedication is paying off. Keep it up!",
  "Unstoppable! You're building a strong habit.",
  "Great job showing up today. Momentum is everything.",
  "Consistency is the key to mastery.",
  "You're proving that you can do hard things.",
  "Every session brings you closer to your goals.",
  "Outstanding effort! Your brain is leveling up.",
  "You're building an unbreakable learning habit.",
  "Success is the sum of small efforts repeated daily.",
  "Don't break the chain! You're doing incredible.",
  "Your focus is your superpower. Great session!",
  "Another step forward on your journey to mastery.",
  "You are locking in! The results will show.",
  "Mastery is a marathon, and you're setting a great pace.",
  "You showed up today, and that's half the battle.",
  "Keep fueling your mind. You're doing amazing.",
  "Your future self will thank you for today's effort."
];

const CONFETTI_COLORS = ['#fb923c', '#60a5fa', '#818cf8', '#facc15'];

function ConfettiParticle() {
  const yAnim = useRef(new Animated.Value(100)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opAnim = useRef(new Animated.Value(1)).current;
  
  const left = useRef(Math.random() * 100).current;
  const size = useRef(8 + Math.random() * 8).current;
  const color = useRef(CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]).current;
  const drift = useRef((Math.random() - 0.5) * 40).current;
  const delay = useRef(50 + Math.random() * 1000).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(yAnim, {
            toValue: -SCREEN_HEIGHT - 100,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(opAnim, {
            toValue: 0,
            duration: 4000,
            useNativeDriver: true,
          })
        ])
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute',
      left: `${left}%`,
      bottom: -100,
      width: 8,
      height: size,
      backgroundColor: color,
      borderRadius: 1,
      marginLeft: drift,
      opacity: opAnim,
      transform: [
        { translateY: yAnim },
        { 
          rotate: rotateAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '360deg']
          }) 
        }
      ]
    }} />
  );
}

function Confetti() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: 24 }).map((_, i) => <ConfettiParticle key={i} />)}
    </View>
  );
}


interface Props {
  topicTitle: string;
  score: number;
  total: number;
  onContinue: () => void;
  onDashboard: () => void;
}

export default function SessionComplete({ topicTitle, score, total, onContinue, onDashboard }: Props) {
  const insets = useSafeAreaInsets();
  const streakCount = useUserStore(s => s.streakCount);
  const [randomText] = useState(() => MOTIVATIONAL_TEXTS[Math.floor(Math.random() * MOTIVATIONAL_TEXTS.length)]);

  // Animations
  const springAnim = useRef(new Animated.Value(0.3)).current;
  const springOpAnim = useRef(new Animated.Value(0)).current;
  
  const slideAnim1 = useRef(new Animated.Value(0)).current;
  const slideAnim2 = useRef(new Animated.Value(0)).current;
  const slideAnim3 = useRef(new Animated.Value(0)).current;
  const slideAnim4 = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {

    // Pulse animation
    Animated.loop(
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 0.6,
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 0.2,
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ])
  ).start();

    // Staggered enter animations
    Animated.stagger(150, [
      Animated.parallel([
        Animated.spring(springAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
        Animated.timing(springOpAnim, { toValue: 1, duration: 400, useNativeDriver: true })
      ]),
      Animated.timing(slideAnim1, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim2, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim3, { toValue: 1, duration: 600, delay: 400, useNativeDriver: true }),
      Animated.timing(slideAnim4, { toValue: 1, duration: 600, delay: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const slideUpStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [16, 0]
        })
      }
    ]
  });

  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const displayStreak = streakCount > 0 ? streakCount : 12;

  return (
    <View style={styles.container}>
      <Confetti />

      <View style={styles.content}>
        <View style={styles.badgeContainer}>
          <View style={styles.glowContainer}>
            <Animated.View style={[
              styles.badgeGlowSmall,
              { opacity: pulseAnim, transform: [{ scale: springAnim }] }
            ]} />
            
            <Animated.View style={[
              styles.badgeGlowMedium,
              { opacity: pulseAnim }
            ]} />

            <Animated.View style={[
              styles.badgeGlowLarge,
              { opacity: pulseAnim }
            ]} />
          </View>
          
          <Animated.View style={[
            styles.badge, 
            { 
              opacity: springOpAnim, 
              transform: [{ scale: springAnim }] 
            }
          ]}>
            <View style={styles.streakContainer}>
            <Feather name="zap" size={48} color="#f97316" style={styles.badgeIcon} />
              <Text style={styles.streakNumber}>{displayStreak}</Text>
              <Text style={styles.streakLabel}>Day Streak</Text>
            </View>
          </Animated.View>
        </View>

        <Animated.View style={[styles.headingRow, slideUpStyle(slideAnim1)]}>
          <Text style={styles.title}>STREAK SAVED!</Text>
        </Animated.View>
        <Animated.View style={[styles.headingRow, slideUpStyle(slideAnim2)]}>
          <Text style={styles.subtitle}>{randomText}</Text>
        </Animated.View>
      </View>

      <Animated.View style={[
        styles.actionsContainer, 
        slideUpStyle(slideAnim4),
        { paddingBottom: Math.max(insets.bottom, 24) }
      ]}>
        <TouchableOpacity style={styles.continueBtn} activeOpacity={0.8} onPress={onContinue}>
          <Text style={styles.continueBtnText}>Continue Learning</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dashboardBtn} activeOpacity={0.8} onPress={onDashboard}>
          <Text style={styles.dashboardBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // slate-900
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: 40,
    width: 220,
    height: 220,
  },
  glowContainer: {
  position: 'absolute',
  alignItems: 'center',
  justifyContent: 'center',
},

badgeGlowSmall: {
  position: 'absolute',
  width: 180,
  height: 180,
  borderRadius: 90,
  backgroundColor: 'rgba(249, 115, 22, 0.35)',
},

badgeGlowMedium: {
  position: 'absolute',
  width: 240,
  height: 240,
  borderRadius: 120,
  backgroundColor: 'rgba(249, 115, 22, 0.2)',
},

badgeGlowLarge: {
  position: 'absolute',
  width: 300,
  height: 300,
  borderRadius: 150,
  backgroundColor: 'rgba(249, 115, 22, 0.1)',
},
  badgeGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(249, 115, 22, 0.25)', // orange glow
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 10,
    width: '100%',
    paddingBottom: 100,
  },
  badge: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#1e293b', // slate-800
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  streakContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
  },
  badgeIcon: {
    marginBottom: 2,
  },
  streakNumber: {
    fontFamily: 'CabinetGrotesk-Extrabold',
    fontSize: 30,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 44,
  },
  streakLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#fb923c', // orange-400
    letterSpacing: 1.5,
  },
  headingRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'CabinetGrotesk-Extrabold',
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#94a3b8', // slate-400
    textAlign: 'center',
  },

  actionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 40,
    width: '100%',
    zIndex: 10,
  },
  continueBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#ffffff',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 8,
  },
  continueBtnText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '900',
  },
  dashboardBtn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  dashboardBtnText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '800',
  }

});
