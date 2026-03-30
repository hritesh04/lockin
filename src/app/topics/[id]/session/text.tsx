import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import * as SQLite from 'expo-sqlite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { completeSession, startSession as apiStartSession, submitAnswer as apiSubmitAnswer } from '../../../../lib/api';
import { persistTopicProgress } from '../../../../lib/topicsDb';
import { useSessionStore } from '../../../../store/session';
import { useTopicsStore } from '../../../../store/topics';
import SessionComplete from '../../../../components/SessionComplete';

export default function TextSessionScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { questions, currentIndex, isCompleted, score, startSession, submitAnswer, nextQuestion, resetSession } = useSessionStore();
  const topic = useTopicsStore(s => s.topics.find(t => t.id === id));
  const { updateTopicProgress } = useTopicsStore();
  const db = SQLite.useSQLiteContext();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [answer, setAnswer] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [apiFeedback, setApiFeedback] = useState<{ explanation: string; is_correct: boolean } | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    progressAnim.setValue(1);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 30000,
      useNativeDriver: false,
    }).start();
  }, [currentIndex]);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);

    (async () => {
      try {
        const { session_id, questions: qs } = await apiStartSession(String(id), 'text');
        if (cancelled) return;
        startSession(session_id, qs);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Could not start text session');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      resetSession();
    };
  }, [id]);

  const handleSubmit = () => {
    if (showExplanation) {
      setShowExplanation(false);
      setAnswer('');
      setApiFeedback(null);
      nextQuestion();
      return;
    }
    if (!answer.trim()) return;

    const sid = useSessionStore.getState().activeSessionId;
    const qNow = questions[currentIndex];
    if (!sid || !qNow) return;

    setSubmitting(true);
    void (async () => {
      try {
        const data = await apiSubmitAnswer(sid, {
          question_id: qNow.id,
          selected_answer: answer.trim(),
        });
        submitAnswer(data.is_correct);
        setApiFeedback({ explanation: data.explanation, is_correct: data.is_correct });
        setShowExplanation(true);
        progressAnim.stopAnimation();
      } catch (err) {
        console.warn('submitAnswer failed', err);
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const handleDashboard = () => {
    void (async () => {
      const sid = useSessionStore.getState().activeSessionId;
      if (sid) {
        try {
          await completeSession(sid);
        } catch (e) {
          console.warn('completeSession failed', e);
        }
      }
      const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
      updateTopicProgress(id as string, pct, 1);
      await persistTopicProgress(db, id as string, pct, 1);
      router.back();
    })();
  };

  const handleNextSession = () => {
    void (async () => {
      const sid = useSessionStore.getState().activeSessionId;
      if (sid) {
        try {
          await completeSession(sid);
        } catch (e) {
          console.warn('completeSession failed', e);
        }
      }
      const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
      updateTopicProgress(id as string, pct, 1);
      await persistTopicProgress(db, id as string, pct, 1);
      resetSession();
      router.replace(`/topics/${id as string}/session/text`);
    })();
  };

  if (loading) return <View style={[styles.container, styles.centered]}><ActivityIndicator size="large" color="#F97316" /></View>;

  if (loadError) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{loadError}</Text>
        <TouchableOpacity style={styles.submitBtn} onPress={() => router.back()}>
          <Text style={styles.submitBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
  const qNum = (currentIndex + 1).toString().padStart(2, '0');
  const percentComplete = Math.round((currentIndex / questions.length) * 100);

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
          <Text style={styles.pillText}>TEXT ANSWER</Text>
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
          <Text style={styles.qHeader}>Question {qNum}</Text>
          <Text style={styles.qText}>{q.content}</Text>
          <View style={styles.qVisualBox}>
            <Feather name="edit-3" size={36} color="#CBD5E1" />
          </View>
        </View>

        {!showExplanation ? (
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>YOUR EXPLANATION</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="Type your detailed answer here..."
                placeholderTextColor="#94A3B8"
                multiline
                value={answer}
                onChangeText={setAnswer}
                autoFocus
              />
            </View>
          </View>
        ) : (
          <View style={styles.explainArea}>
             <Text style={styles.explainTitle}>
               {apiFeedback?.is_correct === false ? 'Keep practicing' : 'Answer recorded'}
             </Text>
             <Text style={styles.explainLabel}>KEY CONCEPTS TO KNOW:</Text>
             <Text style={styles.explainText}>{apiFeedback?.explanation ?? q.explanation}</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Button */}
      <View style={[styles.bottomContainer, { bottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity 
          style={[styles.submitBtn, (!answer.trim() && !showExplanation) || submitting ? { opacity: 0.5 } : undefined]} 
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={(!answer.trim() && !showExplanation) || submitting}
        >
          <Text style={styles.submitBtnText}>
            {showExplanation ? 'Continue' : submitting ? 'Submitting…' : 'Submit Answer'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
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
    backgroundColor: '#3B82F6', // Blue for text mode
    shadowColor: '#3B82F6',
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
  qHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 12,
  },
  qText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 28,
    marginBottom: 24,
  },
  qVisualBox: {
    width: '100%',
    height: 60,
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 24,
    minHeight: 180,
    borderWidth: 1,
    borderColor: '#334155',
  },
  textInput: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  bottomContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 40,
  },
  submitBtn: {
    width: '100%',
    backgroundColor: '#3B82F6',
    paddingVertical: 20,
    borderRadius: 100,
    alignItems: 'center',
    shadowColor: '#3B82F6',
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
  titleCompleted: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 48,
  },
  explainArea: {
    marginTop: 8,
    padding: 24,
    backgroundColor: '#1E293B',
    borderRadius: 32,
    borderLeftWidth: 4,
    borderColor: '#3B82F6',
  },
  explainTitle: {
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
  explainText: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 22,
  }
});
