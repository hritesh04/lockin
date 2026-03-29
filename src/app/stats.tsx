import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    DimensionValue,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FloatingNavBar from '../components/FloatingNavBar';

export default function StatsScreen() {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);

  // Mock data for heatmap (30 days)
  const heatmapData = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    intensity: Math.random() > 0.3 ? Math.random() : 0, // 0 to 1
  }));

  // Mock data for weekly trend
  const weeklyTrend = [
    { day: 'Mon', height: '30%' },
    { day: 'Tue', height: '50%' },
    { day: 'Wed', height: '40%' },
    { day: 'Thu', height: '90%', active: true },
    { day: 'Fri', height: '70%' },
    { day: 'Sat', height: '20%' },
    { day: 'Sun', height: '45%' },
  ];

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
            <Text style={styles.streakText}>12 Day Streak</Text>
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
            {heatmapData.map((item) => (
              <View 
                key={item.id} 
                style={[
                  styles.heatmapSquare, 
                  { 
                    backgroundColor: item.intensity === 0 
                      ? '#1E293B' // slate-800 
                      : `rgba(249, 115, 22, ${0.2 + item.intensity * 0.8})` 
                  },
                  item.intensity > 0.8 && styles.heatmapSquareHighlight
                ]} 
              />
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
            <Text style={styles.statLabel}>COURSES</Text>
            <Text style={styles.statValue}>8 <Text style={styles.statUnit}>Total</Text></Text>
          </View>

          <View style={styles.statBox}>
            <View style={styles.statIconWrapper}>
              <Feather name="clock" size={16} color="#fb923c" />
            </View>
            <Text style={styles.statLabel}>FOCUS TIME</Text>
            <Text style={styles.statValue}>14.5 <Text style={styles.statUnit}>hrs</Text></Text>
          </View>

          <View style={styles.statBox}>
            <View style={styles.statIconWrapper}>
              <Feather name="book-open" size={16} color="#fb923c" />
            </View>
            <Text style={styles.statLabel}>TOPICS</Text>
            <Text style={styles.statValue}>24 <Text style={styles.statUnit}>Covered</Text></Text>
          </View>

          <View style={styles.statBox}>
            <View style={styles.statIconWrapper}>
              <Feather name="calendar" size={16} color="#fb923c" />
            </View>
            <Text style={styles.statLabel}>AVG STREAK</Text>
            <Text style={styles.statValue}>18 <Text style={styles.statUnit}>Days</Text></Text>
          </View>
        </View>

        {/* Weekly Trend Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>LEARNING HOURS TREND</Text>
        </View>
        <View style={styles.chartCard}>
          <View style={styles.chartArea}>
            {weeklyTrend.map((day) => (
              <View key={day.day} style={styles.barWrapper}>
                <View 
                  style={[
                    styles.barFill, 
                    { height: day.height as DimensionValue },
                    day.active && styles.barFillActive
                  ]} 
                />
              </View>
            ))}
          </View>
          <View style={styles.chartLabels}>
            {weeklyTrend.map((day) => (
              <Text key={day.day} style={styles.chartLabelText}>{day.day}</Text>
            ))}
          </View>
        </View>

        {/* Activity Feed */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
        </View>
        <View style={styles.feedWrapper}>
          <View style={styles.feedItem}>
            <View style={styles.feedIconBox}>
              <Feather name="code" size={18} color="#f97316" />
            </View>
            <View style={styles.feedContent}>
              <Text style={styles.feedTitle}>React Context API Lesson</Text>
              <Text style={styles.feedDesc}>Completed \u2022 2h ago</Text>
            </View>
            <View style={styles.feedCheck}>
              <Feather name="check" size={12} color="#f97316" />
            </View>
          </View>

          <View style={styles.feedItem}>
            <View style={styles.feedIconBox}>
              <Feather name="zap" size={18} color="#f97316" />
            </View>
            <View style={styles.feedContent}>
              <Text style={styles.feedTitle}>Consistent Learner</Text>
              <Text style={styles.feedDesc}>7 day session streak \u2022 1d ago</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#334155" />
          </View>

          <View style={styles.feedItem}>
            <View style={styles.feedIconBox}>
              <MaterialCommunityIcons name="brain" size={18} color="#f97316" />
            </View>
            <View style={styles.feedContent}>
              <Text style={styles.feedTitle}>System Design Quiz</Text>
              <Text style={styles.feedDesc}>Completed \u2022 2d ago</Text>
            </View>
            <View style={styles.feedCheck}>
              <Feather name="check" size={12} color="#f97316" />
            </View>
          </View>
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
    backgroundColor: 'rgba(249, 115, 22, 0.05)', // simulated top gradient
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
    gap: 32,
  },
  sectionHeader: {
    marginTop: 8,
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
    padding: 24,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  heatmapSquare: {
    width: (280 - (9 * 6)) / 10, // approximate for 10 columns
    aspectRatio: 1,
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
    marginTop: 16,
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
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    elevation: 4,
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
