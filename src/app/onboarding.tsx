import { tokens } from "@/theme/tokens";
import { useRouter } from "expo-router";
import { CircleCheck, Lock } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUserStore } from "../store/user";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const GOALS = [
  {
    id: "personal",
    title: "Personal Interest",
    desc: "Learn something new everyday.",
  },
  {
    id: "academic",
    title: "Academic Excellence",
    desc: "Master your studies with focus.",
  },
  {
    id: "career",
    title: "Career Growth",
    desc: "Advance your professional skill set.",
  },
  {
    id: "mental",
    title: "Mental Sharpness",
    desc: "Keep your cognitive edge sharp.",
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const completeOnboarding = useUserStore((state) => state.completeOnboarding);
  const router = useRouter();

  const [activeGoal, setActiveGoal] = useState<string>("Personal Interest");
  const [activeDuration, setActiveDuration] = useState<number>(10);
  const [currentIndex, setCurrentIndex] = useState(0);

  const scrollRef = useRef<ScrollView>(null);

  const handleStart = () => {
    completeOnboarding(activeGoal, activeDuration);
    router.replace("/");
  };

  const handleScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / SCREEN_WIDTH);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const scrollToNext = () => {
    if (currentIndex < 2) {
      scrollRef.current?.scrollTo({
        x: SCREEN_WIDTH * (currentIndex + 1),
        animated: true,
      });
    }
  };

  const handleBottomButton = () => {
    if (currentIndex === 2) {
      handleStart();
    } else {
      scrollToNext();
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        pagingEnabled
        horizontal
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      >
        {/* Slide 1: Goal Selection */}
        <View
          style={[
            {
              width: SCREEN_WIDTH,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
            styles.slide,
          ]}
        >
          <View style={styles.headerBlock}>
            <Text style={styles.overline}>Your Journey</Text>
            <Text style={styles.title}>What&apos;s your goal?</Text>
          </View>

          <View style={styles.listContainer}>
            {GOALS.map((goal) => {
              const isActive = activeGoal === goal.title;
              return (
                <TouchableOpacity
                  key={goal.id}
                  style={[styles.goalCard, isActive && styles.goalCardActive]}
                  onPress={() => setActiveGoal(goal.title)}
                  activeOpacity={0.7}
                >
                  <View style={styles.goalCardText}>
                    <Text
                      style={[
                        styles.goalCardTitle,
                        isActive && styles.goalCardTitleActive,
                      ]}
                    >
                      {goal.title}
                    </Text>
                    <Text
                      style={[
                        styles.goalCardDesc,
                        isActive && styles.goalCardDescActive,
                      ]}
                    >
                      {goal.desc}
                    </Text>
                  </View>
                  {isActive && (
                    <CircleCheck size={20} color={tokens.colors.accent} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Slide 2: Duration Selection */}
        <View
          style={[
            {
              width: SCREEN_WIDTH,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
            styles.slide,
          ]}
        >
          <View style={styles.headerBlock}>
            <Text style={styles.overline}>Daily Habit</Text>
            <Text style={styles.title}>
              How much time can you commit each day?
            </Text>
          </View>

          <View style={[styles.listContainer, styles.commitmentRow]}>
            {[5, 10, 15, 30].map((min) => {
              const isActive = activeDuration === min;
              return (
                <TouchableOpacity
                  key={min}
                  style={[styles.durPill, isActive && styles.durPillActive]}
                  onPress={() => setActiveDuration(min)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.durText, isActive && styles.durTextActive]}
                  >
                    {min} min
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Slide 3: Confirmation */}
        <View
          style={[
            {
              width: SCREEN_WIDTH,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
            styles.slide,
          ]}
        >
          <View style={[styles.listContainer, { justifyContent: "center" }]}>
            <View style={styles.centerGraphic}>
              <View style={styles.lockCircle}>
                <Lock size={40} color={tokens.colors.accent} />
              </View>
              <Text style={styles.headingCenter}>You&apos;re all set</Text>
              <Text style={styles.subheadingCenter}>
                A little progress every day beats a burst every month.
                Let&apos;s lock in.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <Animated.View
        entering={FadeInDown.delay(100).springify()}
        style={[styles.bottomButtonContainer, { bottom: insets.bottom + 20 }]}
      >
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={handleBottomButton}
          activeOpacity={0.8}
        >
          <Text style={styles.btnPrimaryText}>
            {currentIndex === 2 ? "Start Learning" : "Continue"}
          </Text>
        </TouchableOpacity>
        <View style={[styles.dotsContainer]} pointerEvents="none">
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex && styles.dotActive]}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.base,
  },
  slide: {
    width: SCREEN_WIDTH,
    justifyContent: "flex-start",
  },
  headerBlock: {
    paddingTop: 64,
    paddingHorizontal: 32,
  },
  overline: {
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textTertiary,
  },
  title: {
    fontSize: tokens.fontSize["3xl"],
    fontFamily: tokens.fontFamily.display,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
    marginTop: 8,
    letterSpacing: -0.5,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 16,
    gap: 12,
  },
  commitmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignSelf: "flex-start",
  },
  goalCard: {
    padding: 20,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius["3xl"],
    borderWidth: 2,
    borderColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  goalCardActive: {
    borderColor: tokens.colors.accent,
  },
  goalCardText: {
    flex: 1,
    paddingRight: 16,
  },
  goalCardTitle: {
    fontSize: tokens.fontSize.xl,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
  },
  goalCardTitleActive: {},
  goalCardDesc: {
    fontSize: tokens.fontSize.base,
    fontFamily: tokens.fontFamily.body,
    color: tokens.colors.textSecondary,
    marginTop: 4,
    fontWeight: tokens.fontWeight.medium,
  },
  goalCardDescActive: {},
  durPill: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.surface,
  },
  durPillActive: {
    backgroundColor: tokens.colors.accent,
    borderColor: tokens.colors.accent,
    boxShadow: "0 4px 12px rgba(0, 113, 227, 0.25)",
  },
  durText: {
    fontSize: tokens.fontSize.lg,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textSecondary,
  },
  durTextActive: {
    color: "#FFFFFF",
  },
  centerGraphic: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  lockCircle: {
    width: 120,
    height: 120,
    backgroundColor: "rgba(0, 113, 227, 0.08)",
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  headingCenter: {
    fontSize: tokens.fontSize["4xl"],
    fontFamily: tokens.fontFamily.display,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -1,
  },
  subheadingCenter: {
    fontSize: tokens.fontSize.xl,
    fontFamily: tokens.fontFamily.body,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.textSecondary,
    textAlign: "center",
    lineHeight: 28,
  },
  btnPrimary: {
    backgroundColor: tokens.colors.accent,
    width: "100%",
    paddingVertical: 18,
    borderRadius: tokens.radius.full,
    alignItems: "center",
    boxShadow: "0 4px 12px rgba(0, 113, 227, 0.25)",
  },
  btnPrimaryText: {
    color: "#FFFFFF",
    fontSize: tokens.fontSize.xl,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
  },
  bottomButtonContainer: {
    flexDirection: "column",
    position: "absolute",
    left: 0,
    right: 0,
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 18,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.textTertiary,
  },
  dotActive: {
    backgroundColor: tokens.colors.accent,
    width: 24,
  },
});
