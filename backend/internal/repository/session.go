package repository

import (
	"context"

	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SessionRepository interface {
	GetQuestionsByNode(ctx context.Context, nodeID uuid.UUID, limit int) ([]models.Question, error)
	CreateSession(ctx context.Context, sessionID, userID, topicID, nodeID uuid.UUID, quizMode string) error
	GetQuestionInfo(ctx context.Context, questionID string) (correctAnswer, explanation, qType string, err error)
	CompleteSession(ctx context.Context, sessionID string) error
}

type sessionRepository struct {
	db *pgxpool.Pool
}

func NewSessionRepository(db *pgxpool.Pool) SessionRepository {
	return &sessionRepository{db: db}
}

func (r *sessionRepository) GetQuestionsByNode(ctx context.Context, nodeID uuid.UUID, limit int) ([]models.Question, error) {
	rows, err := r.db.Query(ctx,
		`SELECT q.id, q.node_id, q.lesson_id, q.index, q.type, q.question, q.answer, q.explanation, q.created_at
		 FROM questions q
		 WHERE q.node_id = $1
		 ORDER BY q.index
		 LIMIT $2`,
		nodeID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var questions []models.Question
	for rows.Next() {
		var q models.Question
		if err := rows.Scan(&q.ID, &q.NodeID, &q.LessonID, &q.Index, &q.Type, &q.Question, &q.Answer, &q.Explanation, &q.CreatedAt); err != nil {
			return nil, err
		}

		// Load options for each question
		optRows, err := r.db.Query(ctx,
			`SELECT id, question_id, index, label, explaination, is_correct
			 FROM question_options
			 WHERE question_id = $1
			 ORDER BY index`,
			q.ID,
		)
		if err != nil {
			return nil, err
		}

		for optRows.Next() {
			var opt models.Option
			if err := optRows.Scan(&opt.ID, &opt.QuestionID, &opt.Index, &opt.Label, &opt.Explanation, &opt.IsCorrect); err != nil {
				optRows.Close()
				return nil, err
			}
			q.Options = append(q.Options, opt)
		}
		optRows.Close()

		questions = append(questions, q)
	}
	return questions, nil
}

func (r *sessionRepository) CreateSession(ctx context.Context, sessionID, userID, topicID, nodeID uuid.UUID, quizMode string) error {
	_, err := r.db.Exec(ctx,
		"INSERT INTO sessions (id, user_id, topic_id, node_id, quiz_mode) VALUES ($1, $2, $3, $4, $5)",
		sessionID, userID, topicID, nodeID, quizMode,
	)
	return err
}

func (r *sessionRepository) GetQuestionInfo(ctx context.Context, questionID string) (string, string, string, error) {
	var correct, explanation, qType string
	err := r.db.QueryRow(ctx,
		"SELECT COALESCE(answer, ''), explanation, type FROM questions WHERE id = $1", questionID,
	).Scan(&correct, &explanation, &qType)
	return correct, explanation, qType, err
}

func (r *sessionRepository) CompleteSession(ctx context.Context, sessionID string) error {
	_, err := r.db.Exec(ctx,
		"UPDATE sessions SET completed_at = NOW() WHERE id = $1", sessionID,
	)
	return err
}
