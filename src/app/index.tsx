import { Header } from "@/components/Header";
import { HeroStreakCard } from "@/components/HeroStreakCard";
import { StatRow } from "@/components/StatRow";
import { TopicCard } from "@/components/TopicCard";
import { useFocusEffect, useRouter } from "expo-router";
import { Book, RefreshCcw, Timer, X, Zap } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  createTopic,
  generateAllReviewCards,
  generateTopicAssessment,
  getActivity,
  getMe,
  isAbortError,
  listTopics,
  proficiencyToApi,
} from "../lib/api";
import { useAuthStore } from "../store/auth";
import { useReviewsStore } from "../store/reviews";
import { useSessionStore } from "../store/session";
import { Topic, useTopicsStore } from "../store/topics";
import { useUIStore } from "../store/ui";
import { useUserStore } from "../store/user";
import { tokens } from "../theme/tokens";

const TOPIC_EMOJIS = ["📐", "🧮", "📊", "🧠", "💡", "🔬"];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const streakCount = useUserStore((state) => state.streakCount);
  const activityHistory = useUserStore((state) => state.activityHistory);
  const dailyCommitment = useUserStore((state) => state.dailyCommitment);
  const topics = useTopicsStore((state) => state.topics);
  const addTopic = useTopicsStore((state) => state.addTopic);
  const setTopics = useTopicsStore((state) => state.setTopics);
  const hydrateUser = useUserStore((state) => state.hydrateFromServer);
  const setActivityHistory = useUserStore((state) => state.setActivityHistory);
  const dueCards = useReviewsStore((state) => state.dueCards);
  const loadDue = useReviewsStore((state) => state.loadDue);
  const fetchDueCount = useReviewsStore((state) => state.fetchDueCount);
  const dueCount = dueCards.length;
  const setOnAddPress = useUIStore((state) => state.setOnAddPress);
  const consumeAutoOpenAddModal = useUIStore(
    (state) => state.consumeAutoOpenAddModal
  );

  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [topicName, setTopicName] = useState("");
  const [selectedProficiency, setSelectedProficiency] = useState<
    "beginner" | "intermediate" | "advanced"
  >("beginner");
  const [isGenerating, setIsGenerating] = useState(false);
  const [reviewGenerating, setReviewGenerating] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];
  const todayData = activityHistory.find((a) => a.day === todayStr);
  const todayTimeSec = todayData?.total_time || 0;
  const todayTimeMin = Math.round(todayTimeSec / 60);
  const todayMet = dailyCommitment
    ? todayTimeSec >= dailyCommitment * 60
    : false;

  const pastDaysActive: boolean[] = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().split("T")[0];
    return activityHistory.some(
      (a) => a.day === dayStr && a.total_time >= (dailyCommitment || 0) * 60
    );
  });

  const daysActive = pastDaysActive.filter(Boolean).length + (todayMet ? 1 : 0);

  const token = useAuthStore((state) => state.token);

  useFocusEffect(
    useCallback(() => {
      setOnAddPress(() => setShowModal(true));
      let timer: ReturnType<typeof setTimeout> | null = null;
      if (consumeAutoOpenAddModal()) {
        timer = setTimeout(() => setShowModal(true), 200);
      }
      return () => {
        setOnAddPress(null);
        if (timer) clearTimeout(timer);
      };
    }, [setOnAddPress, consumeAutoOpenAddModal])
  );

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();

      const run = async () => {
        if (!token) return;
        try {
          const [userData, activityInfo, apiTopics] = await Promise.all([
            getMe(controller.signal),
            getActivity(controller.signal),
            listTopics(controller.signal),
          ]);

          if (!controller.signal.aborted) {
            hydrateUser(userData);
            setActivityHistory(activityInfo.activity || []);
          }

          fetchDueCount();

          const mappedTopics: Topic[] = apiTopics.map((t: any) => ({
            id: t.id,
            title: t.title,
            tier: t.tier ?? 1,
            remark: t.remark ?? null,
            accuracyPercent: 0,
            sessionsCompleted: 0,
            weakConcepts: [],
            status: t.status || "completed",
          }));

          if (!controller.signal.aborted) setTopics(mappedTopics);
        } catch (e) {
          if (!isAbortError(e)) {
            console.warn("API sync failed", e);
          }
        }
      };

      void run();

      return () => {
        controller.abort();
      };
    }, [setTopics, token])
  );

  useEffect(() => {
    const hasGeneratingTopic = topics.some((t) => t.status === "generating");
    if (!hasGeneratingTopic || !token) return;

    const interval = setInterval(async () => {
      try {
        const apiTopics = await listTopics();
        const mappedTopics: Topic[] = apiTopics.map((t: any) => ({
          id: t.id,
          title: t.title,
          tier: t.tier ?? 1,
          remark: t.remark ?? null,
          accuracyPercent: 0,
          sessionsCompleted: 0,
          weakConcepts: [],
          status: t.status || "completed",
        }));
        setTopics(mappedTopics);
      } catch (e) {
        console.warn("Polling failed", e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [topics, token, setTopics]);

  const handleCreate = async () => {
    if (!topicName.trim() || isGenerating) return;
    setIsGenerating(true);
    const controller = new AbortController();

    try {
      if (selectedProficiency === "beginner") {
        const { topic: apiTopic } = await createTopic(
          {
            title: topicName.trim(),
            familiarity_level: proficiencyToApi(selectedProficiency),
          },
          controller.signal
        );

        const newTopic: Topic = {
          id: apiTopic.id,
          title: apiTopic.title,
          tier: apiTopic.tier ?? 1,
          remark: apiTopic.remark ?? null,
          accuracyPercent: 0,
          sessionsCompleted: 0,
          weakConcepts: [],
          status: "generating",
        };
        addTopic(newTopic);
        setShowModal(false);
        setTopicName("");
        setSelectedProficiency("beginner");
      } else {
        const res = await generateTopicAssessment(
          {
            title: topicName.trim(),
            familiarity_level: proficiencyToApi(selectedProficiency),
          },
          controller.signal
        );

        useSessionStore.getState().startSession({
          sessionId: `diagnostic-${Date.now()}`,
          type: "diagnostic",
          topicId: res.topic,
          topicTitle: topicName.trim(),
          questions: res.questions,
        });

        setShowModal(false);
        const savedTopicName = topicName.trim();
        setTopicName("");
        setSelectedProficiency("beginner");

        router.push({
          pathname: "/topics/diagnostic/session" as any,
          params: {
            topicName: savedTopicName,
            isDiagnostic: "true",
            proficiency: selectedProficiency,
          },
        });
      }
    } catch (e) {
      if (!isAbortError(e)) {
        console.error(e);
        Alert.alert("Error", "Failed to create topic. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMixedReview = async () => {
    if (reviewGenerating) return;
    setReviewGenerating(true);
    try {
      await generateAllReviewCards();
      await loadDue();
    } catch (e) {
      console.warn("Failed to generate mixed review cards:", e);
      Alert.alert(
        "Error",
        "Couldn't generate review cards. Make sure your topics have completed lessons, then try again."
      );
      Alert.alert(
        "Mixed Review",
        "Couldn't generate review cards right now. Make sure your topics have completed lessons, then try again."
      );
    } finally {
      setReviewGenerating(false);
    }
    router.push("/review" as any);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconBox}>
        <Book size={28} color={tokens.colors.accent} />
      </View>
      <Text style={styles.emptyTitle}>Welcome to LockIn</Text>
      <Text style={styles.emptySubtitle}>Add a new topic to begin.</Text>
      <TouchableOpacity
        style={styles.emptyButton}
        activeOpacity={0.8}
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.emptyButtonText}>Add First Topic</Text>
      </TouchableOpacity>
    </View>
  );

  const mainTopics = topics.length > 0 ? topics : [];
  const heroTopic = mainTopics[0];
  const additionalTopics = mainTopics.slice(1);

  const reviewsDueStats = [
    {
      icon:
        dueCount > 0 ? (
          <RefreshCcw size={18} color={tokens.colors.accent} />
        ) : (
          <Zap size={18} color={tokens.colors.accent} />
        ),
      label: "REVIEWS",
      value: dueCount > 0 ? String(dueCount) : "0",
      sub: dueCount > 0 ? "due today" : "all caught up",
      onPress: () => router.push("/review" as any),
    },
  ];

  const todayStats = [
    {
      icon: <Timer size={18} color={tokens.colors.accent} />,
      label: "TODAY",
      value: `${todayTimeMin}`,
      sub: `of ${dailyCommitment ?? 15} min goal`,
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + tokens.spacing[6] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Header
          greeting={getGreeting()}
          subtitle="Ready to lock in?"
          initials="A"
          onAvatarPress={() => router.push("/profile" as any)}
        />

        <HeroStreakCard
          streakCount={streakCount}
          dailyCommitment={dailyCommitment}
          daysActive={daysActive}
          pastDaysActive={pastDaysActive}
          todayMet={todayMet}
        />

        <StatRow stats={[...(reviewsDueStats || []), ...todayStats]} />

        {(heroTopic || additionalTopics.length > 0) && (
          <TouchableOpacity
            style={styles.mixedReviewCard}
            activeOpacity={0.8}
            onPress={handleMixedReview}
            disabled={reviewGenerating}
          >
            <View style={styles.reviewIconBox}>
              {reviewGenerating ? (
                <ActivityIndicator size="small" color={tokens.colors.accent} />
              ) : (
                <RefreshCcw size={18} color={tokens.colors.accent} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reviewCardTitle}>
                {reviewGenerating
                  ? "Generating review cards..."
                  : "Mixed Review"}
              </Text>
              <Text style={styles.reviewCardSub}>
                {reviewGenerating
                  ? "Prioritizing your weak concepts"
                  : "Fresh cards for every topic — 5 each, focused on weak spots"}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {heroTopic ? (
          <TopicCard
            title={heroTopic.title}
            sessions={heroTopic.sessionsCompleted}
            progress={0}
            emoji={TOPIC_EMOJIS[0]}
            isGenerating={heroTopic.status === "generating"}
            onPress={() =>
              heroTopic.status !== "generating" &&
              router.push(`/topics/${heroTopic.id}`)
            }
          />
        ) : (
          renderEmptyState()
        )}

        {additionalTopics.map((t, i) => (
          <TopicCard
            key={t.id}
            title={t.title}
            sessions={t.sessionsCompleted}
            progress={0}
            emoji={TOPIC_EMOJIS[(i + 1) % TOPIC_EMOJIS.length]}
            isGenerating={t.status === "generating"}
            onPress={() =>
              t.status !== "generating" && router.push(`/topics/${t.id}`)
            }
          />
        ))}
      </ScrollView>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={() => setShowModal(false)}
              activeOpacity={1}
            />

            <View
              style={[
                styles.modalSheet,
                { paddingBottom: Math.max(insets.bottom, 24) },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Topic</Text>
                <TouchableOpacity
                  onPress={() => setShowModal(false)}
                  style={styles.modalClose}
                >
                  <X size={24} color={tokens.colors.textTertiary} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Topic Name</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter topic name"
                  placeholderTextColor={tokens.colors.textTertiary}
                  value={topicName}
                  onChangeText={setTopicName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Proficiency Level</Text>

                {(["beginner", "intermediate", "advanced"] as const).map(
                  (level) => {
                    const isActive = selectedProficiency === level;
                    const label =
                      level.charAt(0).toUpperCase() + level.slice(1);
                    const desc =
                      level === "beginner"
                        ? "New to this topic"
                        : level === "intermediate"
                        ? "Some experience"
                        : "Expert level";

                    return (
                      <TouchableOpacity
                        key={level}
                        activeOpacity={0.7}
                        onPress={() => setSelectedProficiency(level)}
                        style={[
                          styles.profCard,
                          isActive && styles.profCardActive,
                        ]}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 6,
                          }}
                        >
                          <View
                            style={[
                              styles.profDot,
                              isActive && styles.profDotActive,
                            ]}
                          />
                          <Text style={styles.profTitle}>{label}</Text>
                        </View>
                        <Text style={styles.profDesc}>{desc}</Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.btnCancel}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={styles.btnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnSubmit}
                  onPress={handleCreate}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.btnSubmitText}>Add Topic</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.base,
  },
  scrollContent: {
    paddingHorizontal: tokens.spacing[6],
    paddingBottom: 160,
    gap: tokens.spacing[4],
  },
  emptyCard: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius["3xl"],
    padding: tokens.spacing[8],
    alignItems: "center",
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.base,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: tokens.spacing[5],
  },
  emptyTitle: {
    fontSize: tokens.fontSize["2xl"],
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.textSecondary,
    marginTop: tokens.spacing[1],
    marginBottom: tokens.spacing[6],
  },
  emptyButton: {
    backgroundColor: tokens.colors.accent,
    paddingVertical: tokens.spacing[4],
    paddingHorizontal: tokens.spacing[8],
    borderRadius: tokens.radius.full,
  },
  emptyButtonText: {
    color: "#ffffff",
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.semibold,
  },
  reviewCard: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing[4],
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[3],
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  mixedReviewCard: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing[4],
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[3],
    borderWidth: 1,
    borderColor: "rgba(0, 113, 227, 0.2)",
  },
  reviewIconBox: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.colors.base,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  reviewCardTitle: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
  },
  reviewCardSub: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textSecondary,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: tokens.colors.darkBase,
    borderTopLeftRadius: tokens.radius["3xl"],
    borderTopRightRadius: tokens.radius["3xl"],
    padding: tokens.spacing[8],
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: tokens.spacing[6],
  },
  modalTitle: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.bold,
    color: "#ffffff",
  },
  modalClose: {
    padding: tokens.spacing[1],
  },
  formGroup: {
    marginBottom: tokens.spacing[6],
  },
  formLabel: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.textSecondary,
    marginBottom: tokens.spacing[3],
  },
  formInput: {
    backgroundColor: tokens.colors.darkSurface,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    color: "#ffffff",
    padding: tokens.spacing[4],
    fontSize: tokens.fontSize.lg,
  },
  profCard: {
    backgroundColor: tokens.colors.darkSurface,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing[4],
    marginBottom: tokens.spacing[3],
  },
  profCardActive: {
    backgroundColor: "rgba(0, 113, 227, 0.1)",
    borderColor: tokens.colors.accent,
  },
  profDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    marginRight: tokens.spacing[3],
  },
  profDotActive: {
    borderColor: tokens.colors.accent,
    backgroundColor: tokens.colors.accent,
  },
  profTitle: {
    color: "#ffffff",
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.bold,
  },
  profDesc: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.fontSize.base,
    marginLeft: 28,
  },
  modalActions: {
    flexDirection: "row",
    gap: tokens.spacing[4],
    marginTop: tokens.spacing[2],
  },
  btnCancel: {
    flex: 1,
    backgroundColor: tokens.colors.darkSurface,
    paddingVertical: tokens.spacing[4],
    borderRadius: tokens.radius.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  btnCancelText: {
    color: "#ffffff",
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.semibold,
  },
  btnSubmit: {
    flex: 1,
    backgroundColor: tokens.colors.accent,
    paddingVertical: tokens.spacing[4],
    borderRadius: tokens.radius.sm,
    alignItems: "center",
  },
  btnSubmitText: {
    color: "#ffffff",
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.semibold,
  },
});
