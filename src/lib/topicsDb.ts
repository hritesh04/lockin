import type * as SQLite from 'expo-sqlite';
import type { Topic } from '../store/topics';
import type { ApiTopic } from './api';

/** Apply migrations for topics table (additive columns). */
export async function migrateTopicsTable(db: SQLite.SQLiteDatabase) {
  const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(topics)');
  const names = new Set(cols.map(c => c.name));
  if (!names.has('user_id')) {
    await db.execAsync('ALTER TABLE topics ADD COLUMN user_id TEXT');
  }
  if (!names.has('sessions_completed')) {
    await db.execAsync('ALTER TABLE topics ADD COLUMN sessions_completed INTEGER DEFAULT 0');
  }
  if (!names.has('accuracy_percent')) {
    await db.execAsync('ALTER TABLE topics ADD COLUMN accuracy_percent INTEGER DEFAULT 0');
  }
}

export function rowToTopic(row: {
  id: string;
  title: string;
  domain: string | null;
  familiarity_level: string | null;
  current_tier: number | null;
  sessions_completed: number | null;
  accuracy_percent: number | null;
}): Topic {
  return {
    id: row.id,
    title: row.title,
    currentTier: row.current_tier ?? 1,
    familiarityLevel: row.familiarity_level ?? 'beginner',
    accuracyPercent: row.accuracy_percent ?? 0,
    sessionsCompleted: row.sessions_completed ?? 0,
    weakConcepts: [],
  };
}

export async function loadTopicsFromSQLite(db: SQLite.SQLiteDatabase): Promise<Topic[]> {
  const rows = await db.getAllAsync<{
    id: string;
    title: string;
    domain: string | null;
    familiarity_level: string | null;
    current_tier: number | null;
    sessions_completed: number | null;
    accuracy_percent: number | null;
  }>(
    `SELECT id, title, domain, familiarity_level, current_tier,
            COALESCE(sessions_completed, 0) AS sessions_completed,
            COALESCE(accuracy_percent, 0) AS accuracy_percent
     FROM topics ORDER BY datetime(created_at) DESC`
  );
  return rows.map(rowToTopic);
}

/** Merge server rows into SQLite, preserving local progress columns. */
export async function upsertTopicsFromApi(db: SQLite.SQLiteDatabase, apiTopics: ApiTopic[]) {
  for (const t of apiTopics) {
    const existing = await db.getFirstAsync<{
      sessions_completed: number | null;
      accuracy_percent: number | null;
    }>('SELECT sessions_completed, accuracy_percent FROM topics WHERE id = ?', [t.id]);
    const sessions = existing?.sessions_completed ?? 0;
    const accuracy = existing?.accuracy_percent ?? 0;
    const createdAt = t.createdAt ?? new Date().toISOString();
    await db.runAsync(
      `INSERT OR REPLACE INTO topics
       (id, title, domain, familiarity_level, current_tier, created_at, user_id, sessions_completed, accuracy_percent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        t.id,
        t.title,
        t.domain ?? 'General',
        t.familiarityLevel,
        t.currentTier,
        createdAt,
        t.userId,
        sessions,
        accuracy,
      ]
    );
  }
}

export async function persistTopicProgress(
  db: SQLite.SQLiteDatabase,
  topicId: string,
  accuracy: number,
  sessionsIncrement: number
) {
  await db.runAsync(
    `UPDATE topics SET
       accuracy_percent = ?,
       sessions_completed = COALESCE(sessions_completed, 0) + ?
     WHERE id = ?`,
    [accuracy, sessionsIncrement, topicId]
  );
}
