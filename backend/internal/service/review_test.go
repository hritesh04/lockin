package service

import (
	"context"
	"testing"
	"time"

	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/google/uuid"
)

type mockReviewRepo struct {
	cards map[uuid.UUID]models.ReviewCard
}

func newMockReviewRepo() *mockReviewRepo {
	return &mockReviewRepo{cards: make(map[uuid.UUID]models.ReviewCard)}
}

func (m *mockReviewRepo) BatchInsertCards(_ context.Context, cards []models.ReviewCard) error {
	for _, c := range cards {
		m.cards[uuid.MustParse(c.ID)] = c
	}
	return nil
}

func (m *mockReviewRepo) ListDue(_ context.Context, _ uuid.UUID, _ *uuid.UUID, _ int) ([]models.ReviewCard, error) {
	return nil, nil
}

func (m *mockReviewRepo) ListDueExcludingTopic(_ context.Context, _ uuid.UUID, _ *uuid.UUID, _ int) ([]models.ReviewCard, error) {
	return nil, nil
}

func (m *mockReviewRepo) DueCount(_ context.Context, _ uuid.UUID) (int, error) {
	return 0, nil
}

func (m *mockReviewRepo) GetCard(_ context.Context, id uuid.UUID) (models.ReviewCard, error) {
	if c, ok := m.cards[id]; ok {
		return c, nil
	}
	return models.ReviewCard{}, nil
}

func (m *mockReviewRepo) UpdateSchedule(_ context.Context, card models.ReviewCard) error {
	m.cards[uuid.MustParse(card.ID)] = card
	return nil
}

func (m *mockReviewRepo) UpsertFromSession(_ context.Context, card models.ReviewCard) error {
	m.cards[uuid.MustParse(card.ID)] = card
	return nil
}

func (m *mockReviewRepo) GetStats(_ context.Context, _ uuid.UUID) (models.ReviewStats, error) {
	return models.ReviewStats{}, nil
}

func (m *mockReviewRepo) ListWeakConcepts(_ context.Context, _ uuid.UUID, _ int) ([]models.WeakConcept, error) {
	return nil, nil
}

func (m *mockReviewRepo) GetRetentionByTopic(_ context.Context, _ uuid.UUID, _ int) ([]models.TopicRetentionSeries, error) {
	return nil, nil
}

type mockTopicRepo struct{}

func (m *mockTopicRepo) GetByID(_ context.Context, _, _ string) (models.Topic, error) {
	return models.Topic{}, nil
}

func (m *mockTopicRepo) GetAll(_ context.Context, _ uuid.UUID) ([]models.Topic, error) {
	return nil, nil
}

func (m *mockTopicRepo) Create(_ context.Context, _ models.Topic) error { return nil }

func (m *mockTopicRepo) UpdateStatus(_ context.Context, _, _ string) error { return nil }

func (m *mockTopicRepo) UpdateTierAndRemark(_ context.Context, _ string, _ int, _ string) error {
	return nil
}

func (m *mockTopicRepo) IsUserTopic(_ context.Context, _, _ string) bool { return false }

func (m *mockTopicRepo) GetRoadmap(_ context.Context, _, _ string) (*models.TopicRoadmap, error) {
	return nil, nil
}

type mockAiCardGen struct{}

func (m *mockAiCardGen) GenerateReviewCards(_ context.Context, _ string, _ int, _ string, _ int) ([]models.ReviewCardInput, error) {
	return nil, nil
}

func TestRate_QualityBelow3_LapsesAndResets(t *testing.T) {
	repo := newMockReviewRepo()
	svc := NewReviewService(repo, &mockTopicRepo{}, &mockAiCardGen{})

	cardID := uuid.NewString()
	userID := uuid.NewString()
	repo.cards[uuid.MustParse(cardID)] = models.ReviewCard{
		ID:           cardID,
		UserID:       userID,
		EaseFactor:   2.5,
		IntervalDays: 10,
		Repetitions:  3,
		Lapses:       1,
	}

	result, err := svc.Rate(context.Background(), cardID, userID, 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Lapses != 2 {
		t.Errorf("expected lapses=2, got %d", result.Lapses)
	}
	if result.Repetitions != 0 {
		t.Errorf("expected repetitions=0, got %d", result.Repetitions)
	}
	if result.IntervalDays != 1 {
		t.Errorf("expected interval=1, got %d", result.IntervalDays)
	}
}

func TestRate_Quality3_IncrementsRepetitions(t *testing.T) {
	repo := newMockReviewRepo()
	svc := NewReviewService(repo, &mockTopicRepo{}, &mockAiCardGen{})

	cardID := uuid.NewString()
	userID := uuid.NewString()
	repo.cards[uuid.MustParse(cardID)] = models.ReviewCard{
		ID:           cardID,
		UserID:       userID,
		EaseFactor:   2.5,
		IntervalDays: 0,
		Repetitions:  0,
	}

	result, err := svc.Rate(context.Background(), cardID, userID, 3)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Repetitions != 1 {
		t.Errorf("expected repetitions=1, got %d", result.Repetitions)
	}
	if result.IntervalDays != 1 {
		t.Errorf("expected interval=1, got %d", result.IntervalDays)
	}
	if result.Lapses != 0 {
		t.Errorf("expected lapses=0, got %d", result.Lapses)
	}
}

func TestRate_Quality5_FirstRepetition_SetsInterval6(t *testing.T) {
	repo := newMockReviewRepo()
	svc := NewReviewService(repo, &mockTopicRepo{}, &mockAiCardGen{})

	cardID := uuid.NewString()
	userID := uuid.NewString()
	repo.cards[uuid.MustParse(cardID)] = models.ReviewCard{
		ID:           cardID,
		UserID:       userID,
		EaseFactor:   2.5,
		IntervalDays: 0,
		Repetitions:  0,
	}

	result, err := svc.Rate(context.Background(), cardID, userID, 5)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Repetitions != 1 {
		t.Errorf("expected repetitions=1, got %d", result.Repetitions)
	}
	if result.IntervalDays != 6 {
		t.Errorf("expected interval=6, got %d", result.IntervalDays)
	}
}

func TestRate_Quality5_SecondRepetition_MultipliesByEase(t *testing.T) {
	repo := newMockReviewRepo()
	svc := NewReviewService(repo, &mockTopicRepo{}, &mockAiCardGen{})

	cardID := uuid.NewString()
	userID := uuid.NewString()
	repo.cards[uuid.MustParse(cardID)] = models.ReviewCard{
		ID:           cardID,
		UserID:       userID,
		EaseFactor:   2.5,
		IntervalDays: 6,
		Repetitions:  1,
	}

	result, err := svc.Rate(context.Background(), cardID, userID, 5)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Repetitions != 2 {
		t.Errorf("expected repetitions=2, got %d", result.Repetitions)
	}
	expected := int(6 * 2.5) // 15
	if result.IntervalDays != expected {
		t.Errorf("expected interval=%d, got %d", expected, result.IntervalDays)
	}
}

func TestRate_EaseFactor_ClampedTo13(t *testing.T) {
	repo := newMockReviewRepo()
	svc := NewReviewService(repo, &mockTopicRepo{}, &mockAiCardGen{})

	cardID := uuid.NewString()
	userID := uuid.NewString()
	repo.cards[uuid.MustParse(cardID)] = models.ReviewCard{
		ID:           cardID,
		UserID:       userID,
		EaseFactor:   1.3,
		IntervalDays: 1,
		Repetitions:  0,
	}

	result, err := svc.Rate(context.Background(), cardID, userID, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.EaseFactor < 1.3 {
		t.Errorf("ease factor should be clamped to >= 1.3, got %f", result.EaseFactor)
	}
}

func TestRate_EaseFactor_DecreasesOnLowQuality(t *testing.T) {
	repo := newMockReviewRepo()
	svc := NewReviewService(repo, &mockTopicRepo{}, &mockAiCardGen{})

	cardID := uuid.NewString()
	userID := uuid.NewString()
	repo.cards[uuid.MustParse(cardID)] = models.ReviewCard{
		ID:           cardID,
		UserID:       userID,
		EaseFactor:   2.5,
		IntervalDays: 1,
	}

	result, err := svc.Rate(context.Background(), cardID, userID, 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.EaseFactor >= 2.5 {
		t.Errorf("ease factor should decrease on low quality, got %f", result.EaseFactor)
	}
}

func TestRate_EaseFactor_IncreasesOnHighQuality(t *testing.T) {
	repo := newMockReviewRepo()
	svc := NewReviewService(repo, &mockTopicRepo{}, &mockAiCardGen{})

	cardID := uuid.NewString()
	userID := uuid.NewString()
	repo.cards[uuid.MustParse(cardID)] = models.ReviewCard{
		ID:           cardID,
		UserID:       userID,
		EaseFactor:   2.5,
		IntervalDays: 6,
		Repetitions:  1,
	}

	result, err := svc.Rate(context.Background(), cardID, userID, 5)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.EaseFactor <= 2.5 {
		t.Errorf("ease factor should increase on high quality, got %f", result.EaseFactor)
	}
}

func TestRate_SetsLastReviewedAtAndDueAt(t *testing.T) {
	repo := newMockReviewRepo()
	svc := NewReviewService(repo, &mockTopicRepo{}, &mockAiCardGen{})

	cardID := uuid.NewString()
	userID := uuid.NewString()
	repo.cards[uuid.MustParse(cardID)] = models.ReviewCard{
		ID:           cardID,
		UserID:       userID,
		EaseFactor:   2.5,
		IntervalDays: 0,
	}

	before := time.Now()
	result, err := svc.Rate(context.Background(), cardID, userID, 3)
	after := time.Now()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.LastReviewedAt == nil {
		t.Fatal("expected LastReviewedAt to be set")
	}
	if result.LastReviewedAt.Before(before) || result.LastReviewedAt.After(after) {
		t.Errorf("LastReviewedAt out of range")
	}

	expectedDue := before.AddDate(0, 0, 1)
	if result.DueAt.Before(expectedDue) || result.DueAt.After(after.AddDate(0, 0, 1)) {
		t.Errorf("DueAt out of expected range")
	}
}

func TestRate_InvalidQuality_ReturnsError(t *testing.T) {
	repo := newMockReviewRepo()
	svc := NewReviewService(repo, &mockTopicRepo{}, &mockAiCardGen{})

	_, err := svc.Rate(context.Background(), uuid.NewString(), uuid.NewString(), 6)
	if err == nil {
		t.Fatal("expected error for quality > 5")
	}

	_, err = svc.Rate(context.Background(), uuid.NewString(), uuid.NewString(), -1)
	if err == nil {
		t.Fatal("expected error for quality < 0")
	}
}

func TestRate_InvalidCardID_ReturnsError(t *testing.T) {
	repo := newMockReviewRepo()
	svc := NewReviewService(repo, &mockTopicRepo{}, &mockAiCardGen{})

	_, err := svc.Rate(context.Background(), "not-a-uuid", uuid.NewString(), 3)
	if err == nil {
		t.Fatal("expected error for invalid card ID")
	}
}

func TestRate_WrongUser_ReturnsError(t *testing.T) {
	repo := newMockReviewRepo()
	svc := NewReviewService(repo, &mockTopicRepo{}, &mockAiCardGen{})

	cardID := uuid.NewString()
	repo.cards[uuid.MustParse(cardID)] = models.ReviewCard{
		ID:     cardID,
		UserID: uuid.NewString(),
	}

	_, err := svc.Rate(context.Background(), cardID, uuid.NewString(), 3)
	if err == nil {
		t.Fatal("expected error for wrong user")
	}
}
