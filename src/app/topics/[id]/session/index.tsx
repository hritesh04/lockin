import SessionComplete from '@/components/SessionComplete';
import { completeSession, startSession, updateProgress } from '@/lib/api';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLessonStore } from '../../../../store/lessons';
import { useModuleStore } from '../../../../store/modules';
import { Option, useSessionStore } from '../../../../store/session';
import { useTopicsStore } from '../../../../store/topics';

export default function SessionScreen() {
  const { id, lessonId, quizz, quizMode } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { 
    questions, 
    currentIndex, 
    isCompleted, 
    score, 
    startSession: startSessionStore, 
    submitAnswer, 
    nextQuestion, 
    resetSession 
  } = useSessionStore();
  const topic = useTopicsStore(s => s.topics.find(t => t.id === id));
  const { updateTopicProgress } = useTopicsStore();

  const lessons = useLessonStore(state => state.lessons);
  const setLessons = useLessonStore(state => state.setLessons);
  const setModules = useModuleStore(state => state.setModules);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [answer, setAnswer] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [apiFeedback, setApiFeedback] = useState<{ explanation: string; is_correct: boolean } | null>(null);

  // Speech specific state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const progressAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse effect just when listening
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  useEffect(() => {
    progressAnim.setValue(1);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 30000,
      useNativeDriver: false,
    }).start();
  }, [currentIndex]);

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();

      const targetId = typeof id === 'string' ? id : (Array.isArray(id) ? id[0] : '');
      const targetLessonId = typeof lessonId === 'string' ? lessonId : (Array.isArray(lessonId) ? lessonId[0] : '');
      const targetQuizMode = typeof quizMode === 'string' ? quizMode : undefined;

      setLoading(true);
      startSession({ 
        topic_id: targetId, 
        lesson_id: targetLessonId || undefined,
        quiz_mode: targetLessonId ? 'lesson' : targetQuizMode
      }, controller.signal)
        .then((res: any) => {
          if (!controller.signal.aborted) {
            startSessionStore(res.session_id, res.questions);
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
    }, [id, lessonId])
  );

  const handleSpeechInput = () => {
    if (isListening) {
      setIsListening(false);
      setAnswer((prev) => prev + (prev.length > 0 ? ' ' : '') + 'I think this is transcribed speech.');
    } else {
      setIsListening(true);
    }
  };

  const handleSpeakQuestion = () => {
    setIsSpeaking(true);
    setTimeout(() => setIsSpeaking(false), 2000);
  };

  const handleSubmit = () => {
    if (showExplanation) {
      setShowExplanation(false);
      setSelectedOption(null);
      setAnswer('');
      setApiFeedback(null);
      nextQuestion();
      return;
    }

    const q = questions[currentIndex];
    const isMcq = q.format === 'mcq' || q.format === 'true_false';

    if (isMcq && !selectedOption) return;
    if (!isMcq && !answer.trim()) return;

    if (isMcq) {
      const isCorrect = selectedOption?.is_correct || false;
      submitAnswer(selectedOption?.label || '', isCorrect);
      setShowExplanation(true);
      progressAnim.stopAnimation();
    } else {
      const isCorrect = q.answer 
        ? answer.trim().toLowerCase() === q.answer.toLowerCase() 
        : true;
      
      submitAnswer(answer, isCorrect);
      setApiFeedback({ 
        explanation: q.explanation || 'Answer recorded.', 
        is_correct: isCorrect 
      });
      setShowExplanation(true);
      progressAnim.stopAnimation();
    }
  };

  const handleFinishActions = async () => {
    const sid = useSessionStore.getState().activeSessionId;
    const userAnswers = useSessionStore.getState().userAnswers;
    if (!sid) return;

    try {
      // 1. Always complete the session
      const diagData = !lessonId ? {
        topic_id: id as string,
        answers: userAnswers
      } : undefined;
      
      await completeSession(sid, diagData);

      // 2. If it's a lesson-based session, trigger progress as a separate call
      if (lessonId) {
        const progressRes = await updateProgress(lessonId as string);
        setLessons(progressRes.updatedLessons);
        setModules(progressRes.updatedModules);
      }
    } catch (e) {
      console.warn('Session finalization failed:', e);
    }

    const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    updateTopicProgress(id as string, pct, 1);
  };

  const handleDashboard = () => {
    void (async () => {
      await handleFinishActions();
      router.back();
    })();
  };

  const handleNextSession = () => {
    void (async () => {
      await handleFinishActions();
      const targetQuizMode = typeof quizMode === 'string' ? quizMode : undefined;
      resetSession();
      router.replace({
        pathname: `/topics/${id}/session` as any,
        params: { quizMode: targetQuizMode }
      });
    })();
  };

  if (loading) return <View style={[styles.container, styles.centered]}><ActivityIndicator size="large" color="#F97316" /></View>;

  if (isCompleted) {
    return (
      <SessionComplete
        topicTitle={topic?.title || 'Session'}
        score={score}
        total={questions.length}
        onContinue={handleNextSession}
        onDashboard={handleDashboard}
      />
    );
  }

  const q = questions[currentIndex];
  if (!q) return <View style={styles.container}></View>;

  const qNum = (currentIndex + 1).toString().padStart(2, '0');
  const percentComplete = Math.round((currentIndex / questions.length) * 100);
  const letters = ['A', 'B', 'C', 'D', 'E'];

  const isMcq = q.format === 'mcq' || q.format === 'true_false';

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.exitBtn} onPress={() => router.back()}>
          <Feather name="x" size={16} color="#94A3B8" />
          <Text style={styles.exitText}>Exit</Text>
        </TouchableOpacity>

        <View style={styles.pillBox}>
          <Text style={styles.pillText}>{topic?.title || 'Session'}</Text>
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.progressFractions}>{currentIndex + 1} / {questions.length}</Text>
          <Text style={styles.progressPercent}>{percentComplete}% Complete</Text>
        </View>
      </View>

      {/* Timer Bar */}
      <View style={styles.timerTrack}>
        <Animated.View style={[styles.timerFill, {
          width: progressAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%']
          })
        }]} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.contentLine, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.questionCard}>
          <View style={styles.qHeaderRow}>
            <Text style={styles.qHeader}>Question {qNum}</Text>
            <TouchableOpacity onPress={handleSpeakQuestion} style={styles.speakSmallBtn}>
              <MaterialCommunityIcons 
                name={isSpeaking ? "volume-high" : "volume-medium"} 
                size={20} 
                color={isSpeaking ? "#F97316" : "#94A3B8"} 
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.qText}>{q.question}</Text>
        </View>

        {isMcq ? (
          <View style={styles.optionsList}>
            {q.options.map((opt: Option, i: number) => {
              const letter = letters[i] || '';
              const isSelected = selectedOption?.label === opt.label;
              const isCorrectAnswer = opt.is_correct;
              let containerStyle: any[] = [styles.optCard];
              let letterBoxStyle: any[] = [styles.optLetterBox];
              let letterTextStyle: any[] = [styles.optLetterText];
              let optTextStyle: any[] = [styles.optText];

              if (showExplanation) {
                 if (isCorrectAnswer) {
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
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={optTextStyle}>{opt.label}</Text>
                    {showExplanation && selectedOption?.id === opt.id && opt.explanation ? (
                      <Text style={styles.optExplanationText}>
                        {opt.explanation}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        ) : (
          !showExplanation ? (
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>YOUR ANSWER</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Type your detailed answer here..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  value={answer}
                  onChangeText={setAnswer}
                />
                <View style={styles.micActionRow}>
                  {isListening && <Text style={styles.listeningText}>Listening...</Text>}
                  <Animated.View style={[styles.micPulseWrap, { transform: [{ scale: pulseAnim }] }]}>
                    <TouchableOpacity 
                      style={[styles.smallMicBtn, isListening && styles.smallMicBtnActive]}
                      onPress={handleSpeechInput}
                    >
                      <Feather name={isListening ? "mic" : "mic-off"} size={20} color={isListening ? "#FFF" : "#94A3B8"} />
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.explainAreaText}>
               <Text style={styles.explainTitleText}>
                 {apiFeedback?.is_correct === false ? 'Keep practicing' : 'Answer recorded'}
               </Text>
               <Text style={styles.explainLabel}>KEY CONCEPTS TO KNOW:</Text>
               <Text style={styles.explainContentText}>{apiFeedback?.explanation ?? q.explanation}</Text>
            </View>
          )
        )}
      </ScrollView>

      {/* Bottom Button */}
      <View style={[styles.bottomContainer, { bottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity 
          style={[
            styles.submitBtn, 
            (((isMcq && !selectedOption) || (!isMcq && !answer.trim())) && !showExplanation) || submitting 
            ? { opacity: 0.5 } : undefined
          ]} 
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={((isMcq && !selectedOption) || (!isMcq && !answer.trim())) && !showExplanation || submitting}
        >
          <Text style={styles.submitBtnText}>{showExplanation ? 'Continue' : submitting ? 'Submitting...' : 'Submit'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // slate-950
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    zIndex: 10,
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exitText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '800', 
    textTransform: 'uppercase',
  },
  pillBox: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  progressFractions: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  progressPercent: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  timerTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#1E293B',
    zIndex: 9,
  },
  timerFill: {
    height: '100%',
    backgroundColor: '#F97316',
    shadowColor: '#F97316',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 4,
  },
  contentLine: {
    padding: 24,
    paddingTop: 32,
    gap: 24,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    padding: 32,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 10,
  },
  qHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  qHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  speakSmallBtn: {
    width: 32,
    height: 32,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 28,
  },
  optionsList: {
    gap: 16,
  },
  optCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 20,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  optCardActive: {
    backgroundColor: '#FFF7ED', // orange-50
    borderColor: '#F97316',
    borderWidth: 1,
  },
  optCardCorrect: {
    backgroundColor: '#F0FDF4', // green-50
    borderColor: '#22C55E', // green-500
    borderWidth: 1,
  },
  optCardWrong: {
    backgroundColor: '#FEF2F2', // red-50
    borderColor: '#EF4444', // red-500
    borderWidth: 1,
  },
  optLetterBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optLetterBoxActive: {
    backgroundColor: '#F97316',
  },
  optLetterBoxCorrect: {
    backgroundColor: '#22C55E',
  },
  optLetterBoxWrong: {
    backgroundColor: '#EF4444',
  },
  optLetterText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94A3B8',
  },
  optLetterTextActive: {
    color: '#FFFFFF',
  },
  optLetterTextCorrect: {
    color: '#FFFFFF',
  },
  optLetterTextWrong: {
    color: '#FFFFFF',
  },
  optText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155', // slate-700
    flex: 1,
  },
  optTextActive: {
    fontWeight: '800',
    color: '#0F172A',
  },
  optTextCorrect: {
    fontWeight: '800',
    color: '#14532D', // green-900
  },
  optTextWrong: {
    fontWeight: '800',
    color: '#7F1D1D', // red-900
  },
  optExplanationText: {
    fontSize: 13,
    color: '#64748B', // slate-500
    fontStyle: 'italic',
    marginTop: 6,
    lineHeight: 18,
  },
  bottomContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 40,
  },
  submitBtn: {
    width: '100%',
    backgroundColor: '#F97316', // orange-500
    paddingVertical: 20,
    borderRadius: 100,
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  inputSection: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 2,
    marginLeft: 12,
  },
  inputWrapper: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 20,
    minHeight: 180,
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'space-between',
  },
  textInput: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    textAlignVertical: 'top',
    flex: 1,
    marginBottom: 16,
  },
  micActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
  },
  listeningText: {
    color: '#F97316',
    fontSize: 14,
    fontWeight: '800',
  },
  micPulseWrap: {
    borderRadius: 999,
  },
  smallMicBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  smallMicBtnActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  explainAreaText: {
    marginTop: 8,
    padding: 24,
    backgroundColor: '#1E293B',
    borderRadius: 32,
    borderLeftWidth: 4,
    borderColor: '#3B82F6',
  },
  explainTitleText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  explainLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#3B82F6',
    letterSpacing: 2,
    marginBottom: 8,
  },
  explainContentText: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 22,
  }
});
