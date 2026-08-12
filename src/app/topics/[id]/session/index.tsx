import SessionComplete from "@/components/SessionComplete";
import {
  ApiSocraticFollowUp,
  completeSession,
  evaluateTopicAssessment,
  socraticFollowUp,
  startSession,
  updateProgress,
} from "@/lib/api";
import { tokens } from "@/theme/tokens";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { MessageCircle, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Lesson, useLessonStore } from "../../../../store/lessons";
import { useModuleStore } from "../../../../store/modules";
import {
  Confidence,
  Option,
  SessionType,
  useSessionStore,
} from "../../../../store/session";
import { useTopicsStore } from "../../../../store/topics";

export default function SessionScreen() {
  const { id, lessonId, quizMode, topicName } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    questions,
    currentIndex,
    isCompleted,
    score,
    activeSessionId,
    startSession: startSessionStore,
    submitAnswer,
    nextQuestion,
    resetSession,
  } = useSessionStore();
  const topic = useTopicsStore((s) => s.topics.find((t) => t.id === id));
  const { updateTopicProgress } = useTopicsStore();

  const lessons = useLessonStore((state) => state.lessons);
  const setLessons = useLessonStore((state) => state.setLessons);
  const setModules = useModuleStore((state) => state.setModules);

  const completedLessonsCount = (() => {
    const topicId = typeof id === "string" ? id : "";
    const topicModules = useModuleStore.getState().getModulesByTopic(topicId);
    return topicModules.reduce((acc, module) => {
      const completed = useLessonStore
        .getState()
        .getLessonsByModule(module.id)
        .filter((l) => l.status === "completed").length;
      return acc + completed;
    }, 0);
  })();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [answer, setAnswer] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [apiFeedback, setApiFeedback] = useState<{
    explanation: string;
    is_correct: boolean;
  } | null>(null);

  const [socratic, setSocratic] = useState<ApiSocraticFollowUp | null>(null);
  const [socraticLoading, setSocraticLoading] = useState(false);
  const [socraticAnswer, setSocraticAnswer] = useState("");
  const [socraticDone, setSocraticDone] = useState(false);

  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();

      const targetId =
        typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";
      const targetLessonId =
        typeof lessonId === "string"
          ? lessonId
          : Array.isArray(lessonId)
          ? lessonId[0]
          : "";
      const targetQuizMode =
        typeof quizMode === "string" ? quizMode : undefined;

      setLoading(true);
      if (id === "diagnostic") {
        setLoading(false);
        return () => {
          resetSession();
        };
      }

      let sessionType: SessionType = "mcq";
      if (targetLessonId) {
        sessionType = "lesson";
      } else if (targetQuizMode === "qna") {
        sessionType = "qna";
      }

      startSession(
        {
          topic_id: targetId,
          lesson_id: targetLessonId || undefined,
          quiz_mode: targetLessonId ? "lesson" : targetQuizMode,
        },
        controller.signal
      )
        .then((res: any) => {
          if (!controller.signal.aborted) {
            startSessionStore({
              sessionId: res.session_id,
              type: sessionType,
              topicId: targetId,
              topicTitle: topic?.title,
              lessonId: targetLessonId,
              lessonTitle: targetLessonId
                ? lessons[targetLessonId]?.title
                : undefined,
              questions: res.questions,
            });
            setLoading(false);
          }
        })
        .catch((err: any) => {
          if (!controller.signal.aborted) {
            console.error("Failed to start session:", err);
            setLoading(false);
          }
        });

      return () => {
        controller.abort();
        resetSession();
      };
    }, [id, lessonId, quizMode])
  );

  const resetQuestionInputs = () => {
    setShowExplanation(false);
    setSelectedOption(null);
    setAnswer("");
    setApiFeedback(null);
    setSocratic(null);
    setSocraticAnswer("");
    setSocraticDone(false);
    setSocraticLoading(false);
    setConfidence(null);
  };

  const handleSubmit = () => {
    const q = questions[currentIndex];
    const isMcq = q.format === "mcq" || q.format === "true_false";

    if (showExplanation) {
      resetQuestionInputs();
      nextQuestion();
      return;
    }

    if (socratic && !socraticDone) {
      if (!socraticAnswer.trim()) return;
      setSocraticDone(true);
      setShowExplanation(true);
      return;
    }

    if (isMcq && !selectedOption) return;
    if (!isMcq && !answer.trim()) return;

    if (isMcq) {
      const isCorrect = selectedOption?.is_correct || false;
      submitAnswer(
        selectedOption?.label || "",
        isCorrect,
        confidence ?? undefined
      );
      setShowExplanation(true);
    } else {
      const isCorrect = q.answer
        ? answer.trim().toLowerCase() === q.answer.toLowerCase()
        : true;

      submitAnswer(answer, isCorrect, confidence ?? undefined);

      if (
        q.format === "short_answer" &&
        activeSessionId &&
        id !== "diagnostic"
      ) {
        setSocraticLoading(true);
        socraticFollowUp(activeSessionId, q.id, answer)
          .then((res) => {
            setSocratic(res);
            setSocraticDone(false);
          })
          .catch((err) => {
            console.error("Failed to generate Socratic follow-up:", err);
            setApiFeedback({
              explanation: q.explanation || "Answer recorded.",
              is_correct: isCorrect,
            });
            setSocratic(null);
            setShowExplanation(true);
          })
          .finally(() => setSocraticLoading(false));
        return;
      }

      setApiFeedback({
        explanation: q.explanation || "Answer recorded.",
        is_correct: isCorrect,
      });
      setShowExplanation(true);
    }
  };

  const handleDiagnosticFinish = async () => {
    setSubmitting(true);
    setDiagnosticError(null);
    const userAnswers = useSessionStore.getState().userAnswers;
    try {
      await evaluateTopicAssessment({
        topic: topicName as string,
        assessment: userAnswers,
      });
      resetSession();
      router.replace("/");
    } catch (e) {
      console.error("Failed to evaluate diagnostic assessment:", e);
      setDiagnosticError("Evaluation failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (isCompleted && id === "diagnostic") {
      handleDiagnosticFinish();
    }
  }, [isCompleted, id]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    return () => {
      showSub.remove();
    };
  }, []);

  const handleFinishActions = async () => {
    const {
      activeSessionId,
      userAnswers,
      questions,
      score,
      completeSession: completeLocalSession,
    } = useSessionStore.getState();
    if (!activeSessionId) return;

    try {
      const diagData = !lessonId
        ? {
            topic_id: id as string,
            answers: userAnswers,
          }
        : undefined;

      await completeSession(activeSessionId, diagData);

      if (lessonId) {
        const progressRes = await updateProgress(lessonId as string);
        setLessons(progressRes.updatedLessons);
        setModules(progressRes.updatedModules);
      }
    } catch (e) {
      console.warn("Session finalization failed:", e);
    }

    const pct =
      questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    updateTopicProgress(id as string, pct, 1);

    completeLocalSession();
  };

  // Find next lesson after current one
  const getNextLessonId = useCallback((): string | undefined => {
    if (!lessonId) return undefined;
    const allLessons = Object.values(lessons);
    const currentLesson = allLessons.find((l) => l.id === lessonId);
    if (!currentLesson) return undefined;

    // Get all lessons in the same module, sorted by index
    const moduleLessons = allLessons
      .filter((l) => l.nodeId === currentLesson.nodeId)
      .sort((a, b) => a.index - b.index);

    const currentIndex = moduleLessons.findIndex((l) => l.id === lessonId);
    if (currentIndex >= 0 && currentIndex < moduleLessons.length - 1) {
      return moduleLessons[currentIndex + 1].id;
    }

    // No next lesson in current module, find first lesson of next module
    // Get all modules for this topic, sorted by index
    const modules = Object.values(lessons)
      .filter((l) => l.nodeId)
      .reduce((acc, l) => {
        if (!acc[l.nodeId]) acc[l.nodeId] = { index: l.index, lessons: [] };
        acc[l.nodeId].lessons.push(l);
        return acc;
      }, {} as Record<string, { index: number; lessons: Lesson[] }>);

    const sortedModules = Object.entries(modules).sort(
      (a, b) => a[1].index - b[1].index
    );

    const currentModuleIndex = sortedModules.findIndex(
      ([nodeId]) => nodeId === currentLesson.nodeId
    );
    if (
      currentModuleIndex >= 0 &&
      currentModuleIndex < sortedModules.length - 1
    ) {
      const nextModule = sortedModules[currentModuleIndex + 1][1];
      const firstLesson = nextModule.lessons.sort(
        (a, b) => a.index - b.index
      )[0];
      return firstLesson?.id;
    }

    return undefined;
  }, [lessonId, lessons]);

  const handleDashboard = () => {
    handleFinishActions();
    router.replace({
      pathname: `/topics/${id}` as any,
    });
  };

  const handleNextSession = () => {
    handleFinishActions();
    const nextLessonId = getNextLessonId();
    resetSession();
    if (nextLessonId) {
      router.replace({
        pathname: `/topics/${id}/${nextLessonId}` as any,
      });
    } else {
      // No next lesson, go to topic index
      router.replace({
        pathname: `/topics/${id}` as any,
      });
    }
  };

  if (loading)
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={tokens.colors.accent} />
      </View>
    );

  if (isCompleted) {
    if (id === "diagnostic") {
      if (diagnosticError) {
        return (
          <View style={[styles.container, styles.centered]}>
            <Text
              style={{
                color: tokens.colors.textPrimary,
                fontSize: 16,
                marginBottom: 8,
              }}
            >
              Something went wrong
            </Text>
            <Text
              style={{ color: tokens.colors.textSecondary, marginBottom: 24 }}
            >
              {diagnosticError}
            </Text>
            <TouchableOpacity
              onPress={handleDiagnosticFinish}
              style={{
                backgroundColor: tokens.colors.accent,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.replace("/")}
              style={{ marginTop: 16 }}
            >
              <Text style={{ color: tokens.colors.textSecondary }}>
                Go Home
              </Text>
            </TouchableOpacity>
          </View>
        );
      }
      return (
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={tokens.colors.accent} />
          <Text style={{ color: tokens.colors.textPrimary, marginTop: 16 }}>
            Evaluating your level...
          </Text>
        </View>
      );
    }

    return (
      <SessionComplete
        topicTitle={topic?.title || "Session"}
        topicId={id as string}
        score={score}
        total={questions.length}
        onContinue={handleNextSession}
        onDashboard={handleDashboard}
        userAnswers={useSessionStore.getState().userAnswers}
        hasLesson={!!lessonId}
        lessonId={lessonId as string | undefined}
        nextLessonId={getNextLessonId()}
        completedLessons={completedLessonsCount}
      />
    );
  }

  const q = questions[currentIndex];
  if (!q) return <View style={styles.container}></View>;

  const qNum = (currentIndex + 1).toString().padStart(2, "0");
  const percentComplete = Math.round((currentIndex / questions.length) * 100);
  const letters = ["A", "B", "C", "D", "E"];

  const isMcq = q.format === "mcq" || q.format === "true_false";
  const showConfidenceBar = !showExplanation && !socratic && !socraticLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.exitBtn} onPress={() => router.back()}>
          <X size={16} color={tokens.colors.textSecondary} />
          <Text style={styles.exitText}>Exit</Text>
        </TouchableOpacity>

        <View style={styles.pillBox}>
          <Text style={styles.pillText}>
            {id === "diagnostic"
              ? topicName || "Assessment"
              : topic?.title || "Session"}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.progressFractions}>
            {currentIndex + 1} / {questions.length}
          </Text>
          <Text style={styles.progressPercent}>
            {percentComplete}% Complete
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.contentLine,
          {
            paddingBottom: showConfidenceBar
              ? Math.max(insets.bottom, 108) + 170
              : 120,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.questionCard}>
          <View style={styles.qHeaderRow}>
            <Text style={styles.qHeader}>Question {qNum}</Text>
          </View>
          <Text style={styles.qText}>{q.question}</Text>
        </View>

        {isMcq ? (
          <View style={styles.optionsList}>
            {q.options.map((opt: Option, i: number) => {
              const letter = letters[i] || "";
              const isSelected = selectedOption?.label === opt.label;
              const isCorrectAnswer = opt.is_correct;
              let containerStyle: any[] = [styles.optCard];
              let letterBoxStyle: any[] = [styles.optLetterBox];
              let letterTextStyle: any[] = [styles.optLetterText];
              let optTextStyle: any[] = [styles.optText];

              if (showExplanation) {
                if (id === "diagnostic") {
                  if (isSelected) {
                    containerStyle.push(styles.optCardActive);
                    letterBoxStyle.push(styles.optLetterBoxActive);
                    letterTextStyle.push(styles.optLetterTextActive);
                    optTextStyle.push(styles.optTextActive);
                  }
                } else if (isCorrectAnswer) {
                  containerStyle.push(styles.optCardCorrect);
                  letterBoxStyle.push(styles.optLetterBoxCorrect);
                  letterTextStyle.push(styles.optLetterTextCorrect);
                  optTextStyle.push(styles.optTextCorrect);
                } else if (isSelected) {
                  containerStyle.push(styles.optCardWrong);
                  letterBoxStyle.push(styles.optLetterBoxWrong);
                  letterTextStyle.push(styles.optLetterTextWrong);
                  optTextStyle.push(styles.optTextWrong);
                } else {
                  containerStyle.push({ opacity: 0.5 });
                }
              } else if (isSelected) {
                containerStyle.push(styles.optCardActive);
                letterBoxStyle.push(styles.optLetterBoxActive);
                letterTextStyle.push(styles.optLetterTextActive);
                optTextStyle.push(styles.optTextActive);
              }

              return (
                <TouchableOpacity
                  key={opt.id}
                  style={containerStyle}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (!showExplanation) setSelectedOption(opt);
                  }}
                >
                  <View style={letterBoxStyle}>
                    <Text style={letterTextStyle}>{letter}</Text>
                  </View>
                  <View style={{ flex: 1, justifyContent: "center" }}>
                    <Text style={optTextStyle}>{opt.label}</Text>
                    {showExplanation &&
                    selectedOption?.id === opt.id &&
                    opt.explanation ? (
                      <Text style={styles.optExplanationText}>
                        {opt.explanation}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : socraticLoading || (socratic && !socraticDone) ? (
          <View style={styles.socraticCard}>
            <View style={styles.socraticTopRow}>
              <View style={styles.socraticBadge}>
                <MessageCircle size={12} color={tokens.colors.accent} />
                <Text style={styles.socraticBadgeText}>SOCRATIC FOLLOW-UP</Text>
              </View>
            </View>
            {socraticLoading && !socratic ? (
              <View style={styles.socraticLoadingRow}>
                <ActivityIndicator size="small" color={tokens.colors.accent} />
                <Text style={styles.socraticLoadingText}>
                  Generating a &quot;why&quot; question...
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.socraticPrompt}>{socratic?.follow_up}</Text>
                <Text style={styles.socraticInputLabel}>
                  YOUR FOLLOW-UP ANSWER
                </Text>
                <TextInput
                  style={styles.socraticInput}
                  placeholder="Explain your reasoning..."
                  placeholderTextColor={tokens.colors.textTertiary}
                  multiline
                  value={socraticAnswer}
                  onChangeText={setSocraticAnswer}
                />
              </>
            )}
          </View>
        ) : !showExplanation ? (
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>YOUR ANSWER</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="Type your detailed answer here..."
                placeholderTextColor={tokens.colors.textTertiary}
                multiline
                value={answer}
                onChangeText={setAnswer}
              />
            </View>
          </View>
        ) : (
          <View style={styles.explainAreaText}>
            <Text style={styles.explainTitleText}>
              {socraticDone
                ? "Correct answer"
                : apiFeedback?.is_correct === false
                ? "Keep practicing"
                : "Answer recorded"}
            </Text>
            <Text style={styles.explainLabel}>KEY CONCEPTS TO KNOW:</Text>
            {!socraticDone && q.answer && q.format === "fill_blank" ? (
              <Text style={styles.explainAnswerText}>Answer: {q.answer}</Text>
            ) : null}
            <Text style={styles.explainContentText}>
              {socraticDone
                ? socratic?.explanation
                : apiFeedback?.explanation ?? q.explanation}
            </Text>
          </View>
        )}
      </ScrollView>

      {showConfidenceBar ? (
        <View
          style={[
            styles.confidenceBar,
            { bottom: Math.max(insets.bottom, 108) },
          ]}
        >
          <Text style={styles.confidenceLabel}>HOW CONFIDENT ARE YOU?</Text>
          <View style={styles.confidenceRow}>
            {(
              [
                ["low", "Low"],
                ["med", "Medium"],
                ["high", "High"],
              ] as [Confidence, string][]
            ).map(([val, label]) => {
              const active = confidence === val;
              return (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.confidenceBtn,
                    active && styles.confidenceBtnActive,
                  ]}
                  onPress={() => setConfidence(val)}
                >
                  <Text
                    style={[
                      styles.confidenceBtnText,
                      active && styles.confidenceBtnTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}

      <View
        style={[
          styles.bottomContainer,
          { bottom: Math.max(insets.bottom, 24) },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (((isMcq && !selectedOption) || (!isMcq && !answer.trim())) &&
              !showExplanation &&
              !(socratic && !socraticDone)) ||
            submitting ||
            (socraticLoading && !socratic) ||
            (socratic && !socraticDone && !socraticAnswer.trim())
              ? { opacity: 0.5 }
              : undefined,
          ]}
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={
            !!(
              (((isMcq && !selectedOption) || (!isMcq && !answer.trim())) &&
                !showExplanation &&
                !(socratic && !socraticDone)) ||
              submitting ||
              (socraticLoading && !socratic) ||
              (socratic && !socraticDone && !socraticAnswer.trim())
            )
          }
        >
          <Text style={styles.submitBtnText}>
            {socraticLoading && !socratic
              ? "Thinking..."
              : socratic && !socraticDone
              ? "Reveal explanation"
              : showExplanation
              ? "Continue"
              : submitting
              ? "Submitting..."
              : "Submit"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
    zIndex: 10,
  },
  exitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  exitText: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    textTransform: "uppercase",
  },
  pillBox: {
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  pillText: {
    color: tokens.colors.textPrimary,
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  progressFractions: {
    fontSize: tokens.fontSize.base,
    fontFamily: tokens.fontFamily.display,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  progressPercent: {
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textSecondary,
    textTransform: "uppercase",
  },
  contentLine: {
    padding: 24,
    paddingTop: 32,
    gap: 24,
  },
  questionCard: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius["3xl"],
    padding: 28,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  qHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  qHeader: {
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  qText: {
    fontSize: tokens.fontSize.xl,
    fontFamily: tokens.fontFamily.display,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
    lineHeight: 28,
  },
  optionsList: {
    gap: 12,
  },
  optCard: {
    width: "100%",
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    padding: 18,
    borderRadius: tokens.radius["2xl"],
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  optCardActive: {
    backgroundColor: "rgba(0, 113, 227, 0.06)",
    borderColor: tokens.colors.accent,
    borderWidth: 1.5,
  },
  optCardCorrect: {
    backgroundColor: "rgba(34, 197, 94, 0.06)",
    borderColor: "#22c55e",
    borderWidth: 1.5,
  },
  optCardWrong: {
    backgroundColor: "rgba(239, 68, 68, 0.06)",
    borderColor: "#ef4444",
    borderWidth: 1.5,
  },
  optLetterBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.colors.base,
    alignItems: "center",
    justifyContent: "center",
  },
  optLetterBoxActive: {
    backgroundColor: tokens.colors.accent,
  },
  optLetterBoxCorrect: {
    backgroundColor: "#22c55e",
  },
  optLetterBoxWrong: {
    backgroundColor: "#ef4444",
  },
  optLetterText: {
    fontSize: tokens.fontSize.base,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textSecondary,
  },
  optLetterTextActive: {
    color: "#FFFFFF",
  },
  optLetterTextCorrect: {
    color: "#FFFFFF",
  },
  optLetterTextWrong: {
    color: "#FFFFFF",
  },
  optText: {
    fontSize: tokens.fontSize.lg,
    fontFamily: tokens.fontFamily.body,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.textPrimary,
    flex: 1,
  },
  optTextActive: {
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
  },
  optTextCorrect: {
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: "#14532d",
  },
  optTextWrong: {
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: "#7f1d1d",
  },
  optExplanationText: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textSecondary,
    fontStyle: "italic",
    marginTop: 6,
    lineHeight: 18,
  },
  bottomContainer: {
    position: "absolute",
    left: 24,
    right: 24,
    zIndex: 40,
  },
  confidenceBar: {
    position: "absolute",
    left: 24,
    right: 24,
    zIndex: 30,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    padding: 14,
    gap: 10,
  },
  confidenceLabel: {
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textSecondary,
    letterSpacing: 1,
  },
  confidenceRow: {
    flexDirection: "row",
    gap: 10,
  },
  confidenceBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.colors.base,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    alignItems: "center",
  },
  confidenceBtnActive: {
    backgroundColor: tokens.colors.accent,
    borderColor: tokens.colors.accent,
  },
  confidenceBtnText: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
  },
  confidenceBtnTextActive: {
    color: "#FFFFFF",
  },
  submitBtn: {
    width: "100%",
    backgroundColor: tokens.colors.accent,
    paddingVertical: 18,
    borderRadius: tokens.radius.full,
    alignItems: "center",
    // @ts-ignore
    boxShadow: "0 4px 12px rgba(0, 113, 227, 0.25)",
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: tokens.fontSize.lg,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
  },
  inputSection: {
    gap: 12,
  },
  inputLabel: {
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textSecondary,
    letterSpacing: 1,
    marginLeft: 12,
  },
  inputWrapper: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius["2xl"],
    padding: 20,
    minHeight: 180,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    justifyContent: "space-between",
  },
  textInput: {
    fontSize: tokens.fontSize.lg,
    fontFamily: tokens.fontFamily.body,
    color: tokens.colors.textPrimary,
    lineHeight: 24,
    textAlignVertical: "top",
    flex: 1,
    marginBottom: 16,
  },
  explainAreaText: {
    marginTop: 8,
    padding: 24,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius["2xl"],
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  explainTitleText: {
    color: tokens.colors.textPrimary,
    fontSize: tokens.fontSize.xl,
    fontFamily: tokens.fontFamily.display,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 16,
  },
  explainLabel: {
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.accent,
    letterSpacing: 1,
    marginBottom: 8,
  },
  explainAnswerText: {
    color: tokens.colors.textPrimary,
    fontSize: tokens.fontSize.md,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 8,
  },
  explainContentText: {
    color: tokens.colors.textPrimary,
    fontSize: tokens.fontSize.base,
    fontFamily: tokens.fontFamily.body,
    lineHeight: 22,
  },
  socraticCard: {
    marginTop: 8,
    padding: 24,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius["2xl"],
    borderWidth: 1,
    borderColor: "rgba(0, 113, 227, 0.2)",
    gap: 14,
  },
  socraticTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  socraticBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 113, 227, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
  },
  socraticBadgeText: {
    color: tokens.colors.accent,
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 0.5,
  },
  socraticLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  socraticLoadingText: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.fontSize.base,
    fontFamily: tokens.fontFamily.bodyMedium,
    fontWeight: tokens.fontWeight.semibold,
  },
  socraticPrompt: {
    color: tokens.colors.textPrimary,
    fontSize: tokens.fontSize.md,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: 26,
  },
  socraticInputLabel: {
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textSecondary,
    letterSpacing: 1,
  },
  socraticInput: {
    backgroundColor: tokens.colors.base,
    borderRadius: tokens.radius.lg,
    padding: 16,
    fontSize: tokens.fontSize.md,
    fontFamily: tokens.fontFamily.body,
    color: tokens.colors.textPrimary,
    lineHeight: 22,
    textAlignVertical: "top",
    minHeight: 96,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
});
