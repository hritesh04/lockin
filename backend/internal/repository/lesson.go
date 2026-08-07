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

func (l *lessonRepository) IsUserLesson(ctx context.Context, lessonID, userID string) bool {
	var id string
	err := l.db.QueryRow(ctx,
		`SELECT l.id FROM lessons l
		 JOIN modules m ON l.node_id = m.id
		 JOIN topics t ON m.topic_id = t.id
		 WHERE l.id = $1 AND t.user_id = $2`,
		lessonID, userID,
	).Scan(&id)
	return err == nil
}

func (l *lessonRepository) UpdateByModuleID(ctx context.Context, moduleID string, index int, status string) (*models.Lesson, error) {
	var lesson models.Lesson
	err := l.db.QueryRow(ctx,
		"UPDATE lessons SET status = $1 WHERE node_id = $2 AND index = $3 RETURNING id,node_id,index,title,description,content,status", status, moduleID, index,
	).Scan(&lesson.ID, &lesson.NodeID, &lesson.Index, &lesson.Title, &lesson.Description, &lesson.Content, &lesson.Status)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return &lesson, err
}
