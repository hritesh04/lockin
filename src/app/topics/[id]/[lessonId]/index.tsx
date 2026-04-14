import { getRoadmap } from '@/lib/api';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLessonStore } from '../../../../store/lessons';
import { useModuleStore } from '../../../../store/modules';

export default function LessonScreen() {
  const { id, lessonId } = useLocalSearchParams();
  const router = useRouter();
  
  const lessons = useLessonStore(state => state.lessons);
  const setLessons = useLessonStore(state => state.setLessons);
  const setModules = useModuleStore(state => state.setModules);

  const lesson = typeof lessonId === 'string' ? lessons[lessonId] : null;
  const [loading, setLoading] = useState(!lesson);

  useFocusEffect(
    useCallback(() => {
      if (lesson || !id) return;

      const controller = new AbortController();
      setLoading(true);
      getRoadmap(id as string, controller.signal).then((data) => {
        setModules(data.modules.map((m: any) => ({ ...m, topicId: id })));
        
        const allLessons: any[] = [];
        data.modules.forEach((m: any) => {
          if (m.lessons) {
            allLessons.push(...m.lessons.map((l: any) => ({ ...l, nodeId: m.id })));
          }
        });
        setLessons(allLessons);
      }).catch((err) => {
        if (!controller.signal.aborted) {
          console.error("Failed to load lesson:", err);
        }
      }).finally(() => {
        setLoading(false);
      });

      return () => { controller.abort(); };
    }, [id, lessonId, lesson])
  );

  const handleProceed = () => {
    if (!lesson) return;
    router.push(`/topics/${id}/session?lessonId=${lesson.id}&quizz=true`);  
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: 'black' }}>Lesson not found</Text>
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.back()}>
          <Text style={{ color: '#f97316' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Feather name="x" size={24} color="#0F172A" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle} numberOfLines={1}>{lesson.title}</Text>
        
        <TouchableOpacity onPress={handleProceed} style={styles.proceedButton}>
          <Text style={styles.proceedText}>Proceed</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.lessonDescription}>{lesson.description}</Text>
        
        <View style={styles.contentCard}>
          <Text style={styles.contentText}>{lesson.content || "No content available."}</Text>
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
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFF',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  proceedButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  proceedText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  lessonDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 24,
    lineHeight: 24,
  },
  contentCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  contentText: {
    fontSize: 16,
    color: '#334155',
    lineHeight: 28,
  },
});
