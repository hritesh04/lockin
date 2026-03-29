import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserStore } from '../store/user';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const GOALS = [
  { id: 'career', title: 'Career Growth', desc: 'Advance your professional skill set.' },
  { id: 'academic', title: 'Academic Excellence', desc: 'Master your studies with focus.' },
  { id: 'personal', title: 'Personal Interest', desc: 'Learn something new everyday.' },
  { id: 'mental', title: 'Mental Sharpness', desc: 'Keep your cognitive edge sharp.' },
];

const DURATIONS = [5, 10, 20, 30];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const completeOnboarding = useUserStore(state => state.completeOnboarding);
  const router = useRouter();
  
  const [activeGoal, setActiveGoal] = useState<string>('career');
  const [activeDuration, setActiveDuration] = useState<number>(10);
  const [currentIndex, setCurrentIndex] = useState(0);

  const scrollRef = useRef<ScrollView>(null);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    scrollRef.current?.scrollTo({ y: index * SCREEN_HEIGHT, animated: true });
  };

  const skipToEnd = () => {
    goToSlide(3);
  };

  const handleStart = () => {
    completeOnboarding(activeGoal, activeDuration);
    router.replace('/');
  };

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    // adding a small offset so it switches dot smoothly
    const index = Math.round(y / SCREEN_HEIGHT);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const renderDots = () => (
    <View style={[styles.dotsContainer, { bottom: insets.bottom + 20 }]} pointerEvents="none">
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      >
        {/* Slide 1 */}
        <View style={[{ height: SCREEN_HEIGHT, paddingBottom: insets.bottom }, styles.slide]}>
          <TouchableOpacity style={[styles.skipBtn, { top: insets.top + 16 }]} onPress={skipToEnd}>
            <Text style={styles.skipText}>SKIP</Text>
          </TouchableOpacity>

          <View style={[styles.heroTop, { paddingTop: insets.top }]}>
            <View style={styles.iconCircle}>
              <FontAwesome5 name="graduation-cap" size={56} color="#0F172A" />
            </View>
          </View>

          <View style={styles.slideContent}>
            <View>
              <Text style={styles.heading}>Master Your Focus with LockIn.</Text>
              <Text style={styles.subheading}>Intense learning sessions designed for the disciplined mind.</Text>
            </View>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => goToSlide(1)} activeOpacity={0.8}>
              <Text style={styles.btnPrimaryText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Slide 2 */}
        <View style={[{ height: SCREEN_HEIGHT, paddingTop: insets.top, paddingBottom: insets.bottom }, styles.slide]}>
          <TouchableOpacity style={[styles.skipBtn, { top: insets.top + 16 }]} onPress={skipToEnd}>
            <Text style={styles.skipText}>SKIP</Text>
          </TouchableOpacity>

          <View style={styles.headerBlock}>
            <Text style={styles.overline}>Your Journey</Text>
            <Text style={styles.title}>What's your goal?</Text>
          </View>

          <View style={styles.listContainer}>
            {GOALS.map(goal => {
              const isActive = activeGoal === goal.id;
              return (
                <TouchableOpacity
                  key={goal.id}
                  style={[styles.goalCard, isActive && styles.goalCardActive]}
                  onPress={() => setActiveGoal(goal.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.goalCardText}>
                    <Text style={[styles.goalCardTitle, isActive && styles.goalCardTitleActive]}>{goal.title}</Text>
                    <Text style={[styles.goalCardDesc, isActive && styles.goalCardDescActive]}>{goal.desc}</Text>
                  </View>
                  {isActive && (
                    <Feather name="check-circle" size={20} color="#0F172A" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.bottomBlock}>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => goToSlide(2)} activeOpacity={0.8}>
              <Text style={styles.btnPrimaryText}>Next Step</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Slide 3 */}
        <View style={[{ height: SCREEN_HEIGHT, paddingTop: insets.top, paddingBottom: insets.bottom }, styles.slide]}>
          <TouchableOpacity style={[styles.skipBtn, { top: insets.top + 16 }]} onPress={skipToEnd}>
            <Text style={styles.skipText}>SKIP</Text>
          </TouchableOpacity>

          <View style={styles.headerBlock}>
            <Text style={styles.overline}>Commitment</Text>
            <Text style={styles.title}>How long do you want to study each day?</Text>
          </View>

          <View style={styles.durationRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 32, gap: 12 }}>
              {DURATIONS.map(dur => {
                const isActive = activeDuration === dur;
                return (
                  <TouchableOpacity
                    key={dur}
                    onPress={() => setActiveDuration(dur)}
                    style={[styles.durPill, isActive && styles.durPillActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.durText, isActive && styles.durTextActive]}>{dur} min</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.centerGraphic}>
            <View style={styles.clockCircle}>
              <Feather name="clock" size={56} color="#F97316" />
            </View>
            <Text style={styles.graphicText}>Daily streaks lead to long-term mastery.</Text>
          </View>

          <View style={styles.bottomBlock}>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => goToSlide(3)} activeOpacity={0.8}>
              <Text style={styles.btnPrimaryText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Slide 4 */}
        <View style={[{ height: SCREEN_HEIGHT, paddingTop: insets.top, paddingBottom: insets.bottom }, styles.slide]}>
          <View style={styles.slide4Center}>
            <View style={styles.flameCircle}>
              <Ionicons name="flame-outline" size={56} color="#F97316" />
            </View>
            <Text style={styles.headingCenter}>You're all set.</Text>
            <Text style={styles.subheadingCenter}>We've prepared your {activeDuration}-minute daily sessions to build your focus streak.</Text>
          </View>

          <View style={styles.bottomBlock}>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleStart} activeOpacity={0.8}>
              <Text style={styles.btnPrimaryText}>Start Learning</Text>
            </TouchableOpacity>
            <View style={{ height: 16 }} />
          </View>
        </View>
      </ScrollView>

      {renderDots()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  slide: {
    width: SCREEN_WIDTH,
    justifyContent: 'flex-start',
  },
  skipBtn: {
    position: 'absolute',
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroTop: {
    height: '55%',
    width: '100%',
    backgroundColor: '#F1F5F9', // slate-100
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 140,
    height: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  slideContent: {
    flex: 1,
    padding: 32,
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 40,
    marginBottom: 16,
    letterSpacing: -1,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 28,
  },
  btnPrimary: {
    backgroundColor: '#0F172A',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 100,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerBlock: {
    paddingTop: 64,
    paddingHorizontal: 32,
  },
  overline: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '800',
    color: '#94A3B8',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
    letterSpacing: -0.5,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 16,
    gap: 12,
  },
  goalCard: {
    padding: 20,
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalCardActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#0F172A',
  },
  goalCardText: {
    flex: 1,
    paddingRight: 16,
  },
  goalCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  goalCardTitleActive: {
  },
  goalCardDesc: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  goalCardDescActive: {
  },
  bottomBlock: {
    padding: 32,
    paddingBottom: 40,
  },
  durationRow: {
    marginTop: 32,
  },
  durPill: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: 'transparent',
  },
  durPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
    shadowColor: '#0F172A',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  durText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8',
  },
  durTextActive: {
    color: '#FFFFFF',
  },
  centerGraphic: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  clockCircle: {
    width: 180,
    height: 180,
    backgroundColor: '#F1F5F9',
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphicText: {
    marginTop: 32,
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  slide4Center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  flameCircle: {
    width: 120,
    height: 120,
    backgroundColor: '#FFF7ED',
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  headingCenter: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -1,
  },
  subheadingCenter: {
    fontSize: 18,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 28,
  },
  dotsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: 'transparent',
  },
  dotActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
});
