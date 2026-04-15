package handlers

import (
	"context"

	"github.com/acerowl/lockin/backend/internal/ai"
	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/google/uuid"
)

type ModuleService interface {
	UpdateStatus(ctx context.Context, moduleID string, status string) (*models.Module, error)
	GetByID(ctx context.Context, moduleID string) (*models.Module, error)
	UpdateByTopicID(ctx context.Context, topicID string, index int, status string) (*models.Module, error)
}

type LessonService interface {
	Progress(ctx context.Context, lessonID string) (*models.ProgressUpdate, error)
}

type AuthService interface {
	Register(ctx context.Context, email, password string) (string, string, models.User, error)
	Login(ctx context.Context, email, password string) (string, string, error)
	RefreshToken(ctx context.Context, refreshToken string) (string, string, error)
	GetMe(ctx context.Context, userID string) (models.User, error)
	ForgotPassword(ctx context.Context, email string) error
}

type TopicService interface {
	CreateTopic(ctx context.Context, userID string, title string, familiarityLevel string) (models.Topic, error)
	ListTopics(ctx context.Context, userID uuid.UUID) ([]models.Topic, error)
	GetTopic(ctx context.Context, topicID, userID string) (models.Topic, error)
	GetRoadmap(ctx context.Context, topicID, userID string) (*models.TopicRoadmap, error)
	EvaluateAssessmentAndCreateTopic(ctx context.Context, userID string, topic string, answers string) (models.Topic, error)
}

type SessionService interface {
	StartSession(ctx context.Context, topicID uuid.UUID, lessonID *uuid.UUID, userID uuid.UUID, quizMode string) (uuid.UUID, []models.Question, error)
	CompleteSession(ctx context.Context, sessionID string, answers string, topicID string, userID string) error
	GetUserActivity(ctx context.Context, userID uuid.UUID) ([]UserActivityData, error)
}

type AIService interface {
	GenerateTopicAssessment(ctx context.Context, topic string, proficiency string) (ai.TopicSessionAIResponse, error)
}

type APIHandler struct {
	AI AIService
	Auth    AuthService
	Topic   TopicService
	Session SessionService
	Module  ModuleService
	Lesson  LessonService
}

func NewAPIHandler(aiGen AIService, auth AuthService, topic TopicService, module ModuleService, lesson LessonService, session SessionService) *APIHandler {
	return &APIHandler{AI:aiGen, Auth: auth, Topic: topic, Session: session, Module: module, Lesson: lesson}
}
