package repository

import (
	"context"

	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SessionRepository interface {
	GetUnansweredQuestions(ctx context.Context, topicID uuid.UUID, limit int) ([]models.Question, error)
	CreateSession(ctx context.Context, sessionID, userID, topicID uuid.UUID) error
	GetQuestionInfo(ctx context.Context, questionID string) (correctAnswer, explanation, format string, err error)
	RecordAnswerAndProgress(ctx context.Context, sessionID, questionID, selectedAnswer string, isCorrect bool) error
	CompleteSession(ctx context.Context, sessionID string) error
}

type sessionRepository struct {
	db *pgxpool.Pool
}

func NewSessionRepository(db *pgxpool.Pool) SessionRepository {
	return &sessionRepository{db: db}
}

func (r *sessionRepository) GetUnansweredQuestions(ctx context.Context, topicID uuid.UUID, limit int) ([]models.Question, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, topic_id, format, content, options, answer, explanation, tier FROM questions 
		 WHERE topic_id = $1 AND times_answered = 0 LIMIT $2`,
		topicID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var questions []models.Question
	for rows.Next() {
		var q models.Question
		rows.Scan(&q.ID, &q.TopicID, &q.Format, &q.Content, &q.Options, &q.Answer, &q.Explanation, &q.Tier)
		questions = append(questions, q)
	}
	return questions, nil
}

func (r *sessionRepository) CreateSession(ctx context.Context, sessionID, userID, topicID uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		"INSERT INTO sessions (id, user_id, topic_id) VALUES ($1, $2, $3)",
		sessionID, userID, topicID,
	)
	return err
}

func (r *sessionRepository) GetQuestionInfo(ctx context.Context, questionID string) (string, string, string, error) {
	var correct, explanation, format string
	err := r.db.QueryRow(ctx,
		"SELECT answer, explanation, format FROM questions WHERE id = $1", questionID,
	).Scan(&correct, &explanation, &format)
	return correct, explanation, format, err
}

func (r *sessionRepository) RecordAnswerAndProgress(ctx context.Context, sessionID, questionID, selectedAnswer string, isCorrect bool) error {
	// Let's use a transaction to ensure both operations succeed or fail together
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx,
		"INSERT INTO session_answers (session_id, question_id, selected_answer, is_correct) VALUES ($1, $2, $3, $4)",
		sessionID, questionID, selectedAnswer, isCorrect,
	)
	if err != nil {
		return err
	}

	if isCorrect {
		_, err = tx.Exec(ctx, "UPDATE questions SET times_answered = times_answered + 1, times_correct = times_correct + 1 WHERE id = $1", questionID)
	} else {
		_, err = tx.Exec(ctx, "UPDATE questions SET times_answered = times_answered + 1 WHERE id = $1", questionID)
	}
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *sessionRepository) CompleteSession(ctx context.Context, sessionID string) error {
	_, err := r.db.Exec(ctx,
		"UPDATE sessions SET completed_at = NOW() WHERE id = $1", sessionID,
	)
	return err
}
