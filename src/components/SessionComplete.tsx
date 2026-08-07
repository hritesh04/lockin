import { tokens } from "@/theme/tokens";
import {
  BookOpen,
  RefreshCcw,
  Target,
  Zap,
} from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UserAnswer } from "../store/session";
import { useUserStore } from "../store/user";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const CONFETTI_COLORS = ["#0071e3", "#60a5fa", "#818cf8", "#facc15"];

function ConfettiParticle() {
  const yAnim = useRef(new Animated.Value(100)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opAnim = useRef(new Animated.Value(1)).current;

  const left = useRef(Math.random() * 100).current;
  const size = useRef(8 + Math.random() * 8).current;
  const color = useRef(
    CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]
  ).current;
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
          }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
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
              outputRange: ["0deg", "360deg"],
            }),
          },
        ],
      }}
    />
  );
}

function Confetti() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: 24 }).map((_, i) => (
        <ConfettiParticle key={i} />
      ))}
    </View>
  );
}

interface Props {
  topicTitle: string;
  topicId: string;
  score: number;
  total: number;
  onContinue: () => void;
  onDashboard: () => void;
  onReviewNow?: () => void;
  showReviewQueue?: boolean;
  userAnswers?: UserAnswer[];
  hasLesson?: boolean;
  nextLessonId?: string;
  lessonId?: string;
}

export default function SessionComplete({
  topicTitle,
  topicId,
  score,
  total,
  onContinue,
  onDashboard,
  onReviewNow,
  showReviewQueue,
  userAnswers,
  hasLesson,
  nextLessonId,
  lessonId,
}: Props) {
  const insets = useSafeAreaInsets();
  const streakCount = useUserStore((s) => s.streakCount);

  const springAnim = useRef(new Animated.Value(0.3)).current;
  const springOpAnim = useRef(new Animated.Value(0)).current;

  const slideAnim1 = useRef(new Animated.Value(0)).current;
  const slideAnim2 = useRef(new Animated.Value(0)).current;
  const slideAnim3 = useRef(new Animated.Value(0)).current;
  const slideAnim4 = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
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

    Animated.stagger(150, [
      Animated.parallel([
        Animated.spring(springAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(springOpAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(slideAnim1, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim2, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim3, {
        toValue: 1,
        duration: 600,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim4, {
        toValue: 1,
        duration: 600,
        delay: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const slideUpStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [16, 0],
        }),
      },
    ],
  });

  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const displayStreak = streakCount;

  const strategyText =
    percent >= 80
      ? "You got " +
        score +
        "/" +
        total +
        " — sharp. Push a little further next time."
      : "You got " +
        score +
        "/" +
        total +
        " — the ones you missed are exactly what you'll review. That's how growth works.";

  const rated = (userAnswers ?? []).filter((a) => a.confidence);
  const confidentCount = rated.filter(
    (a) => a.confidence === "high" || a.confidence === "med"
  ).length;
  const confidentAndCorrect = rated.filter(
    (a) => (a.confidence === "high" || a.confidence === "med") && a.isCorrect
  ).length;
  const overconfident = rated.filter(
    (a) =>
      (a.confidence === "high" || a.confidence === "med") &&
      a.isCorrect === false
  );
  const underconfidentCorrect = rated.filter(
    (a) => a.confidence === "low" && a.isCorrect === true
  );
  let calibrationText: string | null = null;
  if (rated.length > 0) {
    if (overconfident.length >= 2) {
      calibrationText = `Confident on ${confidentCount} of ${rated.length}, correct on ${confidentAndCorrect} — likely overconfident in a few areas. Review those before next time.`;
    } else if (
      underconfidentCorrect.length >= 2 &&
      confidentAndCorrect >= underconfidentCorrect.length
    ) {
      calibrationText = `Confident on ${confidentCount} of ${rated.length}, correct on ${confidentAndCorrect} — your instincts are sharper than your confidence lets on. Be bolder.`;
    } else {
      calibrationText = `Confident on ${confidentCount} of ${rated.length}, correct on ${confidentAndCorrect} — well calibrated today. Keep rating your confidence.`;
    }
  }

  return (
    <View style={styles.container}>
      <Confetti />

      <View style={styles.content}>
        <View style={styles.badgeContainer}>
          <View style={styles.glowContainer}>
            <Animated.View
              style={[
                styles.badgeGlowSmall,
                { opacity: pulseAnim, transform: [{ scale: springAnim }] },
              ]}
            />
            <Animated.View
              style={[styles.badgeGlowMedium, { opacity: pulseAnim }]}
            />
            <Animated.View
              style={[styles.badgeGlowLarge, { opacity: pulseAnim }]}
            />
          </View>

          <Animated.View
            style={[
              styles.badge,
              {
                opacity: springOpAnim,
                transform: [{ scale: springAnim }],
              },
            ]}
          >
            <View style={styles.streakContainer}>
              <Zap
                size={48}
                color={tokens.colors.accent}
                style={styles.badgeIcon}
              />
              <Text style={styles.streakNumber}>{displayStreak}</Text>
              <Text style={styles.streakLabel}>Day Streak</Text>
            </View>
          </Animated.View>
        </View>

        <Animated.View style={[styles.headingRow, slideUpStyle(slideAnim1)]}>
          <Text style={styles.title}>STREAK SAVED!</Text>
        </Animated.View>
        <Animated.View style={[styles.headingRow, slideUpStyle(slideAnim2)]}>
          <Text style={styles.subtitle}>{strategyText}</Text>
        </Animated.View>

        {showReviewQueue && (
          <Animated.View style={[styles.queueNote, slideUpStyle(slideAnim3)]}>
            <RefreshCcw size={16} color={tokens.colors.accent} />
            <Text style={styles.queueNoteText}>
              Added to your review queue — the ones you missed become review
              cards for tomorrow. Effort now pays off later.
            </Text>
          </Animated.View>
        )}

        {calibrationText && (
          <Animated.View
            style={[styles.calibrationCard, slideUpStyle(slideAnim3)]}
          >
            <View style={styles.calibrationHeader}>
              <Target size={14} color="#f59e0b" />
              <Text style={styles.calibrationLabel}>CALIBRATION</Text>
            </View>
            <Text style={styles.calibrationText}>{calibrationText}</Text>
          </Animated.View>
        )}
      </View>

      <Animated.View
        style={[
          styles.actionsContainer,
          slideUpStyle(slideAnim4),
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        {showReviewQueue && onReviewNow && (
          <TouchableOpacity
            style={styles.reviewBtn}
            activeOpacity={0.8}
            onPress={onReviewNow}
          >
            <RefreshCcw size={14} color="#fff" />
            <Text style={styles.reviewBtnText}>Review This Topic</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.8}
          onPress={onContinue}
        >
          <BookOpen size={14} color="#fff" />
          <Text style={styles.continueBtnText}>Continue Learning</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dashboardBtn}
          activeOpacity={0.8}
          onPress={onDashboard}
        >
          <Text style={styles.dashboardBtnText}>Back to Topic</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.base,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    marginTop: 40,
    width: 220,
    height: 220,
  },
  glowContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeGlowSmall: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(0, 113, 227, 0.15)",
  },
  badgeGlowMedium: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(0, 113, 227, 0.08)",
  },
  badgeGlowLarge: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(0, 113, 227, 0.04)",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 32,
    zIndex: 10,
    width: "100%",
    top: -50,
    paddingBottom: 100,
  },
  badge: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: tokens.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: tokens.colors.surface,
    // @ts-ignore
    boxShadow: tokens.shadow.lg,
  },
  streakContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -10,
  },
  badgeIcon: {
    marginBottom: 2,
  },
  streakNumber: {
    fontFamily: tokens.fontFamily.display,
    fontSize: 30,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
    lineHeight: 44,
  },
  streakLabel: {
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    textTransform: "uppercase",
    color: tokens.colors.accent,
    letterSpacing: 1.5,
  },
  headingRow: {
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontFamily: tokens.fontFamily.display,
    fontSize: tokens.fontSize["2xl"],
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
    textTransform: "uppercase",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: tokens.fontSize.md,
    fontFamily: tokens.fontFamily.body,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.textSecondary,
    textAlign: "center",
  },
  queueNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius["2xl"],
    padding: 16,
    marginTop: 24,
    maxWidth: 320,
  },
  queueNoteText: {
    flex: 1,
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.bodyMedium,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.textPrimary,
    lineHeight: 20,
  },
  calibrationCard: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius["2xl"],
    padding: 16,
    marginTop: 12,
    maxWidth: 320,
    gap: 8,
  },
  calibrationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  calibrationLabel: {
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: "#f59e0b",
    letterSpacing: 1,
  },
  calibrationText: {
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.bodyMedium,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.textPrimary,
    lineHeight: 20,
  },
  actionsContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 40,
    width: "100%",
    zIndex: 10,
  },
  continueBtn: {
    backgroundColor: tokens.colors.accent,
    borderRadius: tokens.radius.full,
    paddingVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    // @ts-ignore
    boxShadow: "0 4px 12px rgba(0, 113, 227, 0.25)",
    marginBottom: 8,
  },
  continueBtnText: {
    color: "#FFFFFF",
    fontSize: tokens.fontSize.lg,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
  },
  reviewBtn: {
    backgroundColor: tokens.colors.darkBase,
    borderRadius: tokens.radius.full,
    paddingVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  reviewBtnText: {
    color: "#fff",
    fontSize: tokens.fontSize.lg,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
  },
  dashboardBtn: {
    paddingVertical: 16,
    alignItems: "center",
  },
  dashboardBtnText: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.fontSize.base,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
  },
});
