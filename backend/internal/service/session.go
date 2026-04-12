package service

import (
	"context"
	"errors"

	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/acerowl/lockin/backend/internal/repository"
	"github.com/google/uuid"
)



type sessionService struct {
	repo repository.SessionRepository
}

func NewSessionService(r repository.SessionRepository) *sessionService {
	return &sessionService{repo: r}
}

func (s *sessionService) StartSession(ctx context.Context, topicID, nodeID, userID uuid.UUID, quizMode string) (uuid.UUID, []models.Question, error) {
	questions, err := s.repo.GetQuestionsByNode(ctx, nodeID, 10)
	if err != nil {
		return uuid.Nil, nil, err
	}

	if len(questions) == 0 {
		return uuid.Nil, nil, errors.New("Not enough questions. Generation might be pending.")
	}

	sessionID := uuid.New()
	err = s.repo.CreateSession(ctx, sessionID, userID, topicID, nodeID, quizMode)
	if err != nil {
		return uuid.Nil, nil, err
	}

	return sessionID, questions, nil
}

func (s *sessionService) CompleteSession(ctx context.Context, sessionID string) error {
	return s.repo.CompleteSession(ctx, sessionID)
}
