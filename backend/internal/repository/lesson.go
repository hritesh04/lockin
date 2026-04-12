package repository

import (
	"context"

	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type lessonRepository struct {
	db *pgxpool.Pool
}

func NewLessonRepository(db *pgxpool.Pool) *lessonRepository {
	return &lessonRepository{db: db}
}

func (l *lessonRepository) Update(ctx context.Context, lessonID string, status string) (*models.Lesson, error) {
	var lesson models.Lesson
	err := l.db.QueryRow(ctx,
		"UPDATE lessons SET status = $1 WHERE id = $2 RETURNING id,node_id,index,title,description,content,status", status, lessonID,
	).Scan(&lesson.ID, &lesson.NodeID, &lesson.Index, &lesson.Title, &lesson.Description, &lesson.Content, &lesson.Status)
	return &lesson, err
}

func (l *lessonRepository) UpdateByModuleID(ctx context.Context, moduleID string, index int, status string) (*models.Lesson, error) {
	var lesson models.Lesson
	err := l.db.QueryRow(ctx,
		"UPDATE lessons SET status = $1 WHERE node_id = $2 AND index = $3 RETURNING id,node_id,index,title,description,content,status", status, moduleID, index,
	).Scan(&lesson.ID, &lesson.NodeID, &lesson.Index, &lesson.Title, &lesson.Description, &lesson.Content, &lesson.Status)
	if err == pgx.ErrNoRows {
		return nil,nil
	}
	return &lesson, err
}