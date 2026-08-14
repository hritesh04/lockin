package service

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/acerowl/lockin/backend/internal/repository"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// AiCardGenerator generates generative flashcards from a topic's lesson content.
type AiCardGenerator interface {
	GenerateReviewCards(ctx context.Context, topic string, tier int, content string, questionCount int, existingContext string) ([]models.ReviewCardInput, error)
}

type ReviewRepository interface {
	BatchInsertCards(ctx context.Context, cards []models.ReviewCard) error
	BatchInsertCardsFiltered(ctx context.Context, cards []models.ReviewCard) (int, error)
	ListDue(ctx context.Context, userID uuid.UUID, topicID *uuid.UUID, limit int) ([]models.ReviewCard, error)
	ListByTopic(ctx context.Context, userID uuid.UUID, topicID uuid.UUID) ([]models.ReviewCard, error)
	DueCount(ctx context.Context, userID uuid.UUID) (int, error)
	CountByTopic(ctx context.Context, userID uuid.UUID, topicID *uuid.UUID) (int, error)
	CountByTopicWithViewStatus(ctx context.Context, userID uuid.UUID, topicID uuid.UUID) (repository.TopicViewStatus, error)
	GetConceptRetention(ctx context.Context, userID uuid.UUID, topicID uuid.UUID) ([]repository.ConceptRetention, error)
	GetTopicsWithCompletedLessons(ctx context.Context) ([]repository.TopicUserID, error)
	GetCard(ctx context.Context, id uuid.UUID) (models.ReviewCard, error)
	UpdateSchedule(ctx context.Context, card models.ReviewCard) error
	UpsertFromSession(ctx context.Context, card models.ReviewCard) error
	GetStats(ctx context.Context, userID uuid.UUID) (models.ReviewStats, error)
	ListWeakConcepts(ctx context.Context, userID uuid.UUID, limit int) ([]models.WeakConcept, error)
	GetRetentionByTopic(ctx context.Context, userID uuid.UUID, days int) ([]models.TopicRetentionSeries, error)
}

type ReviewService interface {
	GenerateAndStore(ctx context.Context, userID, topicID string, targetCount int) (int, error)
	GenerateAll(ctx context.Context, userID string, perTopic int) (int, error)
	GenerateNightlyReviewCards(ctx context.Context) (int, error)
	ListDue(ctx context.Context, userID string, topicID *uuid.UUID, limit int) ([]models.ReviewCard, error)
	DueCount(ctx context.Context, userID string) (int, error)
	Rate(ctx context.Context, cardID, userID string, quality int) (models.ReviewCard, error)
	Stats(ctx context.Context, userID string) (models.ReviewStats, error)
	RetentionByTopic(ctx context.Context, userID string, days int) ([]models.TopicRetentionSeries, error)
}

type reviewService struct {
	repo      ReviewRepository
	topicRepo TopicRepository
	ai        AiCardGenerator
	rdb       *redis.Client
}

func NewReviewService(r ReviewRepository, tr TopicRepository, a AiCardGenerator, rdb *redis.Client) *reviewService {
	return &reviewService{repo: r, topicRepo: tr, ai: a, rdb: rdb}
}

// ErrNoReachableLessons is returned when a topic has no completed or
// in-progress lessons to base review cards on.
var ErrNoReachableLessons = errors.New("complete at least one lesson before generating review cards")
var ErrCompletePendingReviewCards = errors.New("Complete the pending review cards before generating more")
// buildReachableLessonDigest renders a text digest of the lessons the user has
// actually studied (completed or in-progress), skipping locked lessons and
// modules that have no reachable lessons.
func buildReachableLessonDigest(roadmap *models.TopicRoadmap) string {
	if roadmap == nil {
		return ""
	}
	var sb strings.Builder
	for _, m := range roadmap.Modules {
		reachable := make([]models.Lesson, 0, len(m.Lessons))
		for _, l := range m.Lessons {
			if l.Status != models.StatusLocked {
				reachable = append(reachable, l)
			}
		}
		if len(reachable) == 0 {
			continue
		}
		fmt.Fprintf(&sb, "Module: %s\n", m.Title)
		if len(m.ConceptTags) > 0 {
			fmt.Fprintf(&sb, "  Concept tags: %s\n", strings.Join(m.ConceptTags, ", "))
		}
		for _, l := range reachable {
			fmt.Fprintf(&sb, "  - Lesson: %s — %s\n", l.Title, l.Description)
		}
	}
	return sb.String()
}

func (s *reviewService) GenerateAndStore(ctx context.Context, userID, topicID string, targetCount int) (int, error) {
	if targetCount <= 0 {
		targetCount = 10
	}

	uid, err := uuid.Parse(userID)
	if err != nil {
		return 0, err
	}
	topicUUID, err := uuid.Parse(topicID)
	if err != nil {
		return 0, err
	}

	// Top-up semantics: reuse existing cards and only generate the shortfall up
	// to the target count. When the topic already has enough cards, do nothing.
	existing, err := s.repo.CountByTopic(ctx, uid, &topicUUID)
	if err != nil {
		return 0, err
	}
	remaining := targetCount - existing
	if remaining <= 0 {
		return 0, ErrCompletePendingReviewCards
	}

	n, err := s.generateCards(ctx, userID, topicID, remaining)
	if err != nil {
		return 0, err
	}

	s.incrementReviewRateLimit(userID)
	return n, nil
}

// generateCards generates exactly `count` fresh review cards for a topic and
// persists them. It returns the number of cards created. It considers existing
// cards' content and SM-2 data to avoid duplicates and prioritise weak areas.
func (s *reviewService) generateCards(ctx context.Context, userID, topicID string, count int) (int, error) {
	if count <= 0 {
		return 0, nil
	}

	uid, err := uuid.Parse(userID)
	if err != nil {
		return 0, err
	}
	topicUUID, err := uuid.Parse(topicID)
	if err != nil {
		return 0, err
	}

	roadmap, err := s.topicRepo.GetRoadmap(ctx, topicID, userID)
	if err != nil {
		return 0, err
	}

	topic, err := s.topicRepo.GetByID(ctx, topicID, userID)
	if err != nil {
		return 0, err
	}

	digest := buildReachableLessonDigest(roadmap)
	if digest == "" {
		return 0, ErrNoReachableLessons
	}

	// Fetch existing cards and weak concepts for smart generation
	existingCards, _ := s.repo.ListByTopic(ctx, uid, topicUUID)
	weakConcepts, _ := s.repo.GetConceptRetention(ctx, uid, topicUUID)
	existingContext := buildExistingCardsContext(existingCards, weakConcepts)

	inputs, err := s.ai.GenerateReviewCards(ctx, topic.Title, topic.Tier, digest, count, existingContext)
	if err != nil {
		return 0, err
	}
	if len(inputs) == 0 {
		return 0, errors.New("AI returned no review cards")
	}

	now := time.Now()
	cards := make([]models.ReviewCard, 0, len(inputs))
	for _, in := range inputs {
		tags := []string{}
		if in.ConceptTag != "" {
			tags = []string{in.ConceptTag}
		}
		cards = append(cards, models.ReviewCard{
			ID:           uuid.NewString(),
			UserID:       userID,
			TopicID:      topicID,
			Prompt:       in.Prompt,
			Answer:       in.Answer,
			ConceptTags:  tags,
			EaseFactor:   2.5,
			IntervalDays: 0,
			Repetitions:  0,
			Lapses:       0,
			LastResult:   0,
			DueAt:        now,
			CreatedAt:    now,
		})
	}

	// Use filtered insert to deduplicate by prompt + concept_tag
	inserted, err := s.repo.BatchInsertCardsFiltered(ctx, cards)
	if err != nil {
		return 0, err
	}
	return inserted, nil
}

// buildExistingCardsContext builds a prompt section showing existing cards and weak areas.
func buildExistingCardsContext(cards []models.ReviewCard, weak []repository.ConceptRetention) string {
	if len(cards) == 0 && len(weak) == 0 {
		return ""
	}

	var sb strings.Builder

	if len(cards) > 0 {
		sb.WriteString("EXISTING REVIEW CARDS (avoid duplicating these prompts):\n")
		for _, c := range cards {
			tags := strings.Join(c.ConceptTags, ", ")
			fmt.Fprintf(&sb, "- [%s] %s\n", tags, c.Prompt)
		}
	}

	if len(weak) > 0 {
		sb.WriteString("\nWEAK AREAS (prioritize these concepts — low ease_factor or high lapses):\n")
		for _, w := range weak {
			retention := 0.0
			if w.SampleSize > 0 {
				retention = w.AvgResult / 5.0
			}
			fmt.Fprintf(&sb, "- %s: ease=%.1f, retention=%.0f%%, lapses=%d\n",
				w.Concept, w.AvgEase, retention*100, w.TotalLapses)
		}
	}

	return sb.String()
}

// GenerateAll generates `perTopic` fresh review cards for every topic the user
// owns, prioritizing weak concepts. Unlike the per-topic top-up, this always
// produces new cards so tapping Mixed Review yields fresh material to review.
// Topics without reachable lessons are skipped rather than failing the request.
func (s *reviewService) GenerateAll(ctx context.Context, userID string, perTopic int) (int, error) {
	if perTopic <= 0 {
		perTopic = 5
	}

	uid, err := uuid.Parse(userID)
	if err != nil {
		return 0, err
	}

	topics, err := s.topicRepo.GetAll(ctx, uid)
	if err != nil {
		return 0, err
	}

	total := 0
	for _, t := range topics {
		n, err := s.generateCards(ctx, userID, t.ID, perTopic)
		if err != nil {
			if errors.Is(err, ErrNoReachableLessons) {
				continue
			}
			return total, err
		}
		total += n
	}

	if total > 0 {
		s.incrementReviewRateLimit(userID)
	}
	return total, nil
}

func (s *reviewService) ListDue(ctx context.Context, userID string, topicID *uuid.UUID, limit int) ([]models.ReviewCard, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListDue(ctx, uid, topicID, limit)
}

func (s *reviewService) DueCount(ctx context.Context, userID string) (int, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return 0, err
	}
	return s.repo.DueCount(ctx, uid)
}

func (s *reviewService) Stats(ctx context.Context, userID string) (models.ReviewStats, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return models.ReviewStats{}, err
	}
	return s.repo.GetStats(ctx, uid)
}

// Rate applies the SM-2 algorithm to a review card and reschedules it.
func (s *reviewService) Rate(ctx context.Context, cardID, userID string, quality int) (models.ReviewCard, error) {
	if quality < 0 || quality > 5 {
		return models.ReviewCard{}, errors.New("quality must be between 0 and 5")
	}

	cid, err := uuid.Parse(cardID)
	if err != nil {
		return models.ReviewCard{}, errors.New("invalid card id")
	}

	card, err := s.repo.GetCard(ctx, cid)
	if err != nil {
		return models.ReviewCard{}, err
	}
	if card.UserID != userID {
		return models.ReviewCard{}, errors.New("card not found")
	}

	switch {
	case quality < 3:
		card.Lapses++
		card.Repetitions = 0
		card.IntervalDays = 1
	case quality == 3:
		card.Repetitions++
		card.IntervalDays = 1
	default:
		card.Repetitions++
		if card.Repetitions == 1 {
			card.IntervalDays = 6
		} else {
			card.IntervalDays = int(math.Round(float64(card.IntervalDays) * card.EaseFactor))
		}
	}

	// ease = ease + (0.1 − (5−q)·(0.08 + (5−q)·0.02)), clamped to >= 1.3
	ease := card.EaseFactor + (0.1 - float64(5-quality)*(0.08+float64(5-quality)*0.02))
	if ease < 1.3 {
		ease = 1.3
	}
	card.EaseFactor = ease
	card.LastResult = quality

	now := time.Now()
	card.LastReviewedAt = &now
	card.DueAt = now.AddDate(0, 0, card.IntervalDays)

	if err := s.repo.UpdateSchedule(ctx, card); err != nil {
		return models.ReviewCard{}, err
	}
	return card, nil
}

func (s *reviewService) RetentionByTopic(ctx context.Context, userID string, days int) ([]models.TopicRetentionSeries, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, err
	}
	return s.repo.GetRetentionByTopic(ctx, uid, days)
}

// GenerateNightlyReviewCards runs as a daily cron job at midnight UTC.
// For each topic with completed lessons:
//   - If no cards exist → generate 10 (first time)
//   - If cards exist but none have been viewed (last_reviewed_at IS NULL) → skip
//   - If cards exist and some have been viewed → top-up to 10
func (s *reviewService) GenerateNightlyReviewCards(ctx context.Context) (int, error) {
	topics, err := s.repo.GetTopicsWithCompletedLessons(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch topics with completed lessons: %w", err)
	}

	total := 0
	for _, t := range topics {
		uid, err := uuid.Parse(t.UserID)
		if err != nil {
			continue
		}
		topicUUID, err := uuid.Parse(t.TopicID)
		if err != nil {
			continue
		}

		status, err := s.repo.CountByTopicWithViewStatus(ctx, uid, topicUUID)
		if err != nil {
			continue
		}

		var n int
		switch {
		case status.Total == 0:
			// First time: generate 10 cards
			n, err = s.generateCards(ctx, t.UserID, t.TopicID, 10)
		case status.Viewed == 0:
			// Has cards but user hasn't viewed any yet: skip
			continue
		default:
			// User has viewed cards: top-up to 10
			remaining := 10 - status.Total
			if remaining <= 0 {
				continue
			}
			n, err = s.generateCards(ctx, t.UserID, t.TopicID, remaining)
		}

		if err != nil {
			if errors.Is(err, ErrNoReachableLessons) {
				continue
			}
			continue
		}
		total += n
	}
	return total, nil
}

func (s *reviewService) incrementReviewRateLimit(userID string) {
	if s.rdb == nil {
		return
	}
	key := "rate_limit:review:" + userID
	ctx := context.Background()
	val, err := s.rdb.Incr(ctx, key).Result()
	if err != nil {
		return
	}
	if val == 1 {
		s.rdb.Expire(ctx, key, 24*time.Hour)
	}
}
