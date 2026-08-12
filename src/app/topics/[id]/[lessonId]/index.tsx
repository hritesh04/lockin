import { getRoadmap, updateProgress } from "@/lib/api";
import { tokens } from "@/theme/tokens";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLessonStore } from "../../../../store/lessons";
import { useModuleStore } from "../../../../store/modules";
import { useSessionStore } from "../../../../store/session";

function splitSections(content: string): { heading?: string; body: string }[] {
  const blocks = content
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const sections: { heading?: string; body: string }[] = [];
  for (const block of blocks) {
    const headingMatch = block.match(/^#{1,3}\s+(.*)$/);
    if (headingMatch) {
      sections.push({ heading: headingMatch[1].trim(), body: "" });
    } else {
      const last = sections[sections.length - 1];
      if (last && last.heading && !last.body) {
        last.body = block;
      } else {
        sections.push({ body: block });
      }
    }
  }
  return sections;
}

export default function LessonScreen() {
  const { id, lessonId } = useLocalSearchParams();
  const router = useRouter();

  const lessons = useLessonStore((state) => state.lessons);
  const setLessons = useLessonStore((state) => state.setLessons);
  const setModules = useModuleStore((state) => state.setModules);
  const { startSession } = useSessionStore();

  const lesson = typeof lessonId === "string" ? lessons[lessonId] : null;
  const [loading, setLoading] = useState(!lesson);
  const [progressSaving, setProgressSaving] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const reportedRef = useRef<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      if (lesson || !id) return;

      const controller = new AbortController();
      setLoading(true);
      getRoadmap(id as string, controller.signal)
        .then((data) => {
          setModules(data.modules.map((m: any) => ({ ...m, topicId: id })));

          const allLessons: any[] = [];
          data.modules.forEach((m: any) => {
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
            console.error("Failed to load lesson:", err);
          }
        })
        .finally(() => {
          setLoading(false);
        });

      return () => {
        controller.abort();
      };
    }, [id, lessonId, lesson])
  );

  // Start lesson reading session when lesson loads
  useEffect(() => {
    if (lesson && !sessionStarted) {
      setSessionStarted(true);
      startSession({
        sessionId: `lesson-${lesson.id}-${Date.now()}`,
        type: "lesson",
        topicId: id as string,
        topicTitle: undefined,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        questions: [],
      });
    }
  }, [lesson, sessionStarted, startSession, id]);

  const handleProceed = () => {
    if (!lesson) return;
    handleAttemptedAll();
    router.push(`/topics/${id}/session?lessonId=${lesson.id}&quizz=true`);
  };

  const handleAttemptedAll = useCallback(async () => {
    if (!lesson || progressSaving || reportedRef.current.has(lesson.id)) return;
    reportedRef.current.add(lesson.id);
    setProgressSaving(true);
    try {
      const progressRes = await updateProgress(lesson.id);
      setLessons(progressRes.updatedLessons);
      setModules(progressRes.updatedModules);
    } catch (err) {
      console.error("Failed to update progress:", err);
    } finally {
      setProgressSaving(false);
    }
  }, [lesson, progressSaving, setLessons, setModules]);

  const sections = useMemo(
    () => (lesson ? splitSections(lesson.content) : []),
    [lesson]
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={tokens.colors.accent} />
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: tokens.colors.textPrimary }}>
          Lesson not found
        </Text>
        <TouchableOpacity
          style={{ marginTop: 20 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: tokens.colors.accent }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace(`/topics/${id}`)}
          style={styles.iconButton}
        >
          <X size={20} color={tokens.colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{lesson.title}</Text>

        <TouchableOpacity onPress={handleProceed} style={styles.proceedButton}>
          <Text style={styles.proceedText}>Proceed</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lessonDescription}>{lesson.description}</Text>

        {sections.map((section: any, idx: number) => (
          <View key={idx} style={styles.contentCard}>
            {section.heading ? (
              <Text style={styles.sectionHeading}>{section.heading}</Text>
            ) : (
              <Text style={styles.contentText}>{section.body}</Text>
            )}
          </View>
        ))}

        {/* <View style={styles.contentCard}> */}
        {/* <Text style={styles.contentText}>{lesson.content}</Text> */}
        {/* <EnrichedMarkdownText */}
        {/* markdown={lesson.content} */}
        {/* onLinkPress={({ url }) => Linking.openURL(url)} */}
        {/* /> */}
        {/* </View> */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.base,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: tokens.colors.base,
  },
  headerTitle: {
    flex: 1,
    fontSize: tokens.fontSize.lg,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
    textAlign: "center",
    padding: 2,
    marginHorizontal: 12,
  },
  proceedButton: {
    backgroundColor: tokens.colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: tokens.radius.full,
  },
  proceedButtonDisabled: {
    backgroundColor: tokens.colors.textTertiary,
  },
  proceedText: {
    color: "#FFF",
    fontSize: tokens.fontSize.base,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  lessonDescription: {
    fontSize: tokens.fontSize.lg,
    fontFamily: tokens.fontFamily.bodyMedium,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.textSecondary,
    marginBottom: 24,
    lineHeight: 24,
  },
  contentCard: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius["2xl"],
    padding: 24,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: tokens.fontSize.xl,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
    marginBottom: 8,
  },
  contentText: {
    fontSize: tokens.fontSize.lg,
    fontFamily: tokens.fontFamily.body,
    color: tokens.colors.textPrimary,
    lineHeight: 28,
  },
  checkBlock: {
    marginTop: 8,
  },
  checkHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  checkIconBox: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.sm,
    backgroundColor: "rgba(0, 113, 227, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkTitle: {
    fontSize: tokens.fontSize.xl,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
  },
  checkSub: {
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.body,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  promptCard: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius["2xl"],
    padding: 18,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: 12,
  },
  promptCardAttempted: {
    borderColor: "rgba(34, 197, 94, 0.3)",
    backgroundColor: "rgba(34, 197, 94, 0.03)",
  },
  promptTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  promptType: {
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 0.5,
    color: tokens.colors.accent,
  },
  attemptBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radius.sm,
  },
  attemptBadgeText: {
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: "#16a34a",
  },
  promptText: {
    fontSize: tokens.fontSize.md,
    fontFamily: tokens.fontFamily.bodyMedium,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.textPrimary,
    lineHeight: 22,
    marginBottom: 12,
  },
  promptInput: {
    backgroundColor: tokens.colors.base,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: tokens.fontSize.base,
    fontFamily: tokens.fontFamily.body,
    color: tokens.colors.textPrimary,
    textAlignVertical: "top",
  },
  optionWrap: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 8,
  },
  optionChip: {
    backgroundColor: tokens.colors.base,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: tokens.radius.sm,
    width: "50%",
  },
  optionChipSelected: {
    backgroundColor: "rgba(0, 113, 227, 0.06)",
    borderColor: tokens.colors.accent,
  },
  optionText: {
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.bodyMedium,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.textPrimary,
  },
  optionTextSelected: {
    color: tokens.colors.accent,
  },
  gateHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginTop: 4,
  },
  gateHintText: {
    flex: 1,
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.bodyMedium,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.textSecondary,
  },
});
