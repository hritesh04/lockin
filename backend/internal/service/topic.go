package service

import (
	"context"

	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/acerowl/lockin/backend/internal/repository"
	"github.com/google/uuid"
)

// AIGenerator defines the behavior required for AI operations
type AIGenerator interface {
	GenerateAndStoreBatch(ctx context.Context, topicID uuid.UUID, title, domain, familiarity string, tier int, weakConceptTags []string) error
}

type TopicService interface {
	CreateTopic(ctx context.Context, userID uuid.UUID, title, domain, familiarityLevel string) (models.Topic, error)
	ListTopics(ctx context.Context, userID uuid.UUID) ([]models.Topic, error)
	GetTopic(ctx context.Context, topicID, userID string) (models.Topic, error)
}

type topicService struct {
	repo  repository.TopicRepository
	aiGen AIGenerator
}

func NewTopicService(r repository.TopicRepository, aiGen AIGenerator) TopicService {
	return &topicService{repo: r, aiGen: aiGen}
}

func (s *topicService) CreateTopic(ctx context.Context, userID uuid.UUID, title, domain, familiarityLevel string) (models.Topic, error) {
	topic := models.Topic{
		ID:               uuid.New(),
		UserID:           userID,
		Title:            title,
		Domain:           domain,
		FamiliarityLevel: familiarityLevel,
		CurrentTier:      1,
	}

	err := s.repo.CreateTopic(ctx, topic)
	if err != nil {
		return models.Topic{}, err
	}

	// Trigger async generation
	go func(tID uuid.UUID, tTitle, tDomain, tFam string, tTier int) {
		_ = s.aiGen.GenerateAndStoreBatch(context.Background(), tID, tTitle, tDomain, tFam, tTier, []string{})
	}(topic.ID, topic.Title, topic.Domain, topic.FamiliarityLevel, topic.CurrentTier)

	return topic, nil
}

func (s *topicService) ListTopics(ctx context.Context, userID uuid.UUID) ([]models.Topic, error) {
	return s.repo.ListTopics(ctx, userID)
}

func (s *topicService) GetTopic(ctx context.Context, topicID, userID string) (models.Topic, error) {
	return s.repo.GetTopic(ctx, topicID, userID)
}
