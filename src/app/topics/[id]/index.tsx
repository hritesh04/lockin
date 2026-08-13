import { generateReviewCards, getRoadmap } from "@/lib/api";
import { tokens } from "@/theme/tokens";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Pencil,
  Play,
  RefreshCcw,
  RotateCcw,
  SquareCheck,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../../store/auth";
import { useLessonStore } from "../../../store/lessons";
import { useModuleStore } from "../../../store/modules";
import { useTopicsStore } from "../../../store/topics";

export default function TopicDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const topics = useTopicsStore((state) => state.topics);
  const topic = topics.find((t) => t.id === id);

  const { setModules, getModulesByTopic } = useModuleStore();
  const { setLessons, getLessonsByModule } = useLessonStore();

  const roadmap = typeof id === "string" ? getModulesByTopic(id) : [];

  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [generatingCards, setGeneratingCards] = useState(false);
  const [stats, setStats] = useState({
    sessionsCompleted: 0,
    totalTimeSeconds: 0,
  });

  const token = useAuthStore((state) => state.token);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      const targetId =
        typeof id === "string" ? id : Array.isArray(id) ? id[0] : null;
      if (!targetId) return;

      const controller = new AbortController();
      getRoadmap(targetId, controller.signal)
        .then((data) => {
          setStats({
            sessionsCompleted: data.sessionsCompleted,
            totalTimeSeconds: data.totalTimeSeconds,
          });

          setModules(data.modules.map((m) => ({ ...m, topicId: targetId })));

          const allLessons: any[] = [];
          data.modules.forEach((m) => {
            if (m.lessons) {
              allLessons.push(
                ...m.lessons.map((l: any) => ({ ...l, nodeId: m.id }))
              );
            }
          });
          setLessons(allLessons);
        })
        .catch((err) => {
          if (!controller.signal.aborted) {
            console.error("Failed to load roadmap:", err);
          }
        });

      return () => {
        controller.abort();
      };
    }, [id, token])
  );

  if (!topic) {
    return (
      <View style={styles.container}>
        <Text style={{ color: tokens.colors.textPrimary }}>
          Topic not found
        </Text>
      </View>
    );
  }

  const handleStartSession = (mode: "options" | "text") => {
    router.push({
      pathname: `/topics/${id}/session` as any,
      params: { quizMode: mode },
    });
  };

  const toggleNodeInfo = (nodeId: string) => {
    setExpandedNode((prev) => (prev === nodeId ? null : nodeId));
  };

  const handleGenerateReviewCards = async () => {
    if (generatingCards) return;
    setGeneratingCards(true);
    try {
      const targetId =
        typeof id === "string" ? id : Array.isArray(id) ? id[0] : null;
      if (!targetId) return;
      await generateReviewCards(targetId);
    } catch (e: any) {
      console.warn("Failed to generate review cards", e);
      const msg =
        e?.response?.data?.error ||
        "Failed to generate review cards. Try again later.";
      Alert.alert("Error", msg);
    } finally {
      setGeneratingCards(false);
    }
  };

  const inProgressModule = roadmap.find((m) => m.status === "in-progress");
  let continueLessonId: string | null = null;
  if (inProgressModule) {
    const lessons = getLessonsByModule(inProgressModule.id);
    const inProgressLesson = lessons.find((l) => l.status === "in-progress");
    if (inProgressLesson) {
      continueLessonId = inProgressLesson.id;
    } else if (lessons.length > 0) {
      continueLessonId = lessons[0].id;
    }
  }

  const completedModulesCount = roadmap.filter(
    (m) => m.status === "completed"
  ).length;

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace("/")}
          style={styles.backButton}
        >
          <ChevronLeft size={20} color={tokens.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroInfo}>
            <Text style={styles.topicName}>{topic.title}</Text>
          </View>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => {
              if (continueLessonId) {
                router.push(`/topics/${id}/${continueLessonId}`);
              }
            }}
            activeOpacity={0.8}
            disabled={!continueLessonId}
          >
            <Play size={16} color="#FFF" />
            <Text style={styles.continueBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modesSection}>
          <Text style={styles.sectionTitle}>SELECT SESSION MODE</Text>
          <View style={styles.modeList}>
            <TouchableOpacity
              style={styles.modeCard}
              onPress={() => handleStartSession("options")}
              activeOpacity={0.7}
            >
              <View style={styles.modeIconBox}>
                <SquareCheck size={20} color={tokens.colors.accent} />
              </View>
              <View style={styles.modeContent}>
                <Text style={styles.modeName}>Mastery Quiz</Text>
                <Text style={styles.modeDesc}>MCQ & True/False questions</Text>
              </View>
              <ChevronRight size={18} color={tokens.colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modeCard}
              onPress={() => handleStartSession("text")}
              activeOpacity={0.7}
            >
              <View style={styles.modeIconBox}>
                <Pencil size={20} color={tokens.colors.accent} />
              </View>
              <View style={styles.modeContent}>
                <Text style={styles.modeName}>Deep Dive</Text>
                <Text style={styles.modeDesc}>
                  Short Answer & Fill-in-blanks
                </Text>
              </View>
              <ChevronRight size={18} color={tokens.colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.modeList}>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <RotateCcw
                size={16}
                color={tokens.colors.textSecondary}
                style={{ marginBottom: 12 }}
              />
              <Text style={styles.statValue}>{stats.sessionsCompleted}</Text>
              <Text style={styles.statLabel}>SESSIONS</Text>
            </View>
            <View style={styles.statBox}>
              <Clock
                size={16}
                color={tokens.colors.textSecondary}
                style={{ marginBottom: 12 }}
              />
              <Text style={styles.statValue}>
                {formatTime(stats.totalTimeSeconds)}
              </Text>
              <Text style={styles.statLabel}>TIME SPENT</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.reviewGenCard}
            activeOpacity={0.8}
            onPress={handleGenerateReviewCards}
            disabled={generatingCards}
          >
            <View style={styles.reviewGenIconBox}>
              <RefreshCcw size={18} color={tokens.colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reviewGenTitle}>
                {generatingCards
                  ? "Generating review cards..."
                  : "Generate review cards"}
              </Text>
              <Text style={styles.reviewGenSub}>
                AI builds spaced-repetition flashcards from this roadmap.
              </Text>
            </View>
            {generatingCards ? (
              <ActivityIndicator size="small" color={tokens.colors.accent} />
            ) : (
              <ChevronRight size={18} color={tokens.colors.textTertiary} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.timelineSection}>
          <View style={styles.timelineHeader}>
            <Text style={styles.sectionTitle}>ROADMAP</Text>
            <Text
              style={styles.timelineCount}
            >{`${completedModulesCount} / ${roadmap.length} Modules Completed`}</Text>
          </View>
          <View style={styles.timelineList}>
            {roadmap.map((module) => {
              const isExpanded = expandedNode === module.id;
              const lessons = getLessonsByModule(module.id);
              const completedLessons = lessons.filter(
                (l) => l.status === "completed"
              ).length;

              return (
                <View
                  key={module.id}
                  style={[
                    styles.timelineItem,
                    module.status === "locked" && { opacity: 0.5 },
                  ]}
                >
                  {module.status === "completed" && (
                    <>
                      <View
                        style={[
                          styles.timelineNode,
                          styles.timelineNodeCompleted,
                        ]}
                      >
                        <Check size={10} color="#FFF" />
                      </View>
                      <View
                        style={[
                          styles.timelineLine,
                          styles.timelineLineCompleted,
                        ]}
                      />
                    </>
                  )}
                  {module.status === "in-progress" && (
                    <>
                      <View
                        style={[
                          styles.timelineNode,
                          styles.timelineNodeCurrent,
                        ]}
                      >
                        <View style={styles.timelineNodeDot} />
                      </View>
                      <View style={styles.timelineLine} />
                    </>
                  )}
                  {module.status === "locked" && (
                    <>
                      <View style={styles.timelineNode} />
                      {module.id !== roadmap[roadmap.length - 1].id && (
                        <View style={styles.timelineLine} />
                      )}
                    </>
                  )}

                  <View style={styles.timelineContentWrapper}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => toggleNodeInfo(module.id)}
                      style={styles.timelineContentHeader}
                    >
                      <View style={styles.timelineContent}>
                        <Text style={styles.milestoneTitle}>
                          {module.title}
                        </Text>
                        <Text
                          style={[
                            styles.milestoneDesc,
                            module.status === "in-progress" && {
                              color: tokens.colors.accent,
                              fontFamily: tokens.fontFamily.bodyBold,
                              fontWeight: tokens.fontWeight.bold,
                            },
                          ]}
                        >
                          {module.description}
                        </Text>
                      </View>
                      <View style={styles.timelineProgress}>
                        <Text style={styles.progressText}>
                          {completedLessons}/{lessons.length}
                        </Text>
                        {isExpanded ? (
                          <ChevronUp
                            size={14}
                            color={tokens.colors.textSecondary}
                          />
                        ) : (
                          <ChevronDown
                            size={14}
                            color={tokens.colors.textSecondary}
                          />
                        )}
                      </View>
                    </TouchableOpacity>

                    {isExpanded && lessons.length > 0 && (
                      <View style={styles.lessonsContainer}>
                        {lessons.map((lesson) => (
                          <TouchableOpacity
                            key={lesson.id}
                            style={[
                              styles.lessonCard,
                              lesson.status === "locked" &&
                                module.status !== "locked" && { opacity: 0.5 },
                            ]}
                            disabled={lesson.status === "locked"}
                            onPress={() => {
                              if (lesson.status === "locked") return;
                              router.push(`/topics/${id}/${lesson.id}`);
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.lessonInfo}>
                              <Text style={styles.lessonTitle}>
                                {lesson.title}
                              </Text>
                              <Text style={styles.lessonDesc} numberOfLines={2}>
                                {lesson.description}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.base,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.surface,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 113, 227, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    gap: 6,
  },
  noStreakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    gap: 6,
  },
  streakText: {
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.accent,
  },
  noStreakText: {
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textSecondary,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  heroSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  heroInfo: {
    flex: 1,
    gap: 4,
  },
  topicName: {
    fontSize: tokens.fontSize["4xl"],
    fontFamily: tokens.fontFamily.display,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
    letterSpacing: -1,
  },
  continueBtn: {
    backgroundColor: tokens.colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: tokens.radius.full,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    // @ts-ignore
    boxShadow: "0 4px 12px rgba(0, 113, 227, 0.25)",
  },
  continueBtnText: {
    color: "#FFF",
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    fontSize: tokens.fontSize.base,
  },
  modesSection: {
    gap: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textTertiary,
    letterSpacing: 1,
  },
  modeList: {
    gap: 12,
  },
  modeCard: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius["3xl"],
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  modeIconBox: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    backgroundColor: "rgba(0, 113, 227, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  modeContent: {
    flex: 1,
    gap: 2,
  },
  modeName: {
    fontSize: tokens.fontSize.lg,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
  },
  modeDesc: {
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.body,
    color: tokens.colors.textSecondary,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius["2xl"],
    padding: 18,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  statValue: {
    fontSize: tokens.fontSize.xl,
    fontFamily: tokens.fontFamily.display,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
  },
  statLabel: {
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textSecondary,
    letterSpacing: 0.5,
  },
  reviewGenCard: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius["2xl"],
    padding: 18,
    // marginTop: -10,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: 32,
  },
  reviewGenIconBox: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    backgroundColor: "rgba(0, 113, 227, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewGenTitle: {
    fontSize: tokens.fontSize.md,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
  },
  reviewGenSub: {
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.body,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.textSecondary,
    marginTop: 2,
  },
  timelineSection: {
    gap: 24,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timelineCount: {
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textSecondary,
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 20,
    paddingBottom: 32,
    position: "relative",
  },
  timelineNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: tokens.colors.borderSubtle,
    borderWidth: 4,
    borderColor: tokens.colors.surface,
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineNodeCompleted: {
    backgroundColor: tokens.colors.accent,
    borderWidth: 0,
  },
  timelineNodeCurrent: {
    backgroundColor: tokens.colors.surface,
    borderColor: tokens.colors.accent,
  },
  timelineNodeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: tokens.colors.accent,
  },
  timelineLine: {
    position: "absolute",
    left: 11,
    top: 24,
    bottom: -16,
    width: 2,
    backgroundColor: tokens.colors.borderSubtle,
  },
  timelineLineCompleted: {
    backgroundColor: tokens.colors.accent,
  },
  timelineContent: {
    flex: 1,
    gap: 4,
  },
  milestoneTitle: {
    fontSize: tokens.fontSize.lg,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
  },
  milestoneDesc: {
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.body,
    color: tokens.colors.textSecondary,
  },
  timelineContentWrapper: {
    flex: 1,
    gap: 16,
  },
  timelineContentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  timelineProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: tokens.colors.base,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.sm,
  },
  progressText: {
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textSecondary,
  },
  lessonsContainer: {
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
  },
  lessonCard: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lessonInfo: {
    flex: 1,
    gap: 4,
  },
  lessonTitle: {
    fontSize: tokens.fontSize.base,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
  },
  lessonDesc: {
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.body,
    color: tokens.colors.textSecondary,
  },
});
