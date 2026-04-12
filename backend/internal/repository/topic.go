package repository

import (
	"context"
	"encoding/json"

	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type topicRepository struct {
	db *pgxpool.Pool
}

func NewTopicRepository(db *pgxpool.Pool) *topicRepository {
	return &topicRepository{db: db}
}

func (r *topicRepository) Create(ctx context.Context, topic models.Topic) error {
	_, err := r.db.Exec(ctx,
		"INSERT INTO topics (id, user_id, title, tier) VALUES ($1, $2, $3, $4)",
		topic.ID, topic.UserID, topic.Title, topic.Tier,
	)
	return err
}

func (r *topicRepository) GetAll(ctx context.Context, userID uuid.UUID) ([]models.Topic, error) {
	rows, err := r.db.Query(ctx,
		"SELECT id, user_id, title, tier, remark, created_at FROM topics WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC",
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var topics []models.Topic
	for rows.Next() {
		var t models.Topic
		rows.Scan(&t.ID, &t.UserID, &t.Title, &t.Tier, &t.Remark, &t.CreatedAt)
		topics = append(topics, t)
	}
	return topics, nil
}

func (r *topicRepository) GetByID(ctx context.Context, topicID, userID string) (models.Topic, error) {
	var t models.Topic
	err := r.db.QueryRow(ctx,
		"SELECT id, user_id, title, tier, remark, created_at FROM topics WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
		topicID, userID,
	).Scan(&t.ID, &t.UserID, &t.Title, &t.Tier, &t.Remark, &t.CreatedAt)
	return t, err
}

func (r *topicRepository) IsUserTopic(ctx context.Context, userID, topicID string) bool {
	var id string
	if err := r.db.QueryRow(ctx, "SELECT id FROM topics WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL", topicID, userID).Scan(&id); err != nil {
		return false
	}
	return true
}

func (r *topicRepository) GetRoadmap(ctx context.Context, topicID, userID string) (*models.TopicRoadmap, error) {
	var t models.TopicRoadmap
	var modulesJSON []byte
	err := r.db.QueryRow(ctx,
		`SELECT 
  t.id,
  t.title,
  t.tier,

  COALESCE(
    json_agg(
      jsonb_build_object(
        'id', m.id,
        'topicId', m.topic_id,
        'index', m.index,
        'title', m.title,
        'description', m.description,
        'status', m.status,
        'concept_tags', m.concept_tags,

        'lessons', (
          SELECT COALESCE(
            json_agg(
              jsonb_build_object(
                'id', l.id,
                'nodeId', l.node_id,
                'index', l.index,
                'title', l.title,
                'description', l.description,
                'content', l.content,
                'status', l.status,
                'quizzes', (
                  SELECT COALESCE(
                    json_agg(
                      jsonb_build_object(
                        'id', q.id,
                        'nodeId', q.node_id,
                        'lessonId', q.lesson_id,
                        'index', q.index,
                        'question', q.question,
                        'type', q.type,

                        'options', (
                          SELECT COALESCE(
                            json_agg(
                              jsonb_build_object(
                                'id', qo.id,
                                'questionId', qo.question_id,
                                'index', qo.index,
                                'label', qo.label,
                                'explanation', qo.explanation,
                                'is_correct', qo.is_correct
                              )
                            ), '[]'
                          )
                          FROM question_options qo
                          WHERE qo.question_id = q.id 
                            AND (q.type = 'mcq' OR q.type = 'true_false')
                        )

                      )
                      ORDER BY q.index
                    ), '[]'
                  )
                  FROM questions q
                  WHERE q.lesson_id = l.id
                )

              )
              ORDER BY l.index
            ), '[]'
          )
          FROM lessons l
          WHERE l.node_id = m.id
        )

      )
      ORDER BY m.index
    ), '[]'
  ) AS modules

FROM topics t
LEFT JOIN modules m ON m.topic_id = t.id

WHERE t.id = $1 AND t.user_id = $2

GROUP BY t.id;`,
		topicID, userID,
	).Scan(&t.ID, &t.Title, &t.Tier, &modulesJSON)

	if err != nil {
		return nil, err
	}

	if len(modulesJSON) > 0 {
		if err := json.Unmarshal(modulesJSON, &t.Modules); err != nil {
			return nil, err
		}
	}

	return &t, nil
}