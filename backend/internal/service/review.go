package service

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/google/uuid"
)

// AiCardGenerator generates generative flashcards from a topic's lesson content.
type AiCardGenerator interface {
	GenerateReviewCards(ctx context.Context, topic string, tier int, content string, questionCount int) ([]models.ReviewCardInput, error)
}

type ReviewRepository interface {
	BatchInsertCards(ctx context.Context, cards []models.ReviewCard) error
	ListDue(ctx context.Context, userID uuid.UUID, topicID *uuid.UUID, limit int) ([]models.ReviewCard, error)
	ListDueExcludingTopic(ctx context.Context, userID uuid.UUID, excludeTopicID *uuid.UUID, limit int) ([]models.ReviewCard, error)
	DueCount(ctx context.Context, userID uuid.UUID) (int, error)
	GetCard(ctx context.Context, id uuid.UUID) (models.ReviewCard, error)
	UpdateSchedule(ctx context.Context, card models.ReviewCard) error
	UpsertFromSession(ctx context.Context, card models.ReviewCard) error
	GetStats(ctx context.Context, userID uuid.UUID) (models.ReviewStats, error)
	ListWeakConcepts(ctx context.Context, userID uuid.UUID, limit int) ([]models.WeakConcept, error)
	GetRetentionByTopic(ctx context.Context, userID uuid.UUID, days int) ([]models.TopicRetentionSeries, error)
}

type ReviewService interface {
	GenerateAndStore(ctx context.Context, userID, topicID string) (int, error)
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
}

func NewReviewService(r ReviewRepository, tr TopicRepository, a AiCardGenerator) *reviewService {
	return &reviewService{repo: r, topicRepo: tr, ai: a}
}

func (s *reviewService) GenerateAndStore(ctx context.Context, userID, topicID string) (int, error) {
	roadmap, err := s.topicRepo.GetRoadmap(ctx, topicID, userID)
	if err != nil {
		return 0, err
	}

	topic, err := s.topicRepo.GetByID(ctx, topicID, userID)
	if err != nil {
		return 0, err
	}

	var sb strings.Builder
	for _, m := range roadmap.Modules {
		fmt.Fprintf(&sb, "Module: %s\n", m.Title)
		if len(m.ConceptTags) > 0 {
			fmt.Fprintf(&sb, "  Concept tags: %s\n", strings.Join(m.ConceptTags, ", "))
		}
		for _, l := range m.Lessons {
			fmt.Fprintf(&sb, "  - Lesson: %s — %s\n", l.Title, l.Description)
		}
	}

	inputs, err := s.ai.GenerateReviewCards(ctx, topic.Title, topic.Tier, sb.String(), 0)
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

	if err := s.repo.BatchInsertCards(ctx, cards); err != nil {
		return 0, err
	}
	return len(cards), nil
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
