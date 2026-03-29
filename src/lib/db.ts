import * as SQLite from 'expo-sqlite';
import { migrateTopicsTable } from './topicsDb';

export async function initDB(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      domain TEXT,
      familiarity_level TEXT,
      current_tier INTEGER,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS lesson_cards (
      id TEXT PRIMARY KEY,
      topic_id TEXT,
      content TEXT NOT NULL,
      tier INTEGER,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      topic_id TEXT,
      lesson_card_id TEXT,
      format TEXT,
      content TEXT,
      options TEXT,
      answer TEXT,
      explanation TEXT,
      tier INTEGER,
      concept_tags TEXT,
      times_answered INTEGER DEFAULT 0,
      times_correct INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS pending_answers (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      question_id TEXT,
      selected_answer TEXT,
      is_correct INTEGER,
      answered_at TEXT
    );
  `);
  await migrateTopicsTable(db);
}
