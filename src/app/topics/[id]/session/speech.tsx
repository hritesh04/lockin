import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import * as SQLite from 'expo-sqlite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { completeSession, startSession as apiStartSession, submitAnswer as apiSubmitAnswer } from '../../../../lib/api';
import { persistTopicProgress } from '../../../../lib/topicsDb';
import { useSessionStore } from '../../../../store/session';
import { useTopicsStore } from '../../../../store/topics';

export default function SpeechSessionScreen() {
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
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [apiFeedback, setApiFeedback] = useState<{ explanation: string; is_correct: boolean } | null>(null);
  
  const progressAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!loading && !isCompleted && questions[currentIndex]) {
      handleSpeakQuestion();
    }
  }, [currentIndex, loading, isCompleted]);

  useEffect(() => {
    progressAnim.setValue(1);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 30000,
      useNativeDriver: false,
    }).start();
  }, [currentIndex]);

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
    let cancelled = false;
    setLoadError(null);

    (async () => {
      try {
        const { session_id, questions: qs } = await apiStartSession(String(id), 'speech');
        if (cancelled) return;
        startSession(session_id, qs);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Could not start speech session');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      resetSession();
    };
  }, [id]);

  const handleSpeechInput = () => {
    if (isListening) {
      setIsListening(false);
      // Mocking a transcript
      setTranscript('I think the Context API is useful because it allows us to share state between multiple components without having to pass props through every level of the tree manually.');
    } else {
      setIsListening(true);
      setTranscript('');
    }
  };

  const handleSpeakQuestion = () => {
    setIsSpeaking(true);
    // In a real app: Speech.speak(q.content);
    setTimeout(() => setIsSpeaking(false), 2000);
  };

  const handleSubmit = () => {
    if (showExplanation) {
      setShowExplanation(false);
      setTranscript('');
      setApiFeedback(null);
      nextQuestion();
      return;
    }
    if (!transcript.trim()) return;

    const sid = useSessionStore.getState().activeSessionId;
    const qNow = questions[currentIndex];
    if (!sid || !qNow) return;

    setSubmitting(true);
    void (async () => {
      try {
        const data = await apiSubmitAnswer(sid, {
          question_id: qNow.id,
          selected_answer: transcript.trim(),
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

  const handleComplete = () => {
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

  if (loading) return <View style={[styles.container, styles.centered]}><ActivityIndicator size="large" color="#10B981" /></View>;

  if (loadError) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{loadError}</Text>
        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#10B981' }]} onPress={() => router.back()}>
          <Text style={styles.submitBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isCompleted) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Feather name="award" size={64} color="#10B981" style={{ marginBottom: 24 }} />
        <Text style={styles.titleCompleted}>Speech Session Complete!</Text>
        <Text style={styles.scoreText}>Great job explaining the concepts!</Text>
        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#10B981' }]} onPress={handleComplete}>
          <Text style={styles.submitBtnText}>Finish & Return</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const q = questions[currentIndex];
  const qNum = (currentIndex + 1).toString().padStart(2, '0');
  const percentComplete = Math.round((currentIndex / questions.length) * 100);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.exitBtn} onPress={() => router.back()}>
          <Feather name="x" size={16} color="#94A3B8" />
          <Text style={styles.exitText}>Exit</Text>
        </TouchableOpacity>

        <View style={styles.pillBox}>
          <Text style={styles.pillText}>SPEECH MODE</Text>
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
                color={isSpeaking ? "#10B981" : "#94A3B8"} 
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.qText}>{q.content}</Text>
        </View>

        <View style={styles.voiceSection}>
          <Text style={styles.voiceLabel}>TAP MICROPHONE TO SPEAK</Text>
          <View style={styles.micContainer}>
            <Animated.View style={[styles.micOuterCircle, { transform: [{ scale: pulseAnim }] }]} />
            <TouchableOpacity 
              style={[styles.micBtn, isListening && styles.micBtnActive]} 
              activeOpacity={0.8}
              onPress={handleSpeechInput}
            >
              <Feather name={isListening ? "mic" : "mic-off"} size={40} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          {isListening && <Text style={styles.listeningText}>Listening...</Text>}
          
          {transcript !== '' && (
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptLabel}>YOUR ANSWER:</Text>
              <Text style={styles.transcriptText}>"{transcript}"</Text>
            </View>
          )}
        </View>

        {showExplanation && (
          <View style={[styles.explainArea, { borderColor: '#10B981' }]}>
             <Text style={styles.explainTitle}>
               {apiFeedback?.is_correct === false ? 'Keep practicing' : 'Answer recorded'}
             </Text>
             <Text style={styles.explainLabel}>LEARNING INSIGHTS:</Text>
             <Text style={styles.explainText}>{apiFeedback?.explanation ?? q.explanation}</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Button */}
      <View style={[styles.bottomContainer, { bottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity 
          style={[styles.submitBtn, { backgroundColor: '#10B981' }, (!transcript.trim() && !showExplanation) || submitting ? { opacity: 0.5 } : undefined]} 
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={(!transcript.trim() && !showExplanation) || submitting}
        >
          <Text style={styles.submitBtnText}>
            {showExplanation ? 'Continue' : submitting ? 'Submitting…' : 'Submit Answer'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
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
  voiceSection: {
    alignItems: 'center',
    gap: 24,
    marginTop: 20,
  },
  voiceLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 2,
  },
  micContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micOuterCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  micBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  micBtnActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  listeningText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  transcriptBox: {
    width: '100%',
    backgroundColor: '#1E293B',
    padding: 24,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#334155',
  },
  transcriptLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 2,
    marginBottom: 8,
  },
  transcriptText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  bottomContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 40,
  },
  submitBtn: {
    width: '100%',
    paddingVertical: 20,
    borderRadius: 100,
    alignItems: 'center',
    shadowColor: '#10B981',
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
    textAlign: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 48,
    textAlign: 'center',
  },
  explainArea: {
    marginTop: 8,
    padding: 24,
    backgroundColor: '#1E293B',
    borderRadius: 32,
    borderLeftWidth: 4,
    borderColor: '#10B981',
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
    color: '#10B981',
    letterSpacing: 2,
    marginBottom: 8,
  },
  explainText: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 22,
  }
});
