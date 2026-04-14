package service

import (
	"context"
	"errors"
	"sort"
	"time"

	"github.com/acerowl/lockin/backend/internal/handlers"
	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/acerowl/lockin/backend/internal/repository"
	"github.com/google/uuid"
)

type AiQuestionGenerator interface {
	GenerateTopicQuestions(ctx context.Context, topic string, tier int, remark string, quizMode string) ([]models.Question, error)
	EvaluateTopicSession(ctx context.Context, topic string, tier int, remark string, answers string) (int, string, error)
}


type SessionRepository interface {
	GetQuestionsByLesson(ctx context.Context, lessonID uuid.UUID, limit int) ([]models.Question, error)
	CreateSession(ctx context.Context, sessionID, userID, topicID uuid.UUID, lessonID *uuid.UUID, quizMode string) error
	GetQuestionInfo(ctx context.Context, questionID string) (correctAnswer, explanation, qType string, err error)
	CompleteSession(ctx context.Context, sessionID string) error
	GetUserActivity(ctx context.Context, userID uuid.UUID) ([]repository.UserSessionActivity, error)
}

type sessionService struct {
	repo       SessionRepository
	userRepo   UserRepository
	topicRepo  TopicRepository // Using the exported interface
	ai         AiQuestionGenerator        // Using the interface for better testability
}

func NewSessionService(r SessionRepository, tr TopicRepository, ur UserRepository, a AiQuestionGenerator) *sessionService {
	return &sessionService{repo: r, topicRepo: tr, userRepo: ur, ai: a}
}

func (s *sessionService) StartSession(ctx context.Context, topicID uuid.UUID, lessonID *uuid.UUID, userID uuid.UUID, quizMode string) (uuid.UUID, []models.Question, error) {
	var questions []models.Question
	var err error

	if lessonID != nil {
		// Lesson-based session
		questions, err = s.repo.GetQuestionsByLesson(ctx, *lessonID, 10)
		if err != nil {
			return uuid.Nil, nil, err
		}
		if len(questions) == 0 {
			return uuid.Nil, nil, errors.New("Not enough questions. Generation might be pending.")
		}
	} else {
		// Topic-based session
		topic, err := s.topicRepo.GetByID(ctx, topicID.String(), userID.String())
		if err != nil {
			return uuid.Nil, nil, err
		}
		
		remark := ""
		if topic.Remark != nil {
			remark = *topic.Remark
		}

		questions, err = s.ai.GenerateTopicQuestions(ctx, topic.Title, topic.Tier, remark, quizMode)
		if err != nil {
			return uuid.Nil, nil, err
		}
	}

	sessionID := uuid.New()
	err = s.repo.CreateSession(ctx, sessionID, userID, topicID, lessonID, quizMode)
	if err != nil {
		return uuid.Nil, nil, err
	}

	return sessionID, questions, nil
}

func (s *sessionService) CompleteSession(ctx context.Context, sessionID string, answers string, topicID string, userID string) error {
	// If answers is provided, it's a topic-based evaluation
	if answers != "" && topicID != "" {
		topic, err := s.topicRepo.GetByID(ctx, topicID, userID)
		if err != nil {
			return err
		}

		remark := ""
		if topic.Remark != nil {
			remark = *topic.Remark
		}

		newTier, newRemark, err := s.ai.EvaluateTopicSession(ctx, topic.Title, topic.Tier, remark, answers)
		if err != nil {
			return err
		}

		err = s.topicRepo.UpdateTierAndRemark(ctx, topicID, newTier, newRemark)
		if err != nil {
			return err
		}
	}

	// Update Streak logic
	user, err := s.userRepo.GetUserByID(ctx, userID)
	if err == nil {
		now := time.Now()
		newCurrent := user.CurrentStreak
		newLongest := user.LongestStreak

		if user.LastSessionDate == nil {
			newCurrent = 1
			newLongest = 1
		} else {
			lastDate := user.LastSessionDate.UTC().Truncate(24 * time.Hour)
			today := now.UTC().Truncate(24 * time.Hour)
			diff := today.Sub(lastDate).Hours()

			if diff == 24 {
				// Consecutive day
				newCurrent++
				if newCurrent > newLongest {
					newLongest = newCurrent
				}
			} else if diff >= 48 {
				// Gap detected
				newCurrent = 1
			}
			// If same day (diff == 0), don't increment
		}
		_ = s.userRepo.UpdateStreak(ctx, userID, newCurrent, newLongest, now)
	}

	return s.repo.CompleteSession(ctx, sessionID)
}

func (s *sessionService) GetUserActivity(ctx context.Context, userID uuid.UUID) ([]handlers.UserActivityData, error) {
	raw, err := s.repo.GetUserActivity(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Group by day
	dailyMap := make(map[string]*handlers.UserActivityData)
	var days []string

	for _, r := range raw {
		day := r.CreatedAt.Format("2006-01-02")
		if _, ok := dailyMap[day]; !ok {
			dailyMap[day] = &handlers.UserActivityData{
				Day:     day,
				Lessons: []handlers.LessonActivity{},
				Quizes:  []handlers.QuizActivity{},
			}
			days = append(days, day)
		}

		dayEntry := dailyMap[day]

		// Time calculation
		if r.CompletedAt != nil {
			duration := int(r.CompletedAt.Sub(r.CreatedAt).Seconds())
			if duration > 0 {
				dayEntry.TotalTime += duration
			}
		}

		if r.LessonID != nil {
			dayEntry.Lessons = append(dayEntry.Lessons, handlers.LessonActivity{
				Title:       r.LessonTitle,
				CreatedAt:   r.CreatedAt.Format(time.RFC3339),
				CompletedAt: formatTime(r.CompletedAt),
			})
		} else {
			dayEntry.Quizes = append(dayEntry.Quizes, handlers.QuizActivity{
				TopicName:   r.TopicTitle,
				CreatedAt:   r.CreatedAt.Format(time.RFC3339),
				CompletedAt: formatTime(r.CompletedAt),
			})
		}
	}

	// Sort days descending
	sort.Slice(days, func(i, j int) bool {
		return days[i] > days[j]
	})

	result := []handlers.UserActivityData{}
	for _, day := range days {
		result = append(result, *dailyMap[day])
	}

	return result, nil
}

func formatTime(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format(time.RFC3339)
}