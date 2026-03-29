import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTopicsStore } from '../../../store/topics';
import { useUserStore } from '../../../store/user';

export default function NewSessionScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const topics = useTopicsStore(state => state.topics);
  const topic = topics.find(t => t.id === id);
  const streakCount = useUserStore(state => state.streakCount);

  if (!topic) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'black' }}>Topic not found</Text>
      </View>
    );
  }

  const handleStartSession = (mode: string) => {
    switch (mode) {
      case 'text':
        router.push(`/topics/${id}/session/text`);
        break;
      case 'speech':
        router.push(`/topics/${id}/session/speech`);
        break;
      case 'mcq':
        router.push(`/topics/${id}/session`);
        break;
      default:
        router.push(`/topics/${id}/session`);
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="chevron-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        {streakCount > 0 ?
          <View style={styles.activeStreakBadge}>
            <MaterialCommunityIcons 
              name="fire" 
              size={14} 
              color="#f97316" 
            />
              <Text style={styles.streakText}>{streakCount}d Streak</Text>
          </View>
          : <View style={styles.noStreakBadge}>
              <Text style={styles.noStreakText}>No Streak</Text>
          </View>
        }
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Topic Hero */}
        <View style={styles.heroSection}>
          <View style={styles.heroInfo}>
            <Text style={styles.topicName}>{topic.title}</Text>
            <Text style={styles.topicSubtitle}>Advanced Architect Course</Text>
          </View>
          <View style={styles.heroIconBox}>
            <MaterialCommunityIcons name="atom" size={28} color="#FFF" />
          </View>
        </View>

        {/* Session Modes */}
        <View style={styles.modesSection}>
          <Text style={styles.sectionTitle}>SELECT SESSION MODE</Text>
          <View style={styles.modeList}>
            <TouchableOpacity 
              style={styles.modeCard} 
              onPress={() => handleStartSession('mcq')}
              activeOpacity={0.7}
            >
              <View style={[styles.modeIconBox, { backgroundColor: '#FFEDD5' }]}>
                <Feather name="check-square" size={24} color="#f97316" />
              </View>
              <View style={styles.modeContent}>
                <Text style={styles.modeName}>MCQ Quiz</Text>
                <Text style={styles.modeDesc}>Multiple choice questions</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modeCard} 
              onPress={() => handleStartSession('text')}
              activeOpacity={0.7}
            >
              <View style={[styles.modeIconBox, { backgroundColor: '#DBEAFE' }]}>
                <Feather name="edit-3" size={24} color="#2563EB" />
              </View>
              <View style={styles.modeContent}>
                <Text style={styles.modeName}>Text Answer</Text>
                <Text style={styles.modeDesc}>Write detailed explanations</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modeCard} 
              onPress={() => handleStartSession('speech')}
              activeOpacity={0.7}
            >
              <View style={[styles.modeIconBox, { backgroundColor: '#D1FAE5' }]}>
                <Feather name="mic" size={24} color="#10B981" />
              </View>
              <View style={styles.modeContent}>
                <Text style={styles.modeName}>Speech Mode</Text>
                <Text style={styles.modeDesc}>Speak out your answers</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Activity Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Feather name="rotate-ccw" size={18} color="#94A3B8" style={{ marginBottom: 12 }} />
            <Text style={styles.statValue}>{topic.sessionsCompleted}</Text>
            <Text style={styles.statLabel}>SESSIONS</Text>
          </View>
          <View style={styles.statBox}>
            <Feather name="clock" size={18} color="#94A3B8" style={{ marginBottom: 12 }} />
            <Text style={styles.statValue}>1h 12m</Text>
            <Text style={styles.statLabel}>TIME SPENT</Text>
          </View>
          <View style={styles.statBox}>
            <Feather name="calendar" size={18} color="#94A3B8" style={{ marginBottom: 12 }} />
            <Text style={styles.statValue}>Today</Text>
            <Text style={styles.statLabel}>LAST ACTIVE</Text>
          </View>
          <View style={styles.statBox}>
            <MaterialCommunityIcons name="fire" size={18} color="#f97316" style={{ marginBottom: 12 }} />
            <Text style={styles.statValue}>{streakCount} Days</Text>
            <Text style={styles.statLabel}>TOPIC STREAK</Text>
          </View>
        </View>

        {/* Curriculum Timeline */}
        <View style={styles.timelineSection}>
          <View style={styles.timelineHeader}>
            <Text style={styles.sectionTitle}>CURRICULUM ROADMAP</Text>
            <Text style={styles.timelineCount}>4 / 12 Lessons</Text>
          </View>

          <View style={styles.timelineList}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineNode, styles.timelineNodeCompleted]}>
                <Feather name="check" size={10} color="#FFF" />
              </View>
              <View style={[styles.timelineLine, styles.timelineLineCompleted]} />
              <View style={styles.timelineContent}>
                <Text style={styles.milestoneTitle}>Hooks Fundamentals</Text>
                <Text style={styles.milestoneDesc}>Completed \u2022 12 sessions</Text>
              </View>
            </View>

            <View style={styles.timelineItem}>
              <View style={[styles.timelineNode, styles.timelineNodeCurrent]}>
                <View style={styles.timelineNodeDot} />
              </View>
              <View style={styles.timelineLine} />
              <View style={styles.timelineContent}>
                <Text style={styles.milestoneTitle}>Context API & Composition</Text>
                <Text style={[styles.milestoneDesc, { color: '#f97316', fontWeight: 'bold' }]}>Current Objective</Text>
              </View>
            </View>

            <View style={[styles.timelineItem, { opacity: 0.5 }]}>
              <View style={styles.timelineNode} />
              <View style={styles.timelineLine} />
              <View style={styles.timelineContent}>
                <Text style={styles.milestoneTitle}>Performance Optimization</Text>
                <Text style={styles.milestoneDesc}>Locked \u2022 Intermediate</Text>
              </View>
            </View>

            <View style={[styles.timelineItem, { opacity: 0.5 }]}>
              <View style={styles.timelineNode} />
              <View style={styles.timelineContent}>
                <Text style={styles.milestoneTitle}>Advanced Testing Patterns</Text>
                <Text style={styles.milestoneDesc}>Locked \u2022 Advanced</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1,
  },
  activeStreakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    gap: 6,
  },
  noStreakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:'#edf1f1ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f8fafc',
    gap: 6,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f97316',
  },
  noStreakText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  heroSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  heroInfo: {
    flex: 1,
    gap: 4,
  },
  topicName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -1,
  },
  topicSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  heroIconBox: {
    width: 60,
    height: 60,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 15,
    elevation: 8,
  },
  modesSection: {
    gap: 16,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 2,
  },
  modeList: {
    gap: 12,
  },
  modeCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 32,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  modeIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeContent: {
    flex: 1,
    gap: 2,
  },
  modeName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modeDesc: {
    fontSize: 12,
    color: '#64748B',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFF',
    borderRadius: 32,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  timelineSection: {
    gap: 24,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineCount: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 20,
    paddingBottom: 32,
    position: 'relative',
  },
  timelineNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    borderWidth: 4,
    borderColor: '#FFF',
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineNodeCompleted: {
    backgroundColor: '#f97316',
    borderWidth: 0,
  },
  timelineNodeCurrent: {
    backgroundColor: '#FFF',
    borderColor: '#f97316',
  },
  timelineNodeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f97316',
  },
  timelineLine: {
    position: 'absolute',
    left: 11,
    top: 24,
    bottom: -16,
    width: 2,
    backgroundColor: '#E2E8F0',
  },
  timelineLineCompleted: {
    backgroundColor: '#f97316',
  },
  timelineContent: {
    flex: 1,
    gap: 4,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  milestoneDesc: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
