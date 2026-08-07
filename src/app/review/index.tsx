import { BottomNav } from "@/components/BottomNav";
import { tokens } from "@/theme/tokens";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Check, Smartphone, X, Zap } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReviewsStore } from "../../store/reviews";

export default function ReviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { dueCards, currentIndex, loading, completed, loadDue, rate } =
    useReviewsStore();
  const { topicId } = useLocalSearchParams();

  const [flipped, setFlipped] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setFlipped(false);
      loadDue(topicId as string | undefined);
    }, [loadDue, topicId])
  );

  const toggleFlip = () => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        300,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    setFlipped((f) => !f);
  };

  const handleRate = (quality: number) => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        250,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    setFlipped(false);
    void rate(quality);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={tokens.colors.accent} />
        <Text style={styles.loadingText}>Loading your reviews...</Text>
      </View>
    );
  }

  if (completed) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>REVIEWS</Text>
        </View>
        <View style={styles.completeWrap}>
          <View style={styles.completeIcon}>
            <Check size={40} color={tokens.colors.accent} />
          </View>
          <Text style={styles.completeTitle}>
            {dueCards.length === 0 &&
            Object.keys(useReviewsStore.getState().ratings).length === 0
              ? "Nothing due — you're all caught up"
              : "Review complete!"}
          </Text>
          <Text style={styles.completeSubtitle}>
            Spaced repetition keeps your knowledge sharp. Check back soon.
          </Text>
        </View>
        <BottomNav activeScreen="home" />
      </View>
    );
  }

  const card = dueCards[currentIndex];
  if (!card) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.exitBtn}
          >
            <X size={16} color={tokens.colors.textSecondary} />
            <Text style={styles.exitText}>Exit</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>REVIEWS</Text>
          <Text style={styles.counter}>0/0</Text>
        </View>

        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconBox}>
            <Zap size={32} color={tokens.colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubtitle}>
            No reviews due right now. Knowledge compounds with time — come back
            later to keep it sharp.
          </Text>
          <Text style={styles.emptyTip}>
            💡 Generate review cards from your topics to build your queue.
          </Text>
        </View>

        <BottomNav activeScreen="home" />
      </View>
    );
  }

  const progress =
    dueCards.length > 0 ? Math.min(1, currentIndex / dueCards.length) : 0;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.exitBtn}>
          <X size={16} color={tokens.colors.textSecondary} />
          <Text style={styles.exitText}>Exit</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>REVIEWS</Text>
        <Text style={styles.counter}>
          {currentIndex + 1}/{dueCards.length}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.round(progress * 100)}%` },
          ]}
        />
      </View>

      <View style={styles.cardArea}>
        <TouchableOpacity
          style={styles.cardTouchable}
          activeOpacity={1}
          onPress={toggleFlip}
        >
          <View style={styles.card}>
            <View
              style={[
                styles.cardFace,
                styles.cardFront,
                flipped && styles.cardFaceHidden,
              ]}
            >
              <View style={styles.cardTagRow}>
                <Text style={styles.cardTag}>
                  {card.concept_tags[0] || "recall"}
                </Text>
                <Text style={styles.cardHint}>TAP TO REVEAL</Text>
              </View>
              <View style={styles.cardFrontContent}>
                <Text style={styles.cardFrontText}>{card.prompt}</Text>
              </View>
            </View>
            <View
              style={[
                styles.cardFace,
                styles.cardBack,
                !flipped && styles.cardFaceHidden,
              ]}
            >
              <View style={styles.cardTagRow}>
                <Text style={styles.cardTagBack}>
                  {card.concept_tags[0] || "answer"}
                </Text>
                <Text style={styles.cardHint}>HOW WELL DID YOU REMEMBER?</Text>
              </View>
              <View style={styles.cardBackContent}>
                <Text style={styles.cardBackText}>{card.answer}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {!flipped ? (
        <View style={[styles.tapHintWrap, { bottom: insets.bottom + 32 }]}>
          <Smartphone size={16} color={tokens.colors.textTertiary} />
          <Text style={styles.tapHint}>Tap the card to reveal the answer</Text>
        </View>
      ) : (
        <View style={[styles.actions, { bottom: Math.max(insets.bottom, 24) }]}>
          <TouchableOpacity
            style={[styles.rateBtn, styles.againBtn]}
            activeOpacity={0.8}
            onPress={() => handleRate(1)}
          >
            <Text style={styles.rateBtnText}>Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rateBtn, styles.goodBtn]}
            activeOpacity={0.8}
            onPress={() => handleRate(3)}
          >
            <Text style={styles.rateBtnText}>Good</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rateBtn, styles.easyBtn]}
            activeOpacity={0.8}
            onPress={() => handleRate(5)}
          >
            <Text style={styles.rateBtnText}>Easy</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.base,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: tokens.colors.textSecondary,
    marginTop: 16,
    fontFamily: tokens.fontFamily.bodyMedium,
    fontWeight: tokens.fontWeight.semibold,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  exitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 70,
  },
  exitText: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: tokens.colors.textPrimary,
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 1,
  },
  counter: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    minWidth: 70,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  progressTrack: {
    width: "100%",
    height: 4,
    backgroundColor: tokens.colors.base,
  },
  progressFill: {
    height: "100%",
    backgroundColor: tokens.colors.accent,
  },
  cardArea: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  cardTouchable: {
    aspectRatio: 0.8,
    maxHeight: "80%",
  },
  card: {
    flex: 1,
  },
  cardFace: {
    ...StyleSheet.absoluteFill,
    borderRadius: tokens.radius["3xl"],
    padding: 32,
    justifyContent: "flex-start",
    alignItems: "stretch",
  },
  cardFront: {
    backgroundColor: tokens.colors.surface,
    boxShadow: tokens.shadow.lg,
  },
  cardBack: {
    backgroundColor: "rgba(0, 113, 227, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(0, 113, 227, 0.12)",
  },
  cardFaceHidden: {
    opacity: 0,
  },
  cardTagRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  cardFrontContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cardBackContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTag: {
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.accent,
    textTransform: "uppercase",
    letterSpacing: 1,
    backgroundColor: "rgba(0, 113, 227, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
    overflow: "hidden",
  },
  cardTagBack: {
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.accent,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardHint: {
    fontSize: 9,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textTertiary,
    letterSpacing: 0.5,
  },
  cardFrontText: {
    fontSize: tokens.fontSize["2xl"],
    fontFamily: tokens.fontFamily.display,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
    lineHeight: 32,
    textAlign: "center",
  },
  cardBackText: {
    fontSize: tokens.fontSize.xl,
    fontFamily: tokens.fontFamily.bodyMedium,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.textPrimary,
    lineHeight: 28,
    textAlign: "center",
  },
  tapHintWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  tapHint: {
    color: tokens.colors.textTertiary,
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.bodyMedium,
    fontWeight: tokens.fontWeight.semibold,
  },
  actions: {
    position: "absolute",
    left: 24,
    right: 24,
    flexDirection: "row",
    gap: 12,
  },
  rateBtn: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: tokens.radius.full,
    alignItems: "center",
  },
  againBtn: {
    backgroundColor: "#fecaca",
  },
  goodBtn: {
    backgroundColor: "rgba(0, 113, 227, 0.18)",
  },
  easyBtn: {
    backgroundColor: "#bbf7d0",
  },
  rateBtnText: {
    color: tokens.colors.textPrimary,
    fontSize: tokens.fontSize.md,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  completeWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  completeIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(0, 113, 227, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  completeTitle: {
    fontSize: tokens.fontSize["2xl"],
    fontFamily: tokens.fontFamily.display,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
    textAlign: "center",
  },
  completeSubtitle: {
    fontSize: tokens.fontSize.md,
    fontFamily: tokens.fontFamily.body,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0, 113, 227, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: tokens.fontSize["2xl"],
    fontFamily: tokens.fontFamily.display,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: tokens.fontSize.md,
    fontFamily: tokens.fontFamily.body,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  emptyTip: {
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.bodyMedium,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.accent,
    textAlign: "center",
  },
});
