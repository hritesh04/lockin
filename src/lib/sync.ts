import * as SQLite from 'expo-sqlite';
import { SQLITE_DB_NAME } from './config';
import { submitAnswer } from './api';

/** Drains queued text/speech answers (MCQ does not use this path). */
export async function syncPendingAnswers() {
  const db = await SQLite.openDatabaseAsync(SQLITE_DB_NAME);
  const pending = await db.getAllAsync<{
    id: string;
    session_id: string;
    question_id: string;
    selected_answer: string;
    is_correct: number;
  }>('SELECT * FROM pending_answers');

  if (pending.length === 0) return;

  for (const answer of pending) {
    try {
      await submitAnswer(answer.session_id, {
        question_id: answer.question_id,
        selected_answer: answer.selected_answer,
      });

      await db.runAsync('DELETE FROM pending_answers WHERE id = ?', answer.id);
    } catch (e) {
      console.log('Failed to sync answer, will retry later', e);
    }
  }
}
