package repository

import (
	"context"

	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TopicRepository interface {
	CreateTopic(ctx context.Context, topic models.Topic) error
	ListTopics(ctx context.Context, userID uuid.UUID) ([]models.Topic, error)
	GetTopic(ctx context.Context, topicID, userID string) (models.Topic, error)
}

type topicRepository struct {
	db *pgxpool.Pool
}

func NewTopicRepository(db *pgxpool.Pool) TopicRepository {
	return &topicRepository{db: db}
}

func (r *topicRepository) CreateTopic(ctx context.Context, topic models.Topic) error {
	_, err := r.db.Exec(ctx,
		"INSERT INTO topics (id, user_id, title, domain, familiarity_level, current_tier) VALUES ($1, $2, $3, $4, $5, $6)",
		topic.ID, topic.UserID, topic.Title, topic.Domain, topic.FamiliarityLevel, topic.CurrentTier,
	)
	return err
}

func (r *topicRepository) ListTopics(ctx context.Context, userID uuid.UUID) ([]models.Topic, error) {
	rows, err := r.db.Query(ctx,
		"SELECT id, user_id, title, domain, familiarity_level, current_tier, created_at FROM topics WHERE user_id = $1 ORDER BY created_at DESC",
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var topics []models.Topic
	for rows.Next() {
		var t models.Topic
		rows.Scan(&t.ID, &t.UserID, &t.Title, &t.Domain, &t.FamiliarityLevel, &t.CurrentTier, &t.CreatedAt)
		topics = append(topics, t)
	}
	return topics, nil
}

func (r *topicRepository) GetTopic(ctx context.Context, topicID, userID string) (models.Topic, error) {
	var t models.Topic
	err := r.db.QueryRow(ctx,
		"SELECT id, user_id, title, domain, familiarity_level, current_tier, created_at FROM topics WHERE id = $1 AND user_id = $2",
		topicID, userID,
	).Scan(&t.ID, &t.UserID, &t.Title, &t.Domain, &t.FamiliarityLevel, &t.CurrentTier, &t.CreatedAt)
	return t, err
}
