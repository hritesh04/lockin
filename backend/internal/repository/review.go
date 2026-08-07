package repository

import (
	"context"
	"fmt"

	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type reviewRepository struct {
	db *pgxpool.Pool
}

func NewReviewRepository(db *pgxpool.Pool) *reviewRepository {
	return &reviewRepository{db: db}
}

func (r *reviewRepository) BatchInsertCards(ctx context.Context, cards []models.ReviewCard) error {
	if len(cards) == 0 {
		return nil
	}
	batch := r.db
	tx, err := batch.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, c := range cards {
		if _, err := tx.Exec(ctx,
			`INSERT INTO review_cards
				(id, user_id, topic_id, lesson_id, source_question_id, prompt, answer, concept_tags, ease_factor, interval_days, repetitions, lapses, last_result, due_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
			c.ID, c.UserID, c.TopicID, c.LessonID, c.SourceQuestionID, c.Prompt, c.Answer,
			c.ConceptTags, c.EaseFactor, c.IntervalDays, c.Repetitions, c.Lapses, c.LastResult, c.DueAt,
		); err != nil {
			return fmt.Errorf("failed inserting review card: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *reviewRepository) ListDue(ctx context.Context, userID uuid.UUID, topicID *uuid.UUID, limit int) ([]models.ReviewCard, error) {
	query := `SELECT id, user_id, topic_id, lesson_id, source_question_id, prompt, answer, concept_tags,
	              ease_factor, interval_days, repetitions, lapses, last_result, due_at, last_reviewed_at, created_at
	          FROM review_cards
	          WHERE user_id = $1 AND due_at <= NOW()`
	args := []any{userID}
	if topicID != nil {
		query += ` AND topic_id = $2`
		args = append(args, *topicID)
	}
	query += ` ORDER BY due_at ASC`
	if limit > 0 {
		args = append(args, limit)
		query += fmt.Sprintf(` LIMIT $%d`, len(args))
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cards := []models.ReviewCard{}
	for rows.Next() {
		var c models.ReviewCard
		if err := rows.Scan(&c.ID, &c.UserID, &c.TopicID, &c.LessonID, &c.SourceQuestionID, &c.Prompt, &c.Answer,
			&c.ConceptTags, &c.EaseFactor, &c.IntervalDays, &c.Repetitions, &c.Lapses, &c.LastResult,
			&c.DueAt, &c.LastReviewedAt, &c.CreatedAt); err != nil {
			return nil, err
		}
		cards = append(cards, c)
	}
	return cards, rows.Err()
}

// ListDueExcludingTopic returns due review cards that are NOT from the given topic,
// used by interleaved sessions to inject review material from other topics.
func (r *reviewRepository) ListDueExcludingTopic(ctx context.Context, userID uuid.UUID, excludeTopicID *uuid.UUID, limit int) ([]models.ReviewCard, error) {
	query := `SELECT id, user_id, topic_id, lesson_id, source_question_id, prompt, answer, concept_tags,
	              ease_factor, interval_days, repetitions, lapses, last_result, due_at, last_reviewed_at, created_at
	          FROM review_cards
	          WHERE user_id = $1 AND due_at <= NOW()`
	args := []any{userID}
	if excludeTopicID != nil {
		query += ` AND (topic_id IS NULL OR topic_id <> $2)`
		args = append(args, *excludeTopicID)
	}
	query += ` ORDER BY due_at ASC`
	if limit > 0 {
		args = append(args, limit)
		query += fmt.Sprintf(` LIMIT $%d`, len(args))
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cards := []models.ReviewCard{}
	for rows.Next() {
		var c models.ReviewCard
		if err := rows.Scan(&c.ID, &c.UserID, &c.TopicID, &c.LessonID, &c.SourceQuestionID, &c.Prompt, &c.Answer,
			&c.ConceptTags, &c.EaseFactor, &c.IntervalDays, &c.Repetitions, &c.Lapses, &c.LastResult,
			&c.DueAt, &c.LastReviewedAt, &c.CreatedAt); err != nil {
			return nil, err
		}
		cards = append(cards, c)
	}
	return cards, rows.Err()
}

func (r *reviewRepository) DueCount(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM review_cards WHERE user_id = $1 AND due_at <= NOW()`,
		userID,
	).Scan(&count)
	return count, err
}

// GetStats aggregates retention by interval and per-concept accuracy from review
// outcomes. A card is "correct" when its last_result quality >= 3.
func (r *reviewRepository) GetStats(ctx context.Context, userID uuid.UUID) (models.ReviewStats, error) {
	stats := models.ReviewStats{
		RetentionByInterval: []models.RetentionBucket{},
		WeakConcepts:        []models.WeakConcept{},
	}

	if err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM review_cards WHERE user_id = $1`, userID,
	).Scan(&stats.TotalCards); err != nil {
		return stats, err
	}

	if err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM review_cards WHERE user_id = $1 AND due_at <= NOW()`, userID,
	).Scan(&stats.DueToday); err != nil {
		return stats, err
	}

	// Retention: bucket reviewed cards by days between creation and last review.
	rows, err := r.db.Query(ctx,
		`SELECT
			GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (last_reviewed_at - created_at)) / 86400))::int AS days,
			COUNT(*) FILTER (WHERE last_result >= 3)::float / COUNT(*)::float AS pct_correct
		 FROM review_cards
		 WHERE user_id = $1 AND last_reviewed_at IS NOT NULL AND last_result > 0
		 GROUP BY days
		 ORDER BY days ASC`,
		userID,
	)
	if err != nil {
		return stats, err
	}
	for rows.Next() {
		var b models.RetentionBucket
		if err := rows.Scan(&b.Days, &b.PctCorrect); err != nil {
			rows.Close()
			return stats, err
		}
		stats.RetentionByInterval = append(stats.RetentionByInterval, b)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return stats, err
	}

	// Weak concepts: per-concept accuracy across reviewed cards, weakest first.
	rows, err = r.db.Query(ctx,
		`SELECT
			concept_data.concept,
			t.title as topic_name,
			concept_data.pct_correct,
			concept_data.sample_size
		 FROM (
		   SELECT
		     UNNEST(concept_tags) AS concept,
		     (ARRAY_AGG(topic_id ORDER BY last_reviewed_at DESC))[1] as topic_id,
		     COUNT(*) FILTER (WHERE last_result >= 3)::float / COUNT(*) FILTER (WHERE last_result > 0)::float AS pct_correct,
		     COUNT(*) FILTER (WHERE last_result > 0)::int AS sample_size
		   FROM review_cards
		   WHERE user_id = $1
		   GROUP BY concept
		   HAVING COUNT(*) FILTER (WHERE last_result > 0) > 0
		      AND (COUNT(*) FILTER (WHERE last_result >= 3)::float / COUNT(*) FILTER (WHERE last_result > 0)::float) < 0.75
		   ORDER BY pct_correct ASC
		   LIMIT 10
		 ) concept_data
		 JOIN topics t ON concept_data.topic_id = t.id`,
		userID,
	)
	if err != nil {
		return stats, err
	}
	for rows.Next() {
		var w models.WeakConcept
		if err := rows.Scan(&w.Concept, &w.TopicName, &w.PctCorrect, &w.SampleSize); err != nil {
			rows.Close()
			return stats, err
		}
		stats.WeakConcepts = append(stats.WeakConcepts, w)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return stats, err
	}

	return stats, nil
}

// GetRetentionByTopic returns retention data for each topic over the last N days.
func (r *reviewRepository) GetRetentionByTopic(ctx context.Context, userID uuid.UUID, days int) ([]models.TopicRetentionSeries, error) {
	query := `
		SELECT
			rc.topic_id::text as topic_id,
			t.title as topic_title,
			DATE(rc.last_reviewed_at AT TIME ZONE 'UTC')::text as review_date,
			COUNT(*) FILTER (WHERE rc.last_result >= 3)::float / COUNT(*)::float AS pct_correct,
			COUNT(*)::int as review_count
		FROM review_cards rc
		JOIN topics t ON rc.topic_id = t.id
		WHERE rc.user_id = $1
		  AND rc.last_reviewed_at IS NOT NULL
		  AND rc.last_result > 0
		  AND rc.last_reviewed_at >= CURRENT_DATE - make_interval(days => $2)
		GROUP BY rc.topic_id, t.title, DATE(rc.last_reviewed_at AT TIME ZONE 'UTC')
		ORDER BY rc.topic_id, review_date ASC
	`
	rows, err := r.db.Query(ctx, query, userID, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Group by topic
	topicMap := make(map[string]*models.TopicRetentionSeries)
	for rows.Next() {
		var topicID, topicTitle, reviewDate string
		var pctCorrect float64
		var reviewCount int
		if err := rows.Scan(&topicID, &topicTitle, &reviewDate, &pctCorrect, &reviewCount); err != nil {
			return nil, err
		}
		if _, ok := topicMap[topicID]; !ok {
			topicMap[topicID] = &models.TopicRetentionSeries{
				TopicID:    topicID,
				TopicTitle: topicTitle,
				Points:     []models.RetentionPoint{},
			}
		}
		topicMap[topicID].Points = append(topicMap[topicID].Points, models.RetentionPoint{
			Date:       reviewDate,
			PctCorrect: pctCorrect,
			Reviews:    reviewCount,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Convert map to slice
	result := make([]models.TopicRetentionSeries, 0, len(topicMap))
	for _, series := range topicMap {
		result = append(result, *series)
	}
	return result, nil
}

// ListWeakConcepts returns the user's weakest concepts by review accuracy,
// ordered weakest-first. Used to adapt session difficulty.
func (r *reviewRepository) ListWeakConcepts(ctx context.Context, userID uuid.UUID, limit int) ([]models.WeakConcept, error) {
	query := `SELECT
			UNNEST(concept_tags) AS concept,
			COUNT(*) FILTER (WHERE last_result >= 3)::float / COUNT(*) FILTER (WHERE last_result > 0)::float AS pct_correct,
			COUNT(*) FILTER (WHERE last_result > 0)::int AS sample_size
		 FROM review_cards
		 WHERE user_id = $1
		 GROUP BY concept
		 HAVING COUNT(*) FILTER (WHERE last_result > 0) > 0
		 ORDER BY pct_correct ASC`
	args := []any{userID}
	if limit > 0 {
		args = append(args, limit)
		query += fmt.Sprintf(` LIMIT $%d`, len(args))
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	concepts := []models.WeakConcept{}
	for rows.Next() {
		var w models.WeakConcept
		if err := rows.Scan(&w.Concept, &w.PctCorrect, &w.SampleSize); err != nil {
			return nil, err
		}
		concepts = append(concepts, w)
	}
	return concepts, rows.Err()
}

func (r *reviewRepository) GetCard(ctx context.Context, id uuid.UUID) (models.ReviewCard, error) {
	var c models.ReviewCard
	err := r.db.QueryRow(ctx,
		`SELECT id, user_id, topic_id, lesson_id, source_question_id, prompt, answer, concept_tags,
		        ease_factor, interval_days, repetitions, lapses, last_result, due_at, last_reviewed_at, created_at
		 FROM review_cards WHERE id = $1`,
		id,
	).Scan(&c.ID, &c.UserID, &c.TopicID, &c.LessonID, &c.SourceQuestionID, &c.Prompt, &c.Answer,
		&c.ConceptTags, &c.EaseFactor, &c.IntervalDays, &c.Repetitions, &c.Lapses, &c.LastResult,
		&c.DueAt, &c.LastReviewedAt, &c.CreatedAt)
	return c, err
}

func (r *reviewRepository) UpdateSchedule(ctx context.Context, card models.ReviewCard) error {
	_, err := r.db.Exec(ctx,
		`UPDATE review_cards
		 SET ease_factor = $1, interval_days = $2, repetitions = $3, lapses = $4, last_result = $5, due_at = $6, last_reviewed_at = $7
		 WHERE id = $8`,
		card.EaseFactor, card.IntervalDays, card.Repetitions, card.Lapses, card.LastResult, card.DueAt, card.LastReviewedAt, card.ID,
	)
	return err
}

// UpsertFromSession inserts a review card derived from a session answer, or no-ops if a card
// already exists for the same user + source_question_id (dedupe for lesson-based questions).
func (r *reviewRepository) UpsertFromSession(ctx context.Context, card models.ReviewCard) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO review_cards
			(id, user_id, topic_id, lesson_id, source_question_id, prompt, answer, concept_tags, ease_factor, interval_days, repetitions, lapses, last_result, due_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		 ON CONFLICT (user_id, source_question_id) WHERE source_question_id IS NOT NULL DO NOTHING`,
		card.ID, card.UserID, card.TopicID, card.LessonID, card.SourceQuestionID, card.Prompt, card.Answer,
		card.ConceptTags, card.EaseFactor, card.IntervalDays, card.Repetitions, card.Lapses, card.LastResult, card.DueAt,
	)
	return err
}
