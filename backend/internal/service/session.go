package service

import (
	"context"
	"errors"
	"strings"

	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/acerowl/lockin/backend/internal/repository"
	"github.com/google/uuid"
)

type SessionService interface {
	StartSession(ctx context.Context, topicID, userID uuid.UUID) (uuid.UUID, []models.Question, error)
	SubmitAnswer(ctx context.Context, sessionID, questionID, selectedAnswer string) (bool, string, string, error)
	CompleteSession(ctx context.Context, sessionID string) error
}

type sessionService struct {
	repo repository.SessionRepository
}

func NewSessionService(r repository.SessionRepository) SessionService {
	return &sessionService{repo: r}
}

func (s *sessionService) StartSession(ctx context.Context, topicID, userID uuid.UUID) (uuid.UUID, []models.Question, error) {
	questions, err := s.repo.GetUnansweredQuestions(ctx, topicID, 10)
	if err != nil {
		return uuid.Nil, nil, err
	}

	if len(questions) == 0 {
		return uuid.Nil, nil, errors.New("Not enough questions. Generation might be pending.")
	}

	sessionID := uuid.New()
	err = s.repo.CreateSession(ctx, sessionID, userID, topicID)
	if err != nil {
		return uuid.Nil, nil, err
	}

	return sessionID, questions, nil
}

func (s *sessionService) SubmitAnswer(ctx context.Context, sessionID, questionID, selectedAnswer string) (bool, string, string, error) {
	correct, explanation, format, err := s.repo.GetQuestionInfo(ctx, questionID)
	if err != nil {
		return false, "", "", errors.New("Question not found")
	}

	var isCorrect bool
	switch format {
	case "mcq", "true_false":
		isCorrect = correct == selectedAnswer
	default:
		// free-form (text, speech, etc.): credit non-empty submissions
		isCorrect = strings.TrimSpace(selectedAnswer) != ""
	}

	err = s.repo.RecordAnswerAndProgress(ctx, sessionID, questionID, selectedAnswer, isCorrect)
	if err != nil {
		return false, "", "", errors.New("Failed to record answer")
	}

	return isCorrect, correct, explanation, nil
}

func (s *sessionService) CompleteSession(ctx context.Context, sessionID string) error {
	return s.repo.CompleteSession(ctx, sessionID)
}
