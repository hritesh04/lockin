package service

import (
	"context"
	"fmt"
	"log"

	"github.com/acerowl/lockin/backend/internal/ai"
	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/google/uuid"
)

// AIGenerator defines the behavior required for AI operations
type AIGenerator interface {
	GenerateRoadmap(ctx context.Context, id string, title string, proficiency string) error
	EvaluateTopicAssessment(ctx context.Context, topic string, answers string) (ai.TopicEvaluationAIResponse, error)
}

type TopicRepository interface {
	UpdateTierAndRemark(ctx context.Context, topicID string, tier int, remark string) error
	UpdateStatus(ctx context.Context, id, status string) error
	Create(ctx context.Context, topic models.Topic) error
	GetAll(ctx context.Context, userID uuid.UUID) ([]models.Topic, error)
	GetByID(ctx context.Context, topicID, userID string) (models.Topic, error)
	IsUserTopic(ctx context.Context, userID, topicID string) bool
	GetRoadmap(ctx context.Context, topicID, userID string) (*models.TopicRoadmap, error)
}

type topicService struct {
	repo  TopicRepository
	aiGen AIGenerator
}

func NewTopicService(r TopicRepository, aiGen AIGenerator) *topicService {
	return &topicService{repo: r, aiGen: aiGen}
}

// familiarityToTier maps the familiarity level to an initial tier value.
// The tier will be updated by AI after roadmap/quiz generation.
func familiarityToTier(level string) int {
	switch level {
	case "beginner":
		return 1
	case "intermediate":
		return 4
	case "advanced":
		return 7
	default:
		return 1
	}
}

func (s *topicService) CreateTopic(ctx context.Context, userID string, title string, familiarityLevel string) (models.Topic, error) {
	tier := familiarityToTier(familiarityLevel)

	topic := models.Topic{
		ID:     uuid.NewString(),
		UserID: userID,
		Title:  title,
		Tier:   tier,
		Status: "generating",
	}

	err := s.repo.Create(ctx, topic)
	if err != nil {
		return models.Topic{}, err
	}
	go s.aiGen.GenerateRoadmap(ctx, topic.ID, title, familiarityLevel)
	return topic, nil
}

func (s *topicService) ListTopics(ctx context.Context, userID uuid.UUID) ([]models.Topic, error) {
	return s.repo.GetAll(ctx, userID)
}

func (s *topicService) GetTopic(ctx context.Context, topicID, userID string) (models.Topic, error) {
	topic, err := s.repo.GetByID(ctx, topicID, userID)
	if err != nil {
		return models.Topic{}, err
	}
	return topic, nil
}

func (s *topicService) GetRoadmap(ctx context.Context, topicID, userID string) (*models.TopicRoadmap, error) {
	if userTopic := s.repo.IsUserTopic(ctx, userID, topicID); !userTopic {
		return nil, fmt.Errorf("invalid topic id")
	}
	roadmap, err := s.repo.GetRoadmap(ctx, topicID, userID)
	if err != nil {
		log.Println("Error fetching roadmap:",err)
		return nil, err
	}
	return roadmap, nil
}

func (s *topicService) EvaluateAssessmentAndCreateTopic(ctx context.Context,userID string, topic string,resposne string) (models.Topic, error) {
	evaluation, err := s.aiGen.EvaluateTopicAssessment(ctx,topic,resposne)
	if err != nil {
		return models.Topic{}, err
	}

	newTopic := models.Topic{
		ID:     uuid.NewString(),
		UserID: userID,
		Title:  topic,
		Tier:   evaluation.NewTier,
		Remark: &evaluation.NewRemark,
		Status: "generating",
	}

	if err := s.repo.Create(ctx, newTopic);err != nil {
		return models.Topic{}, err
	}
	go s.aiGen.GenerateRoadmap(ctx, newTopic.ID, topic, fmt.Sprintf("%s - TIER: %d",evaluation.NewRemark,evaluation.NewTier))
	return newTopic, nil
}