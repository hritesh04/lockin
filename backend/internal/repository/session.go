package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserSessionActivity struct {
	ID          uuid.UUID
	TopicID     uuid.UUID
	LessonID    *uuid.UUID
	QuizMode    string
	CreatedAt   time.Time
	CompletedAt *time.Time
	LessonTitle string
	TopicTitle  string
}

type sessionRepository struct {
	db *pgxpool.Pool
}

func NewSessionRepository(db *pgxpool.Pool) *sessionRepository {
	return &sessionRepository{db: db}
}

func (r *sessionRepository) GetQuestionsByLesson(ctx context.Context, lessonID uuid.UUID, limit int) ([]models.Question, error) {
	rows, err := r.db.Query(ctx,
		`SELECT 
			q.id, q.node_id, q.lesson_id, q.index, q.type, q.question, 
			COALESCE(q.answer, ''), COALESCE(q.explanation, ''), q.created_at,
			(
				SELECT COALESCE(
					json_agg(
						jsonb_build_object(
							'id', qo.id,
							'questionId', qo.question_id,
							'index', qo.index,
							'label', qo.label,
							'explanation', COALESCE(qo.explanation, ''),
							'is_correct', qo.is_correct
						) ORDER BY qo.index
					), '[]'
				)
				FROM question_options qo
				WHERE qo.question_id = q.id
			) as options
		 FROM questions q
		 WHERE q.lesson_id = $1
		 ORDER BY q.index
		 LIMIT $2`,
		lessonID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var questions []models.Question
	for rows.Next() {
		var q models.Question
		var optionsJSON []byte
		if err := rows.Scan(&q.ID, &q.NodeID, &q.LessonID, &q.Index, &q.Type, &q.Question, &q.Answer, &q.Explanation, &q.CreatedAt, &optionsJSON); err != nil {
			return nil, err
		}

		if len(optionsJSON) > 0 {
			if err := json.Unmarshal(optionsJSON, &q.Options); err != nil {
				return nil, err
			}
		}

		questions = append(questions, q)
	}
	return questions, nil
}

func (r *sessionRepository) CreateSession(ctx context.Context, sessionID, userID, topicID uuid.UUID, lessonID *uuid.UUID, quizMode string) error {
	_, err := r.db.Exec(ctx,
		"INSERT INTO sessions (id, user_id, topic_id, lesson_id, quiz_mode) VALUES ($1, $2, $3, $4, $5)",
		sessionID, userID, topicID, lessonID, quizMode,
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

func (r *sessionRepository) GetUserActivity(ctx context.Context, userID uuid.UUID) ([]UserSessionActivity, error) {
	rows, err := r.db.Query(ctx,
		`SELECT 
			s.id, s.topic_id, s.lesson_id, s.quiz_mode, s.created_at, s.completed_at,
			COALESCE(l.title, '') as lesson_title,
			COALESCE(t.title, '') as topic_title
		 FROM sessions s
		 LEFT JOIN lessons l ON s.lesson_id = l.id
		 LEFT JOIN topics t ON s.topic_id = t.id
		 WHERE s.user_id = $1 AND s.created_at >= CURRENT_DATE - INTERVAL '30 days'
		 ORDER BY s.created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var activities []UserSessionActivity
	for rows.Next() {
		var a UserSessionActivity
		err := rows.Scan(
			&a.ID, &a.TopicID, &a.LessonID, &a.QuizMode, &a.CreatedAt, &a.CompletedAt,
			&a.LessonTitle, &a.TopicTitle,
		)
		if err != nil {
			return nil, err
		}
		activities = append(activities, a)
	}
	return activities, nil
}
