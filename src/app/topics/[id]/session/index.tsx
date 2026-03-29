import { Feather } from '@expo/vector-icons';
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
import { persistTopicProgress } from '../../../../lib/topicsDb';
import { useSessionStore } from '../../../../store/session';
import { useTopicsStore } from '../../../../store/topics';

export default function SessionScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { questions, currentIndex, isCompleted, score, startSession, submitAnswer, nextQuestion, resetSession } = useSessionStore();
  const topic = useTopicsStore(s => s.topics.find(t => t.id === id));
  const { updateTopicProgress } = useTopicsStore();
  const db = SQLite.useSQLiteContext();

  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
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
    setTimeout(() => {
      const dummyQuestions = [
        { id: '1', format: 'mcq', content: 'What is the powerhouse of the cell?', options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Membrane'], answer: 'Mitochondria', explanation: 'Mitochondria generate most of the chemical energy.' },
        { id: '2', format: 'true_false', content: 'React Native compiles to native code.', options: ['True', 'False'], answer: 'True', explanation: 'It uses native UI components.' },
        { id: '3', format: 'mcq', content: 'What language is React Native written in?', options: ['Java', 'C++', 'JavaScript', 'Swift'], answer: 'JavaScript', explanation: 'It allows you to use React alongside native platform capabilities.' },
      ] as any;
      startSession(`session-${id}`, dummyQuestions);
      setLoading(false);
    }, 1000);
    
    return () => resetSession();
  }, [id]);

  const handleSubmit = () => {
    if (showExplanation) {
      setShowExplanation(false);
      setSelectedOption(null);
      nextQuestion();
    } else {
      if (!selectedOption) return;
      const isCorrect = selectedOption === questions[currentIndex].answer;
      submitAnswer(isCorrect);
      setShowExplanation(true);
      progressAnim.stopAnimation();
    }
  };

  const handleComplete = () => {
    const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    updateTopicProgress(id as string, pct, 1);
    void persistTopicProgress(db, id as string, pct, 1);
    router.back();
  };

  if (loading) return <View style={[styles.container, styles.centered]}><ActivityIndicator size="large" color="#F97316" /></View>;

  if (isCompleted) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Feather name="award" size={64} color="#F97316" style={{ marginBottom: 24 }} />
        <Text style={styles.titleCompleted}>Session Complete!</Text>
        <Text style={styles.scoreText}>You scored {score} / {questions.length}</Text>
        <TouchableOpacity style={styles.submitBtn} onPress={handleComplete}>
          <Text style={styles.submitBtnText}>Finish & Return</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const q = questions[currentIndex];
  const qNum = (currentIndex + 1).toString().padStart(2, '0');
  const percentComplete = Math.round((currentIndex / questions.length) * 100);
  const letters = ['A', 'B', 'C', 'D', 'E'];

  return (
    <View style={styles.container}>
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
          <Text style={styles.qHeader}>Question {qNum}</Text>
          <Text style={styles.qText}>{q.content}</Text>
          <View style={styles.qVisualBox}>
            <Feather name="code" size={36} color="#CBD5E1" />
          </View>
        </View>

        <View style={styles.optionsList}>
          {q.options.map((opt: string, i: number) => {
            const letter = letters[i] || '';
            const isSelected = selectedOption === opt;
            const isCorrectAnswer = opt === q.answer;
            
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
                key={opt}
                style={containerStyle}
                activeOpacity={0.8}
                onPress={() => {
                   if (!showExplanation) setSelectedOption(opt);
                }}
              >
                <View style={letterBoxStyle}>
                  <Text style={letterTextStyle}>{letter}</Text>
                </View>
                <Text style={optTextStyle}>{opt}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
        
        {showExplanation && (
          <View style={styles.explainArea}>
             <Text style={styles.explainTitle}>{selectedOption === q.answer ? 'Correct!' : 'Incorrect'}</Text>
             <Text style={styles.explainText}>{q.explanation}</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Button */}
      <View style={[styles.bottomContainer, { bottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity 
          style={[styles.submitBtn, !selectedOption && !showExplanation && { opacity: 0.5 }]} 
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={!selectedOption && !showExplanation}
        >
          <Text style={styles.submitBtnText}>{showExplanation ? 'Continue' : 'Submit'}</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    padding: 24,
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
    backgroundColor: '#1E293B', // slate-800
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155', // slate-700
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
    aspectRatio: 16 / 9,
    backgroundColor: '#F1F5F9', // slate-100
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
    padding: 20,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    borderLeftWidth: 4,
    borderColor: '#3B82F6',
  },
  explainTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  explainText: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 22,
  }
});
