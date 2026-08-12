package service

import (
	"context"
	"encoding/json"
	"errors"
	"sort"
	"strings"
	"time"

	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/acerowl/lockin/backend/internal/repository"
	"github.com/google/uuid"
)

var (
	// ErrInvalidSessionID is returned when a session id is not a valid UUID.
	ErrInvalidSessionID = errors.New("invalid session id")
	// ErrSessionNotFound is returned when no session matches the id.
	ErrSessionNotFound = errors.New("session not found")
	// ErrInvalidUserID is returned when a user id is not a valid UUID.
	ErrInvalidUserID = errors.New("invalid user id")
	// ErrInvalidTopicID is returned when a topic id is not a valid UUID.
	ErrInvalidTopicID = errors.New("invalid topic_id")
)

type AiQuestionGenerator interface {
	GenerateTopicQuestions(ctx context.Context, topic string, tier int, remark string, quizMode string, weakConcepts []string, content string) ([]models.Question, error)
	EvaluateTopicSession(ctx context.Context, topic string, tier int, remark string, answers string) (int, string, error)
	SocraticFollowUp(ctx context.Context, topic string, tier int, question string, userAnswer string) (models.SocraticFollowUp, error)
}

type SessionRepository interface {
	GetQuestionsByLesson(ctx context.Context, lessonID uuid.UUID, limit int) ([]models.Question, error)
	CreateSession(ctx context.Context, sessionID, userID, topicID uuid.UUID, lessonID *uuid.UUID, quizMode string) error
	GetQuestion(ctx context.Context, questionID string) (*models.Question, error)
	CompleteSession(ctx context.Context, sessionID string) error
	GetUserActivity(ctx context.Context, userID uuid.UUID) ([]repository.UserSessionActivity, error)
	GetTodayStudySeconds(ctx context.Context, userID uuid.UUID, dayStart, dayEnd time.Time) (int, error)
	GetSessionByID(ctx context.Context, sessionID uuid.UUID) (models.Session, error)
	IsUserLesson(ctx context.Context, lessonID uuid.UUID, userID uuid.UUID) bool
}

type sessionService struct {
	repo       SessionRepository
	userRepo   UserRepository
	topicRepo  TopicRepository     // Using the exported interface
	ai         AiQuestionGenerator // Using the interface for better testability
	reviewRepo ReviewRepository
}

func NewSessionService(r SessionRepository, tr TopicRepository, ur UserRepository, a AiQuestionGenerator, rr ReviewRepository) *sessionService {
	return &sessionService{repo: r, topicRepo: tr, userRepo: ur, ai: a, reviewRepo: rr}
}

func (s *sessionService) StartSession(ctx context.Context, topicID uuid.UUID, lessonID *uuid.UUID, userID uuid.UUID, quizMode string) (uuid.UUID, []models.Question, error) {
	var questions []models.Question
	var err error

	if lessonID != nil {
		if !s.repo.IsUserLesson(ctx, *lessonID, userID) {
			return uuid.Nil, nil, errors.New("lesson not found")
		}
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

		// Adaptive difficulty: surface the user's weakest reviewed concepts so the
		// generator can weight more questions toward them.
		weak := []string{}
		if s.reviewRepo != nil {
			if weakConcepts, err := s.reviewRepo.ListWeakConcepts(ctx, userID, 5); err == nil {
				for _, wc := range weakConcepts {
					if wc.Concept != "" {
						weak = append(weak, wc.Concept)
					}
				}
			}
		}

		// Scope questions to the lessons the user has actually studied
		// (completed or in-progress). Best-effort: if the roadmap isn't ready,
		// fall back to an unscoped generation rather than failing the session.
		content := ""
		if roadmap, err := s.topicRepo.GetRoadmap(ctx, topicID.String(), userID.String()); err == nil {
			content = buildReachableLessonDigest(roadmap)
		}

		questions, err = s.ai.GenerateTopicQuestions(ctx, topic.Title, topic.Tier, remark, quizMode, weak, content)
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
	sid, err := uuid.Parse(sessionID)
	if err != nil {
		return ErrInvalidSessionID
	}
	session, err := s.repo.GetSessionByID(ctx, sid)
	if err != nil {
		return ErrSessionNotFound
	}
	if session.UserID != userID {
		return ErrSessionNotFound
	}

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

	if err := s.repo.CompleteSession(ctx, sessionID); err != nil {
		return err
	}

	// Update streak after the session is marked complete so today's qualifying
	// time includes the session that just finished.
	s.updateStreak(ctx, userID)
	return nil
}

// updateStreak advances the streak once today qualifies: cumulative study time
// meets the daily commitment goal, or any completed session when no goal is
// set. The streak is left untouched otherwise; the UI reports an expired
// streak (0) at read time once a whole qualifying day is skipped.
func (s *sessionService) updateStreak(ctx context.Context, userID string) {
	user, err := s.userRepo.GetUserByID(ctx, userID)
	if err != nil {
		return
	}

	now := time.Now()
	todayStart := now.UTC().Truncate(24 * time.Hour)

	qualifies := true
	if user.DailyCommitment != nil && *user.DailyCommitment > 0 {
		goalSeconds := *user.DailyCommitment * 60
		parsedID, err := uuid.Parse(userID)
		if err != nil {
			return
		}
		todaySeconds, err := s.repo.GetTodayStudySeconds(ctx, parsedID, todayStart, todayStart.AddDate(0, 0, 1))
		if err != nil {
			return
		}
		qualifies = todaySeconds >= goalSeconds
	}

	if !qualifies {
		return
	}

	newCurrent, newLongest := computeIncrementalStreak(now, user.StreakDate, user.CurrentStreak, user.LongestStreak)
	_ = s.userRepo.UpdateStreak(ctx, userID, newCurrent, newLongest, now, &todayStart)
}

// computeIncrementalStreak updates the streak based on the last qualifying day.
// A day qualifies when its cumulative study time meets the daily commitment
// goal. The streak is only advanced once a day qualifies; a skipped qualifying
// day (gap) resets the current streak to 1 on the next qualifying day.
func computeIncrementalStreak(now time.Time, streakDate *time.Time, currentStreak, longestStreak int) (int, int) {
	if streakDate == nil {
		newLongest := longestStreak
		if newLongest < 1 {
			newLongest = 1
		}
		return 1, newLongest
	}

	lastDate := streakDate.UTC().Truncate(24 * time.Hour)
	today := now.UTC().Truncate(24 * time.Hour)

	newCurrent := currentStreak
	newLongest := longestStreak
	switch {
	case lastDate.Equal(today):
		// Today already counted, don't double-increment.
	case lastDate.Equal(today.AddDate(0, 0, -1)):
		// Consecutive qualifying day.
		newCurrent++
		if newCurrent > newLongest {
			newLongest = newCurrent
		}
	default:
		// Gap detected: streak broken, restart at 1.
		newCurrent = 1
	}
	return newCurrent, newLongest
}

// expiredCurrentStreak returns 0 once a whole qualifying day has been skipped,
// otherwise the stored current streak (which may still be mid-day pending).
func expiredCurrentStreak(streakDate *time.Time, currentStreak int, now time.Time) int {
	if streakDate == nil {
		return currentStreak
	}
	lastDate := streakDate.UTC().Truncate(24 * time.Hour)
	today := now.UTC().Truncate(24 * time.Hour)
	if lastDate.Before(today.AddDate(0, 0, -1)) {
		return 0
	}
	return currentStreak
}

// SocraticFollowUp generates a conceptual "Why?" follow-up for a free-text answer.
// It resolves the session to its topic, then asks the LLM to both probe and coach.
func (s *sessionService) SocraticFollowUp(ctx context.Context, sessionID, questionID, answer, userID string) (models.SocraticFollowUp, error) {
	var empty models.SocraticFollowUp

	sid, err := uuid.Parse(sessionID)
	if err != nil {
		return empty, errors.New("invalid session id")
	}
	session, err := s.repo.GetSessionByID(ctx, sid)
	if err != nil {
		return empty, err
	}
	if session.UserID != userID {
		return empty, errors.New("session does not belong to user")
	}

	question, err := s.repo.GetQuestion(ctx, questionID)
	if err != nil {
		return empty, err
	}

	if session.TopicID != "" {
		topic, err := s.topicRepo.GetByID(ctx, session.TopicID, userID)
		if err != nil {
			return empty, err
		}
		return s.ai.SocraticFollowUp(ctx, topic.Title, topic.Tier, question.Question, answer)
	}

	return s.ai.SocraticFollowUp(ctx, "", 1, question.Question, answer)
}

type sessionAnswerEntry struct {
	Question models.Question `json:"question"`
	Answer   string          `json:"answer"`
}

// enqueueAnswers converts answered questions into review cards. MCQ/T-F cards use the
// correct option + explanation as the back; free-text cards use the model answer.
func (s *sessionService) enqueueAnswers(ctx context.Context, sessionID, userID, answers string) error {
	if answers == "" || s.reviewRepo == nil {
		return nil
	}

	sid, err := uuid.Parse(sessionID)
	if err != nil {
		return nil
	}
	session, err := s.repo.GetSessionByID(ctx, sid)
	if err != nil {
		// Not having a session row should not block completion.
		return nil
	}

	var entries []sessionAnswerEntry
	if err := json.Unmarshal([]byte(answers), &entries); err != nil {
		// Never fail the session because card parsing failed; log and move on.
		return nil
	}

	lessonID := session.LessonID
	for _, e := range entries {
		card := s.buildCardFromAnswer(userID, session.TopicID, lessonID, e.Question)
		if card == nil {
			continue
		}
		if err := s.reviewRepo.UpsertFromSession(ctx, *card); err != nil {
			return err
		}
	}
	return nil
}

func (s *sessionService) buildCardFromAnswer(userID, topicID string, sessionLessonID string, q models.Question) *models.ReviewCard {
	prompt := strings.TrimSpace(q.Question)
	if prompt == "" {
		return nil
	}

	var back string
	switch q.Type {
	case models.MCQ, models.TrueFalse:
		back = correctOptionAnswer(q)
	case models.FillBlank, models.ShortAnswer:
		if q.Answer != nil && strings.TrimSpace(*q.Answer) != "" {
			back = *q.Answer
		} else {
			back = q.Explanation
		}
	default:
		back = q.Explanation
	}
	back = strings.TrimSpace(back)
	if back == "" {
		return nil
	}

	lesson := sessionLessonID
	if q.LessonID != nil && *q.LessonID != "" {
		lesson = *q.LessonID
	}

	now := time.Now()
	return &models.ReviewCard{
		ID:               uuid.NewString(),
		UserID:           userID,
		TopicID:          topicID,
		LessonID:         stringPtr(lesson),
		SourceQuestionID: &q.ID,
		Prompt:           prompt,
		Answer:           back,
		ConceptTags:      []string{},
		EaseFactor:       2.5,
		IntervalDays:     0,
		Repetitions:      0,
		Lapses:           0,
		LastResult:       0,
		DueAt:            now,
		CreatedAt:        now,
	}
}

func stringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func correctOptionAnswer(q models.Question) string {
	for _, o := range q.Options {
		if o.IsCorrect {
			if strings.TrimSpace(o.Explanation) != "" {
				return strings.TrimSpace(o.Label) + ". " + strings.TrimSpace(o.Explanation)
			}
			return strings.TrimSpace(o.Label)
		}
	}
	return ""
}

// StartReviewSession creates a session row for a spaced-repetition review so the
// review counts toward the user's activity and streak. It returns the new session id.
func (s *sessionService) StartReviewSession(ctx context.Context, userID, topicID string, lessonID *string) (uuid.UUID, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return uuid.Nil, ErrInvalidUserID
	}
	tid, err := uuid.Parse(topicID)
	if err != nil {
		return uuid.Nil, ErrInvalidTopicID
	}

	var lid *uuid.UUID
	if lessonID != nil && *lessonID != "" {
		if parsed, err := uuid.Parse(*lessonID); err == nil {
			lid = &parsed
		}
	}

	sessionID := uuid.New()
	if err := s.repo.CreateSession(ctx, sessionID, uid, tid, lid, "review"); err != nil {
		return uuid.Nil, err
	}
	return sessionID, nil
}

func (s *sessionService) GetUserActivity(ctx context.Context, userID uuid.UUID) ([]models.UserActivityData, error) {
	raw, err := s.repo.GetUserActivity(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Group by day
	dailyMap := make(map[string]*models.UserActivityData)
	var days []string

	for _, r := range raw {
		day := r.CreatedAt.Format("2006-01-02")
		if _, ok := dailyMap[day]; !ok {
			dailyMap[day] = &models.UserActivityData{
				Day:     day,
				Lessons: []models.LessonActivity{},
				Quizes:  []models.QuizActivity{},
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
			dayEntry.Lessons = append(dayEntry.Lessons, models.LessonActivity{
				Title:       r.LessonTitle,
				TopicName:   r.TopicTitle,
				CreatedAt:   r.CreatedAt.Format(time.RFC3339),
				CompletedAt: formatTime(r.CompletedAt),
			})
		} else {
			dayEntry.Quizes = append(dayEntry.Quizes, models.QuizActivity{
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

	result := []models.UserActivityData{}
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
