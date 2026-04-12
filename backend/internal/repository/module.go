package repository

import (
	"context"

	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type moduleRepository struct {
	db *pgxpool.Pool
}

func NewModuleRepository(db *pgxpool.Pool) *moduleRepository {
	return &moduleRepository{db: db}
}

func (r *moduleRepository) GetByID(ctx context.Context, moduleID string) (*models.Module, error) {
	var m models.Module
	err := r.db.QueryRow(ctx,
		"SELECT id, topic_id, index, title, description, status FROM modules WHERE id = $1", moduleID,
	).Scan(&m.ID, &m.TopicID, &m.Index, &m.Title, &m.Description, &m.Status)
	return &m, err
}

func (r *moduleRepository) Update(ctx context.Context, moduleID string, status string) (*models.Module, error) {
	var m models.Module
	err := r.db.QueryRow(ctx,
		"UPDATE modules SET status = $1 WHERE id = $2 RETURNING id, topic_id, index, title, description, status", status, moduleID,
	).Scan(&m.ID, &m.TopicID, &m.Index, &m.Title, &m.Description, &m.Status)
	return &m, err
}

func (r *moduleRepository) UpdateByTopicID(ctx context.Context, topicID string, index int, status string) (*models.Module, error) {
	var m models.Module
	err := r.db.QueryRow(ctx,
		"UPDATE modules SET status = $1 WHERE topic_id = $2 AND index = $3 RETURNING id, topic_id, index, title, description, status", status, topicID, index,
	).Scan(&m.ID, &m.TopicID, &m.Index, &m.Title, &m.Description, &m.Status)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return &m, err
}