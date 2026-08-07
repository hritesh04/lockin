import { tokens } from "@/theme/tokens";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import {
  Award,
  BookOpen,
  Calendar,
  Check,
  TrendingUp,
  TriangleAlert,
  Zap,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  DimensionValue,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomNav } from "../components/BottomNav";
import {
  getActivity,
  getMe,
  getRetentionByTopic,
  getReviewStats,
  isAbortError,
  ReviewStats,
  TopicRetentionSeries,
} from "../lib/api";
import { useAuthStore } from "../store/auth";
import { useUserStore } from "../store/user";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_PADDING = 24;
const GRID_GAP = 8;
const GRID_CONTAINER_WIDTH = SCREEN_WIDTH - GRID_PADDING * 2 - 48;
const SQUARE_SIZE = (GRID_CONTAINER_WIDTH - 9 * GRID_GAP) / 10;

export default function StatsScreen() {
  const [activeBar, setActiveBar] = useState<number | null>(null);
  const [activeSquare, setActiveSquare] = useState<number | null>(null);
  const streakCount = useUserStore((state) => state.streakCount);
  const activityHistory = useUserStore((state) => state.activityHistory);
  const hydrateUser = useUserStore((state) => state.hydrateFromServer);
  const setActivityHistory = useUserStore((state) => state.setActivityHistory);
  const token = useAuthStore((state) => state.token);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [retentionByTopic, setRetentionByTopic] = useState<
    TopicRetentionSeries[]
  >([]);

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      const load = async () => {
        if (!token) return;
        try {
          const [userData, activityInfo, stats, retentionTopic] =
            await Promise.all([
              getMe(controller.signal),
              getActivity(controller.signal),
              getReviewStats(controller.signal),
              getRetentionByTopic(7, controller.signal),
            ]);
          if (!controller.signal.aborted) {
            hydrateUser(userData);
            setActivityHistory(activityInfo.activity || []);
            setReviewStats(stats);
            setRetentionByTopic(retentionTopic);
          }
        } catch (e) {
          if (!isAbortError(e)) {
            console.log(e);
            console.error("Stats API sync failed", e);
          }
        }
      };
      load();
      return () => {
        controller.abort();
      };
    }, [token])
  );

  const heatmapData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (29 - i));

    const dayData = activityHistory.find((a) => {
      const parts = a.day.split("-");
      if (parts.length !== 3) return false;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return (
        year === d.getFullYear() &&
        month === d.getMonth() &&
        day === d.getDate()
      );
    });

    const sessionCount =
      (dayData?.lessons?.length || 0) + (dayData?.quizes?.length || 0);
    const timeSec = dayData?.total_time || 0;

    let intensity = 0;
    if (sessionCount >= 3 || timeSec >= 3600) intensity = 1.0;
    else if (sessionCount >= 2 || timeSec >= 1800) intensity = 0.6;
    else if (sessionCount >= 1 || timeSec > 0) intensity = 0.3;

    const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
    const dateLabel = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return {
      id: i,
      intensity,
      day: dayStr,
      dateLabel,
      sessionCount,
      lessonCount: dayData?.lessons?.length || 0,
      quizCount: dayData?.quizes?.length || 0,
    };
  });

  const heatmapColumns = [];
  for (let i = 0; i < heatmapData.length; i += 3) {
    heatmapColumns.push(heatmapData.slice(i, i + 3));
  }

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return "0 min";
    if (seconds < 3600) {
      return `${Math.round(seconds / 60)} min`;
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  const totalLessons = activityHistory.reduce(
    (acc, curr) => acc + curr.lessons.length,
    0
  );

  const last7DaysRaw = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().split("T")[0];
    const dayData = activityHistory.find((a) => a.day === dayStr);
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const timeSec = dayData?.total_time || 0;
    return { day: dayName, timeSec, active: i === 6 };
  });

  const maxTime = Math.max(...last7DaysRaw.map((d) => d.timeSec), 60);

  const last7Days = last7DaysRaw.map((day) => ({
    ...day,
    height: `${Math.max(
      (day.timeSec / maxTime) * 100,
      day.timeSec > 0 ? 5 : 0,
      1
    )}%` as DimensionValue,
  }));

  const recentActivities = activityHistory
    .flatMap((day) => [
      ...day.lessons.map((l) => ({
        ...l,
        type: "lesson" as const,
        day: day.day,
      })),
      ...day.quizes.map((q) => ({ ...q, type: "quiz" as const, day: day.day })),
    ])
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5);

  // Generate last 7 days for x-axis (retention line chart)
  const retentionLast7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  const retentionXLabels = retentionLast7Days.map((day) =>
    new Date(day).toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
    })
  );

  // Convert retention data to LineGraph points format
  const retentionGraphData = useMemo(() => {
    const colors = [
      "#0071e3", // blue
      "#34c759", // green
      "#ff9f0a", // orange
      "#af52de", // purple
      "#ff3b30", // red
      "#5ac8fa", // light blue
      "#ffcc00", // yellow
    ];

    // Create a map of date -> retention data for each topic
    const topicDataMap = new Map<string, Map<string, number>>();

    retentionByTopic.forEach((series) => {
      const pointsMap = new Map<string, number>();
      series.points.forEach((point) => {
        pointsMap.set(point.date, point.pct_correct * 100);
      });
      topicDataMap.set(series.topic_id, pointsMap);
    });

    // Generate graph data for each topic
    const graphData: {
      points: { value: number; date: Date }[];
      color: string;
      topicTitle: string;
    }[] = [];

    topicDataMap.forEach((pointsMap, topicId) => {
      const series = retentionByTopic.find((s) => s.topic_id === topicId);
      if (!series) return;

      const points = retentionLast7Days.map((day) => ({
        value: pointsMap.get(day) ?? 0,
        date: new Date(day),
      }));

      graphData.push({
        points,
        color: colors[graphData.length % colors.length],
        topicTitle: series.topic_title,
      });
    });

    return graphData;
  }, [retentionByTopic, retentionLast7Days]);

  // gifted-charts supports up to 5 overlaid line datasets; cap to keep within limits.
  const lineProps = useMemo(
    () =>
      retentionGraphData.slice(0, 5).map((series, si) => ({
        topicTitle: series.topicTitle,
        color: series.color,
        data: series.points.map((p, i) => ({
          value: p.value,
          ...(si === 0 ? { label: i == 0 ? "" : retentionXLabels[i] } : {}),
        })),
      })),
    [retentionGraphData, retentionXLabels]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Activity</Text>
            <Text style={styles.headerSubtitle}>Keep the momentum going!</Text>
          </View>
          {streakCount > 0 && (
            <View style={styles.streakBadge}>
              <MaterialCommunityIcons name="fire" size={14} color="#ef4444" />
              <Text style={styles.streakText}>{streakCount} Day Streak</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.mainContent}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>LAST 30 DAYS ACTIVITY</Text>
        </View>
        <View style={styles.heatmapCard}>
          <View style={styles.heatmapGrid}>
            {heatmapColumns.map((col, colIndex) => (
              <View key={colIndex} style={styles.heatmapColumn}>
                {col.map((item) => (
                  <View
                    key={item.id}
                    style={{
                      alignItems: "center",
                      zIndex: activeSquare === item.id ? 100 : 1,
                    }}
                  >
                    {activeSquare === item.id && (
                      <View style={styles.heatmapTooltip}>
                        <Text style={styles.tooltipDate}>{item.dateLabel}</Text>
                        <Text style={styles.tooltipText}>
                          {item.sessionCount} Sessions
                        </Text>
                        <Text style={styles.tooltipSubText}>
                          {item.lessonCount} Lessons, {item.quizCount} Quizzes
                        </Text>
                        <View style={styles.tooltipArrow} />
                      </View>
                    )}
                    <Pressable
                      onPressIn={() => setActiveSquare(item.id)}
                      onPressOut={() => setActiveSquare(null)}
                      style={[
                        styles.heatmapSquare,
                        {
                          backgroundColor:
                            item.intensity === 0
                              ? tokens.colors.base
                              : `rgba(0, 113, 227, ${
                                  0.2 + item.intensity * 0.8
                                })`,
                        },
                        activeSquare === item.id && {
                          transform: [{ scale: 1.1 }],
                          zIndex: 10,
                        },
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
                <View
                  style={[
                    styles.legendBox,
                    { backgroundColor: tokens.colors.base },
                  ]}
                />
                <View
                  style={[
                    styles.legendBox,
                    { backgroundColor: "rgba(0, 113, 227, 0.2)" },
                  ]}
                />
                <View
                  style={[
                    styles.legendBox,
                    { backgroundColor: "rgba(0, 113, 227, 0.5)" },
                  ]}
                />
                <View
                  style={[
                    styles.legendBox,
                    { backgroundColor: tokens.colors.accent },
                  ]}
                />
              </View>
              <Text style={styles.legendText}>More</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <View style={styles.statIconWrapper}>
              <Award size={14} color={tokens.colors.accent} />
            </View>
            <Text style={styles.statLabel}>LESSONS</Text>
            <Text style={styles.statValue}>
              {totalLessons} <Text style={styles.statUnit}>Total</Text>
            </Text>
          </View>

          <View style={styles.statBox}>
            <View style={styles.statIconWrapper}>
              <Calendar size={14} color={tokens.colors.accent} />
            </View>
            <Text style={styles.statLabel}>STREAK</Text>
            <Text style={styles.statValue}>
              {streakCount} <Text style={styles.statUnit}>Days</Text>
            </Text>
          </View>
        </View>

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
                    style={{
                      width: "100%",
                      height: "100%",
                      justifyContent: "flex-end",
                      alignItems: "center",
                    }}
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
                        styles.barFillActive,
                      ]}
                    />
                  </Pressable>
                </View>
              );
            })}
          </View>
          <View style={styles.chartLabels}>
            {last7Days.map((day, i) => (
              <Text key={i} style={styles.chartLabelText}>
                {day.day}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>RETENTION</Text>
          <Text style={styles.sectionSub}>
            {reviewStats ? `${reviewStats.due_today} due today` : "\u00A0"}
          </Text>
        </View>
        <View
          style={{
            ...styles.chartCard,
            padding: 0,
            paddingHorizontal: 4,
            paddingVertical: 12,
            overflow: "hidden",
          }}
        >
          {retentionByTopic.length === 0 ? (
            <Text style={styles.emptyText}>
              No reviews yet — generate review cards to start tracking
              retention.
            </Text>
          ) : (
            <>
              <View style={styles.lineChartWrapper}>
                <View style={styles.lineChartLegend}>
                  {retentionGraphData.map((data, i) => (
                    <View key={i} style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendColorDot,
                          { backgroundColor: data.color },
                        ]}
                      />
                      <Text style={styles.legendItemText}>
                        {data.topicTitle}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={styles.lineChartBody}>
                  <View style={styles.lineChartGraphArea}>
                    {lineProps.length > 0 && (
                      <LineChart
                        data={lineProps[0].data}
                        color={lineProps[0].color}
                        dataPointsColor={lineProps[0].color}
                        dataPointsRadius={3}
                        data2={lineProps[1]?.data}
                        color2={lineProps[1]?.color}
                        dataPointsColor2={lineProps[1]?.color}
                        dataPointsRadius2={3}
                        data3={lineProps[2]?.data}
                        color3={lineProps[2]?.color}
                        dataPointsColor3={lineProps[2]?.color}
                        dataPointsRadius3={3}
                        data4={lineProps[3]?.data}
                        color4={lineProps[3]?.color}
                        dataPointsColor4={lineProps[3]?.color}
                        dataPointsRadius4={3}
                        data5={lineProps[4]?.data}
                        color5={lineProps[4]?.color}
                        dataPointsColor5={lineProps[4]?.color}
                        dataPointsRadius5={3}
                        yAxisLabelTexts={["0%", "25%", "50%", "75%", "100%"]}
                        yAxisTextStyle={styles.lineChartYLabel}
                        xAxisLabelTextStyle={styles.lineChartXLabel}
                        thickness={2}
                        maxValue={100}
                        noOfSections={4}
                        disableScroll
                        initialSpacing={-10}
                        endSpacing={0}
                        hideRules
                        isAnimated
                        focusEnabled
                        pointerConfig={{
                          pointerStripHeight: 30,
                          showPointerStrip: false,
                          pointerColor: tokens.colors.accent,
                          activatePointersInstantlyOnTouch: true,
                          pointerLabelComponent: (
                            items: any,
                            _secondary: any,
                            index: number
                          ) => {
                            const day = retentionLast7Days[index];
                            const total = retentionLast7Days.length;
                            const isFirst = index === 0;
                            const isSecond = index === 1;
                            const isLast = index === total - 1;
                            const isSecondLast = index === total - 2;
                            return (
                              <View
                                style={[
                                  styles.pointerLabelBox,
                                  {
                                    width: 130,
                                    height: 34 + lineProps.length * 22,
                                    top: -100,
                                    left: -50,
                                  },
                                  isFirst && { left: 0 },
                                  isSecond && { left: -25 },
                                  isSecondLast && { left: -75 },
                                  isLast && { left: -125 },
                                ]}
                              >
                                <Text style={styles.pointerLabelDate}>
                                  {day
                                    ? new Date(day).toLocaleDateString(
                                        "en-US",
                                        {
                                          weekday: "short",
                                          month: "short",
                                          day: "numeric",
                                        }
                                      )
                                    : ""}
                                </Text>
                                {lineProps.map((line, i) => {
                                  const item = Array.isArray(items)
                                    ? items[i]
                                    : items;
                                  const val =
                                    item && typeof item.value === "number"
                                      ? item.value
                                      : undefined;
                                  if (val === undefined) return null;
                                  return (
                                    <View
                                      key={i}
                                      style={styles.pointerLabelRow}
                                    >
                                      <View
                                        style={[
                                          styles.pointerLabelDot,
                                          { backgroundColor: line.color },
                                        ]}
                                      />
                                      <Text
                                        style={styles.pointerLabelTopic}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                      >
                                        {line.topicTitle}
                                      </Text>
                                      <Text style={styles.pointerLabelValue}>
                                        {Math.round(val)}%
                                      </Text>
                                    </View>
                                  );
                                })}
                              </View>
                            );
                          },
                        }}
                      />
                    )}
                  </View>
                </View>
              </View>
            </>
          )}
        </View>

        {reviewStats && reviewStats.weak_concepts.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>WEAK CONCEPTS</Text>
              <Text style={styles.sectionSub}>
                Review these to lock them in.
              </Text>
            </View>
            <View style={styles.weakWrap}>
              {reviewStats.weak_concepts.map((w, i) => {
                const pct = Math.round(w.pct_correct * 100);
                const low = pct < 50;
                return (
                  <View key={i} style={styles.weakItem}>
                    <View style={styles.weakIconBox}>
                      {low ? (
                        <TriangleAlert size={14} color="#f59e0b" />
                      ) : (
                        <TrendingUp size={14} color="#22c55e" />
                      )}
                    </View>
                    <View style={styles.weakContent}>
                      <Text style={styles.weakName}>
                        {w.concept || "unknown"}
                      </Text>
                      <Text style={styles.weakTopicName}>{w.topic_name}</Text>
                      <Text style={styles.weakSample}>
                        {w.sample_size} review{w.sample_size !== 1 ? "s" : ""}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.weakPct,
                        { color: low ? "#f59e0b" : "#22c55e" },
                      ]}
                    >
                      {pct}%
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
        </View>
        <View style={styles.feedWrapper}>
          {recentActivities.map((act, i) => (
            <View key={i} style={styles.feedItem}>
              <View style={styles.feedIconBox}>
                {act.type === "lesson" ? (
                  <BookOpen size={16} color={tokens.colors.accent} />
                ) : (
                  <Zap size={16} color={tokens.colors.accent} />
                )}
              </View>
              <View style={styles.feedContent}>
                <Text style={styles.feedTitle}>
                  {act.type === "lesson"
                    ? (act as any).topic_name
                    : (act as any).topic_name + " Quiz"}
                </Text>
                <Text style={styles.feedSubTitle}>
                  {act.type === "lesson"
                    ? act.title
                    : (act as any).topic_name + " Quiz"}
                </Text>
                <Text style={styles.feedDesc}>
                  {new Date(
                    act.completed_at || act.created_at
                  ).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.feedCheck}>
                <Check size={10} color={tokens.colors.accent} />
              </View>
            </View>
          ))}
          {recentActivities.length === 0 && (
            <Text
              style={{
                color: tokens.colors.textSecondary,
                textAlign: "center",
                marginVertical: 20,
              }}
            >
              No sessions yet
            </Text>
          )}
        </View>
      </ScrollView>

      <BottomNav activeScreen="stats" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.base,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    zIndex: 10,
    marginTop: 6,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: tokens.fontSize["4xl"],
    fontFamily: tokens.fontFamily.display,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: tokens.fontSize.base,
    fontFamily: tokens.fontFamily.body,
    color: tokens.colors.textSecondary,
    marginTop: 4,
    fontWeight: tokens.fontWeight.medium,
  },
  streakBadge: {
    backgroundColor: "rgba(0, 113, 227, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  streakText: {
    color: tokens.colors.textPrimary,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    fontSize: tokens.fontSize.sm,
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
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textTertiary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sectionSub: {
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyMedium,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.textSecondary,
    marginTop: 4,
  },
  emptyText: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.bodyMedium,
    fontWeight: tokens.fontWeight.medium,
    textAlign: "center",
    paddingVertical: 20,
    lineHeight: 20,
  },
  weakWrap: {
    gap: 12,
  },
  weakItem: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius["2xl"],
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  weakIconBox: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.colors.base,
    alignItems: "center",
    justifyContent: "center",
  },
  weakContent: {
    flex: 1,
  },
  weakName: {
    fontSize: tokens.fontSize.base,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
    textTransform: "capitalize",
  },
  weakTopicName: {
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.body,
    color: tokens.colors.textSecondary,
    marginTop: 2,
  },
  weakSample: {
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.body,
    color: tokens.colors.textSecondary,
    marginTop: 2,
  },
  weakPct: {
    fontSize: tokens.fontSize.lg,
    fontFamily: tokens.fontFamily.display,
    fontWeight: tokens.fontWeight.bold,
  },
  heatmapCard: {
    backgroundColor: tokens.colors.darkSurface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius["3xl"],
    paddingHorizontal: 23,
    paddingVertical: 18,
  },
  heatmapGrid: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-start",
  },
  heatmapColumn: {
    flexDirection: "column",
    gap: 8,
  },
  heatmapSquare: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    borderRadius: 4,
  },
  heatmapLegend: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  legendText: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textSecondary,
    fontFamily: tokens.fontFamily.body,
    fontWeight: tokens.fontWeight.medium,
  },
  legendScale: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendRow: {
    flexDirection: "row",
    gap: 4,
  },
  legendBox: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    padding: 18,
    borderRadius: tokens.radius["2xl"],
  },
  statIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.sm,
    backgroundColor: "rgba(0, 113, 227, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statLabel: {
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: tokens.fontSize["xl"],
    fontFamily: tokens.fontFamily.display,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
  },
  statUnit: {
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.body,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.textSecondary,
  },
  chartCard: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius["3xl"],
    padding: 24,
  },
  chartArea: {
    height: 140,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingBottom: 4,
  },
  barWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barFill: {
    width: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 6,
  },
  barFillActive: {
    backgroundColor: tokens.colors.accent,
  },
  tooltip: {
    position: "absolute",
    marginBottom: 8,
    backgroundColor: tokens.colors.darkBase,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: tokens.radius.xs,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    minWidth: 44,
  },
  tooltipText: {
    color: "#FFFFFF",
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    textAlign: "center",
  },
  tooltipArrow: {
    position: "absolute",
    bottom: -4,
    width: 8,
    height: 8,
    backgroundColor: tokens.colors.darkBase,
    transform: [{ rotate: "45deg" }],
  },
  heatmapTooltip: {
    position: "absolute",
    bottom: SQUARE_SIZE + 10,
    backgroundColor: tokens.colors.darkBase,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    minWidth: 140,
    // @ts-ignore
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  },
  tooltipDate: {
    color: "#FFFFFF",
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 2,
  },
  tooltipSubText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 9,
    fontFamily: tokens.fontFamily.body,
    fontWeight: tokens.fontWeight.semibold,
    marginTop: 2,
  },
  chartLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingHorizontal: 4,
  },
  chartLabelText: {
    flex: 1,
    textAlign: "center",
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textSecondary,
    textTransform: "uppercase",
  },
  feedWrapper: {
    gap: 12,
  },
  feedItem: {
    backgroundColor: tokens.colors.base,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius["2xl"],
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  feedIconBox: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.sm,
    backgroundColor: "rgba(0, 113, 227, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  feedContent: {
    flex: 1,
  },
  feedTitle: {
    fontSize: tokens.fontSize.base,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textPrimary,
  },
  feedDesc: {
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.body,
    color: tokens.colors.textSecondary,
    marginTop: 2,
  },
  feedSubTitle: {
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.body,
    color: tokens.colors.textSecondary,
    marginTop: 2,
  },
  feedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0, 113, 227, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  lineChartWrapper: {
    gap: 12,
  },
  lineChartLegend: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendColorDot: {
    width: 6,
    height: 6,
    borderRadius: 5,
  },
  legendItemText: {
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.bodyMedium,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.textPrimary,
  },
  lineChartXLabel: {
    flex: 1,
    textAlign: "left",
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textTertiary,
  },
  pointerLabelBox: {
    backgroundColor: tokens.colors.darkBase,
    borderRadius: tokens.radius.md,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: "flex-start",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    position: "absolute",
  },
  pointerLabelDate: {
    fontSize: 10,
    fontFamily: tokens.fontFamily.bodyBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textSecondary,
    marginBottom: 4,
    alignSelf: "center",
  },
  pointerLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    paddingVertical: 2,
  },
  pointerLabelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  pointerLabelTopic: {
    flex: 1,
    fontSize: 10,
    fontFamily: tokens.fontFamily.bodyMedium,
    fontWeight: tokens.fontWeight.semibold,
    color: "#FFFFFF",
  },
  pointerLabelValue: {
    fontSize: 11,
    fontFamily: tokens.fontFamily.display,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.accent,
    marginLeft: 8,
  },
  lineChartBody: {
    flexDirection: "row",
  },
  lineChartYLabel: {
    fontSize: 9,
    fontFamily: tokens.fontFamily.body,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.textTertiary,
    textAlign: "left",
  },
  lineChartGraphArea: {
    flex: 1,
    overflow: "hidden",
  },
});
