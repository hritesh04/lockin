import FloatingNavBar from '@/components/FloatingNavBar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createTopic, listTopics, proficiencyToApi } from '../lib/api';import { Topic, useTopicsStore } from '../store/topics';
import { useUserStore } from '../store/user';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const streakCount = useUserStore(state => state.streakCount);
  const activityHistory = useUserStore(state => state.activityHistory);
  const topics = useTopicsStore(state => state.topics);
  const addTopic = useTopicsStore(state => state.addTopic);
  const setTopics = useTopicsStore(state => state.setTopics);
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [topicName, setTopicName] = useState('');
  const [selectedProficiency, setSelectedProficiency] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [dbActivityHistory, setDbActivityHistory] = useState<('active' | 'inactive')[]>(Array(7).fill('inactive'));

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

    const run = async () => {
      try {
        // TODO: Replace with actual activity history API endpoint once ready
        // Scaffold: returning active/inactive for last 7 days arbitrarily for now
        const mockActivity: ('active' | 'inactive')[] = [
          'inactive', 'active', 'inactive', 'inactive', 'active', 'active', 'inactive' 
        ];
        if (isActive) setDbActivityHistory(mockActivity);
      } catch (e) {
        console.error('Error fetching activity history:', e);
      }

      try {
        const apiTopics = await listTopics();
        
        // Map ApiTopic to Topic
        const mappedTopics: Topic[] = apiTopics.map((t: any) => ({
          id: t.id,
          title: t.title,
          currentTier: t.currentTier ?? 1,
          familiarityLevel: t.familiarityLevel ?? 'beginner',
          accuracyPercent: 0, // Placeholder, API should ideally return this
          sessionsCompleted: 0, // Placeholder, API should ideally return this
          weakConcepts: [],
        }));
        
        if (isActive) setTopics(mappedTopics);
      } catch (e) {
        console.warn('Topic API sync failed', e);
      }
    };

      void run();

      return () => {
        isActive = false;
      };
    }, [setTopics])
  );

  const handleCreate = async () => {
    if (!topicName.trim() || isGenerating) return;
    setIsGenerating(true);

    try {
      const { topic: apiTopic } = await createTopic({
        title: topicName.trim(),
        familiarity_level: proficiencyToApi(selectedProficiency),
      });
      // Map and append directly
      const newTopic: Topic = {
          id: apiTopic.id,
          title: apiTopic.title,
          currentTier: apiTopic.currentTier ?? 1,
          familiarityLevel: apiTopic.familiarityLevel ?? 'beginner',
          accuracyPercent: 0,
          sessionsCompleted: 0,
          weakConcepts: [],
      };
      addTopic(newTopic);
      setShowModal(false);
      setTopicName('');
      setSelectedProficiency('beginner');
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderHeroCard = (topic: Topic) => (
    <TouchableOpacity 
      style={styles.heroPopulatedCard}
      activeOpacity={0.8}
      onPress={() => router.push(`/topics/${topic.id}`)}
    >
      <View style={styles.heroGlow} />
      <View style={styles.heroPopulatedInner}>
        <View style={styles.heroPopulatedLeft}>
          <View style={styles.heroPopulatedIconBox}>
            <Feather name="terminal" size={28} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.heroPopulatedTitle}>{topic.title}</Text>
            <Text style={styles.heroPopulatedSubtitle}>{topic.sessionsCompleted} sessions</Text>
          </View>
        </View>
        <View style={styles.heroPopulatedPlayBtn}>
          <Ionicons name="play" size={24} color="#0F172A" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.heroCard}>
      <View style={styles.heroGlow} />
      <View style={{ zIndex: 10 }}>
        <View style={styles.heroIconBox}>
          <Feather name="book" size={32} color="#2563EB" />
        </View>
        <Text style={styles.heroTitle}>Welcome to LockIn</Text>
        <View style={styles.heroSubContainer}>
          <Text style={styles.heroSubtitle}>Add a new topic to begin.</Text>
        </View>
        <TouchableOpacity 
          style={styles.heroBtn}
          activeOpacity={0.8}
          onPress={() => setShowModal(true)}
        >
          <Text style={styles.heroBtnText}>Add First Topic</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const mainTopics = topics.length > 0 ? topics : [];
  const heroTopic = mainTopics[0];
  const additionalTopics = mainTopics.slice(1);

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Streak Banner */}
        <View style={styles.streakBanner}>
          <View style={styles.streakLeft}>
            <View style={styles.flameCircle}>
              <Ionicons name="flame" size={24} color="#F97316" />
            </View>
            <View>
              <Text style={styles.streakCount}>{streakCount}</Text>
              <Text style={styles.streakLabel}>DAY STREAK</Text>
            </View>
          </View>
          <View style={styles.streakRight}>
            <Text style={styles.streakRightLabel}>KEEP THE MOMENTUM</Text>
            <View style={styles.streakDots}>
              {dbActivityHistory.map((status, i) => (
                <View
                  key={i}
                  style={[
                    styles.sDot,
                    status === 'active' && styles.sDotActive,
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Hero Topic or Empty */}
        {heroTopic ? renderHeroCard(heroTopic) : renderEmptyState()}

        {/* Additional Topics */}
        {additionalTopics.map(t => (
          <TouchableOpacity
            key={t.id}
            style={styles.courseCard}
            activeOpacity={0.7}
            onPress={() => router.push(`/topics/${t.id}`)}
          >
            <View style={styles.courseCardIconBox}>
              <Feather name="database" size={24} color="#6366F1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.courseCardTitle}>{t.title}</Text>
              <Text style={styles.courseCardSub}>{t.sessionsCompleted} sessions completed</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Floating Bottom Nav */}
      <FloatingNavBar onAddPress={() => setShowModal(true)} activeScreen='home'/>

      {/* Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalBackdrop}>
            <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setShowModal(false)} activeOpacity={1} />
            
            <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Topic</Text>
                <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalClose}>
                  <Feather name="x" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Topic Name</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter topic name"
                  placeholderTextColor="#64748B"
                  value={topicName}
                  onChangeText={setTopicName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Proficiency Level</Text>
                
                {['beginner', 'intermediate', 'advanced'].map(level => {
                  const isActive = selectedProficiency === level;
                  const label = level.charAt(0).toUpperCase() + level.slice(1);
                  const desc = level === 'beginner' ? 'New to this topic' : level === 'intermediate' ? 'Some experience' : 'Expert level';
                  
                  return (
                    <TouchableOpacity
                      key={level}
                      activeOpacity={0.7}
                      onPress={() => setSelectedProficiency(level as any)}
                      style={[styles.profCard, isActive && styles.profCardActive]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <View style={[styles.profDot, isActive && styles.profDotActive]} />
                        <Text style={styles.profTitle}>{label}</Text>
                      </View>
                      <Text style={styles.profDesc}>{desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.btnCancel} onPress={() => setShowModal(false)}>
                  <Text style={styles.btnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.btnSubmit} 
                  onPress={handleCreate}
                  disabled={isGenerating}
                >
                  {isGenerating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnSubmitText}>Add Topic</Text>}
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
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 160,
    gap: 24,
  },
  streakBanner: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#CBD5E1',
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 8,
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  flameCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  streakLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  streakRight: {
    alignItems: 'flex-end',
  },
  streakRightLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  streakDots: {
    flexDirection: 'row',
    gap: 6,
  },
  sDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#334155',
  },
  sDotActive: {
    backgroundColor: '#F97316',
  },

  heroCard: {
    backgroundColor: '#E0F2FE',
    borderRadius: 40,
    padding: 32,
    overflow: 'hidden',
    shadowColor: '#BFDBFE',
    shadowOpacity: 0.8,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 8,
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(147, 197, 253, 0.3)',
  },
  heroIconBox: {
    width: 64,
    height: 64,
    backgroundColor: '#FFF',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  heroSubContainer: {
    marginBottom: 32,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },
  heroBtn: {
    backgroundColor: '#0F172A',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 100,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
  },
  heroBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  heroPopulatedCard: {
    backgroundColor: '#E0F2FE',
    borderRadius: 40,
    padding: 24,
    overflow: 'hidden',
    shadowColor: '#BFDBFE',
    shadowOpacity: 0.8,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 8,
  },
  heroPopulatedInner: {
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroPopulatedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
    paddingRight: 16,
  },
  heroPopulatedIconBox: {
    width: 60,
    height: 60,
    backgroundColor: '#FFF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  heroPopulatedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  heroPopulatedSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  heroPopulatedPlayBtn: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  courseCard: {
    backgroundColor: '#FFF',
    borderRadius: 40,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#94A3B8',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  courseCardIconBox: {
    width: 56,
    height: 56,
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  courseCardSub: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
  },
  modalClose: {
    padding: 4,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 12,
  },
  formInput: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#FFF',
    padding: 16,
    fontSize: 16,
  },
  profCard: {
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#334155',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  profCardActive: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderColor: '#F97316',
  },
  profDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#475569',
    marginRight: 10,
  },
  profDotActive: {
    borderColor: '#F97316',
    backgroundColor: '#F97316',
  },
  profTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  profDesc: {
    color: '#94A3B8',
    fontSize: 14,
    marginLeft: 28,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  btnCancel: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  btnCancelText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  btnSubmit: {
    flex: 1,
    backgroundColor: '#F97316',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
  },
  btnSubmitText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
