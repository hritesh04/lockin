import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Dimensions, DimensionValue, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FloatingNavBar from '../components/FloatingNavBar';
import { getActivity, getMe, isAbortError } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { useUserStore } from '../store/user';

// Dynamic sizing for heatmap grid
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 24;
const GRID_GAP = 8;
const GRID_CONTAINER_WIDTH = SCREEN_WIDTH - (GRID_PADDING * 2) - 48; 
const SQUARE_SIZE = (GRID_CONTAINER_WIDTH - (9 * GRID_GAP)) / 10;

export default function StatsScreen() {
  const [activeBar, setActiveBar] = useState<number | null>(null);
  const [activeSquare, setActiveSquare] = useState<number | null>(null);
  const router = useRouter();
  const streakCount = useUserStore(state => state.streakCount);
  const activityHistory = useUserStore(state => state.activityHistory);
  const hydrateUser = useUserStore(state => state.hydrateFromServer);
  const setActivityHistory = useUserStore(state => state.setActivityHistory);
  const token = useAuthStore(state => state.token);

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      const load = async () => {
        if (!token) return;
        try {
          const [userData, activityInfo] = await Promise.all([
            getMe(controller.signal),
            getActivity(controller.signal),
          ]);
          if (!controller.signal.aborted) {
            hydrateUser(userData);
            setActivityHistory(activityInfo.activity || []);
          }
        } catch (e) {
          if (!isAbortError(e)) {
            console.error('Stats API sync failed', e);
          }
        }
      };
      load();
      return () => { controller.abort(); };
    }, [token])
  );

  // Map 30 days for heatmap
  const heatmapData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (29 - i));
    
    // Robust local date comparison
    const dayData = activityHistory.find(a => {
      // Split YYYY-MM-DD
      const parts = a.day.split('-');
      if (parts.length !== 3) return false;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed
      const day = parseInt(parts[2], 10);
      return year === d.getFullYear() && month === d.getMonth() && day === d.getDate();
    });
    
    // Intensity based on session count or time spent
    const sessionCount = (dayData?.lessons?.length || 0) + (dayData?.quizes?.length || 0);
    const timeSec = dayData?.total_time || 0;
    
    let intensity = 0;
    if (sessionCount >= 3 || timeSec >= 3600) intensity = 1.0;
    else if (sessionCount >= 2 || timeSec >= 1800) intensity = 0.6;
    else if (sessionCount >= 1 || timeSec > 0) intensity = 0.3;

    const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    return { 
      id: i, 
      intensity, 
      day: dayStr,
      dateLabel,
      sessionCount,
      lessonCount: dayData?.lessons?.length || 0,
      quizCount: dayData?.quizes?.length || 0
    };
  });

  // Group into columns for top-to-bottom (3 rows per column)
  const heatmapColumns = [];
  for (let i = 0; i < heatmapData.length; i += 3) {
    heatmapColumns.push(heatmapData.slice(i, i + 3));
  }

  // Calculate totals
  const totalTopics = new Set(activityHistory.flatMap(a => a.quizes.map(q => q.topic_name))).size;
  const totalTimeSeconds = activityHistory.reduce((acc, curr) => acc + curr.total_time, 0);
  
  const formatDuration = (seconds: number) => {
    if (seconds === 0) return "0 min";
    if (seconds < 3600) {
      return `${Math.round(seconds / 60)} min`;
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  const totalTimeLabel = formatDuration(totalTimeSeconds);
  const totalLessons = activityHistory.reduce((acc, curr) => acc + curr.lessons.length, 0);

  // Weekly trend (last 7 days focus time)
  const last7DaysRaw = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().split('T')[0];
    const dayData = activityHistory.find(a => a.day === dayStr);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const timeSec = dayData?.total_time || 0;
    return { day: dayName, timeSec, active: i === 6 };
  });

  const maxTime = Math.max(...last7DaysRaw.map(d => d.timeSec), 60); // Min scale of 10 mins

  const last7Days = last7DaysRaw.map(day => ({
    ...day,
    height: `${Math.max((day.timeSec / maxTime) * 100, day.timeSec > 0 ? 5 : 0)}%` as DimensionValue
  }));

  // Recent activity feed (flattened)
  const recentActivities = activityHistory
    .flatMap(day => [
      ...day.lessons.map(l => ({ ...l, type: 'lesson' as const, day: day.day })),
      ...day.quizes.map(q => ({ ...q, type: 'quiz' as const, day: day.day }))
    ])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      {/* Decorative Gradient Placeholder (Simulated with View) */}
      <View style={styles.decorativeGradient} />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Activity</Text>
            <Text style={styles.headerSubtitle}>Keep the momentum going!</Text>
          </View>
          <View style={styles.streakBadge}>
            <MaterialCommunityIcons name="fire" size={16} color="#f97316" />
            <Text style={styles.streakText}>{streakCount} Day Streak</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.mainContent} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Heatmap Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>LAST 30 DAYS ACTIVITY</Text>
        </View>
        <View style={styles.heatmapCard}>
          <View style={styles.heatmapGrid}>
            {heatmapColumns.map((col, colIndex) => (
              <View key={colIndex} style={styles.heatmapColumn}>
                {col.map((item) => (
                  <View key={item.id} style={{ alignItems: 'center', zIndex: activeSquare === item.id ? 100 : 1 }}>
                    {activeSquare === item.id && (
                      <View style={styles.heatmapTooltip}>
                        <Text style={styles.tooltipDate}>{item.dateLabel}</Text>
                        <Text style={styles.tooltipText}>{item.sessionCount} Sessions</Text>
                        <Text style={styles.tooltipSubText}>{item.lessonCount} Lessons, {item.quizCount} Quizzes</Text>
                        <View style={styles.tooltipArrow} />
                      </View>
                    )}
                    <Pressable
                      onPressIn={() => setActiveSquare(item.id)}
                      onPressOut={() => setActiveSquare(null)}
                      style={[
                        styles.heatmapSquare, 
                        { 
                          backgroundColor: item.intensity === 0 
                            ? '#1E293B' // slate-800 
                            : `rgba(249, 115, 22, ${0.4 + item.intensity * 0.6})` 
                        },
                        item.intensity > 0.8 && styles.heatmapSquareHighlight,
                        activeSquare === item.id && { transform: [{ scale: 1.1 }], zIndex: 10 }
                      ]} 
                    />
                  </View>
                ))}
              </View>
            ))}
          </View>
          <View style={styles.heatmapLegend}>
            <Text style={styles.legendText}>30 days ago</Text>
            <View style={styles.legendScale}>
              <Text style={styles.legendText}>Less</Text>
              <View style={styles.legendRow}>
                <View style={[styles.legendBox, { backgroundColor: '#1E293B' }]} />
                <View style={[styles.legendBox, { backgroundColor: 'rgba(249, 115, 22, 0.3)' }]} />
                  <View style={[styles.legendBox, { backgroundColor: 'rgba(249, 115, 22, 0.6)' }]} />
                  <View style={[styles.legendBox, { backgroundColor: '#f97316' }]} />
                </View>
                <Text style={styles.legendText}>More</Text>
              </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <View style={styles.statIconWrapper}>
              <Feather name="award" size={16} color="#facc15" />
            </View>
            <Text style={styles.statLabel}>LESSONS</Text>
            <Text style={styles.statValue}>{totalLessons} <Text style={styles.statUnit}>Total</Text></Text>
          </View>

          <View style={styles.statBox}>
            <View style={styles.statIconWrapper}>
              <Feather name="clock" size={16} color="#fb923c" />
            </View>
            <Text style={styles.statLabel}>FOCUS TIME</Text>
            <Text style={styles.statValue}>{totalTimeLabel}</Text>
          </View>

          <View style={styles.statBox}>
            <View style={styles.statIconWrapper}>
              <Feather name="book-open" size={16} color="#fb923c" />
            </View>
            <Text style={styles.statLabel}>TOPICS</Text>
            <Text style={styles.statValue}>{totalTopics} <Text style={styles.statUnit}>Covered</Text></Text>
          </View>

          <View style={styles.statBox}>
            <View style={styles.statIconWrapper}>
              <Feather name="calendar" size={16} color="#fb923c" />
            </View>
            <Text style={styles.statLabel}>STREAK</Text>
            <Text style={styles.statValue}>{streakCount} <Text style={styles.statUnit}>Days</Text></Text>
          </View>
        </View>

        {/* Weekly Trend Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>LEARNING TREND</Text>
        </View>
        <View style={styles.chartCard}>
          <View style={styles.chartArea}>
            {last7Days.map((day, i) => {
              const dayTimeLabel = formatDuration(day.timeSec);
              return (
                <View key={i} style={styles.barWrapper}>
                  <Pressable 
                    onPressIn={() => setActiveBar(i)}
                    onPressOut={() => setActiveBar(null)}
                    style={{ width: '100%', height: '100%', justifyContent: 'flex-end', alignItems: 'center' }}
                  >
                    {activeBar === i && (
                      <View style={[styles.tooltip, { bottom: day.height }]}>
                        <Text style={styles.tooltipText}>{dayTimeLabel}</Text>
                        <View style={styles.tooltipArrow} />
                      </View>
                    )}
                    <View 
                      style={[
                        styles.barFill, 
                        { height: day.height },
                        // (day.active || activeBar === i) && 
                        styles.barFillActive
                      ]} 
                    />
                  </Pressable>
                </View>
              );
            })}
          </View>
          <View style={styles.chartLabels}>
            {last7Days.map((day, i) => (
              <Text key={i} style={styles.chartLabelText}>{day.day}</Text>
            ))}
          </View>
        </View>

        {/* Activity Feed */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
        </View>
        <View style={styles.feedWrapper}>
          {recentActivities.map((act, i) => (
            <View key={i} style={styles.feedItem}>
              <View style={styles.feedIconBox}>
                <Feather name={act.type === 'lesson' ? 'book-open' : 'zap'} size={18} color="#f97316" />
              </View>
              <View style={styles.feedContent}>
                <Text style={styles.feedTitle}>
                  {act.type === 'lesson' ? act.title : (act as any).topic_name + ' Quiz'}
                </Text>
                <Text style={styles.feedDesc}>
                  {new Date(act.completed_at || act.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.feedCheck}>
                <Feather name="check" size={12} color="#f97316" />
              </View>
            </View>
          ))}
          {recentActivities.length === 0 && (
            <Text style={{ color: '#64748B', textAlign: 'center', marginVertical: 20 }}>No sessions yet</Text>
          )}
        </View>
      </ScrollView>

      <FloatingNavBar activeScreen="stats" onAddPress={()=>{}} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // slate-950
  },
  decorativeGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '500',
  },
  streakBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  streakText: {
    color: '#f97316',
    fontWeight: '800',
    fontSize: 12,
  },
  mainContent: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 140,
    gap: 24,
  },
  sectionHeader: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heatmapCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 32,
    paddingHorizontal: 23,
    paddingVertical: 18,
  },
  heatmapGrid: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-start',
  },
  heatmapColumn: {
    flexDirection: 'column',
    gap: 8,
  },
  heatmapSquare: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    borderRadius: 4,
  },
  heatmapSquareHighlight: {
    shadowColor: '#f97316',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    elevation: 4,
  },
  heatmapLegend: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  legendScale: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 4,
  },
  legendBox: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 20,
    borderRadius: 28,
  },
  statIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  chartCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 32,
    padding: 24,
  },
  chartArea: {
    height: 120,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  barFillActive: {
    backgroundColor: '#f97316',
    shadowColor: '#f97316',
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 8,
  },
  tooltip: {
    position: 'absolute',
    marginBottom: 8,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    minWidth: 44,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -4,
    width: 8,
    height: 8,
    backgroundColor: '#1E293B',
    transform: [{ rotate: '45deg' }],
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: '#334155',
  },
  heatmapTooltip: {
    position: 'absolute',
    bottom: SQUARE_SIZE + 10,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  tooltipDate: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 2,
  },
  tooltipSubText: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  chartLabelText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  feedWrapper: {
    gap: 12,
  },
  feedItem: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  feedIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedContent: {
    flex: 1,
  },
  feedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  feedDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  feedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

