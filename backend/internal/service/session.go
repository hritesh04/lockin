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

type AiQuestionGenerator interface {
	GenerateTopicQuestions(ctx context.Context, topic string, tier int, remark string, quizMode string, weakConcepts []string) ([]models.Question, error)
	EvaluateTopicSession(ctx context.Context, topic string, tier int, remark string, answers string) (int, string, error)
	SocraticFollowUp(ctx context.Context, topic string, tier int, question string, userAnswer string) (models.SocraticFollowUp, error)
}

type SessionRepository interface {
	GetQuestionsByLesson(ctx context.Context, lessonID uuid.UUID, limit int) ([]models.Question, error)
	CreateSession(ctx context.Context, sessionID, userID, topicID uuid.UUID, lessonID *uuid.UUID, quizMode string) error
	GetQuestion(ctx context.Context, questionID string) (*models.Question, error)
	CompleteSession(ctx context.Context, sessionID string) error
	GetUserActivity(ctx context.Context, userID uuid.UUID) ([]repository.UserSessionActivity, error)
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

func (s *sessionService) StartSession(ctx context.Context, topicID uuid.UUID, lessonID *uuid.UUID, userID uuid.UUID, quizMode string, interleave bool) (uuid.UUID, []models.Question, error) {
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

		// Interleaved ("Mixed Review") sessions mix question types across tiers by
		// generating with no mode restriction, then inject due review cards from
		// other topics to break blocked practice.
		if interleave {
			quizMode = ""
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

		questions, err = s.ai.GenerateTopicQuestions(ctx, topic.Title, topic.Tier, remark, quizMode, weak)
		if err != nil {
			return uuid.Nil, nil, err
		}

		if interleave {
			injected, err := s.reviewRepo.ListDueExcludingTopic(ctx, userID, &topicID, 5)
			if err != nil {
				return uuid.Nil, nil, err
			}
			questions = append(questions, reviewCardsToQuestions(injected)...)
		}
	}

	sessionID := uuid.New()
	err = s.repo.CreateSession(ctx, sessionID, userID, topicID, lessonID, quizMode)
	if err != nil {
		return uuid.Nil, nil, err
	}

	return sessionID, questions, nil
}

// reviewCardsToQuestions converts due review cards into session questions so an
// interleaved session can mix in material from other topics. They use fill_blank
// semantics (free-text recall, no Socratic follow-up).
func reviewCardsToQuestions(cards []models.ReviewCard) []models.Question {
	out := make([]models.Question, 0, len(cards))
	for i, c := range cards {
		answer := c.Answer
		out = append(out, models.Question{
			ID:          c.ID,
			Type:        models.FillBlank,
			Index:       i + 1,
			Question:    c.Prompt,
			Answer:      &answer,
			Explanation: c.Answer,
			ConceptTags: c.ConceptTags,
		})
	}
	return out
}

func (s *sessionService) CompleteSession(ctx context.Context, sessionID string, answers string, topicID string, userID string) error {
	sid, err := uuid.Parse(sessionID)
	if err != nil {
		return errors.New("invalid session id")
	}
	session, err := s.repo.GetSessionByID(ctx, sid)
	if err != nil {
		return errors.New("session not found")
	}
	if session.UserID != userID {
		return errors.New("session not found")
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

	// Update Streak logic based on daily commitment goal
	user, err := s.userRepo.GetUserByID(ctx, userID)
	if err == nil && user.DailyCommitment != nil && *user.DailyCommitment > 0 {
		now := time.Now()
		goalSeconds := *user.DailyCommitment * 60

		// Get activity for the last 365 days to calculate streak
		parsedID, err := uuid.Parse(userID)
		if err != nil {
			return err
		}
		activity, err := s.repo.GetUserActivity(ctx, parsedID)
		if err == nil {
			newCurrent, newLongest := computeStreakWithCommitment(activity, goalSeconds, now, user.LongestStreak)
			_ = s.userRepo.UpdateStreak(ctx, userID, newCurrent, newLongest, now)
		}
	} else if err == nil {
		// Fallback to old logic if no daily commitment set
		now := time.Now()
		newCurrent, newLongest := computeLegacyStreak(now, user.LastSessionDate, user.CurrentStreak, user.LongestStreak)
		_ = s.userRepo.UpdateStreak(ctx, userID, newCurrent, newLongest, now)
	}

	// Auto-enqueue answered questions into the spaced-repetition review queue.
	if err := s.enqueueAnswers(ctx, sessionID, userID, answers); err != nil {
		return err
	}

	return s.repo.CompleteSession(ctx, sessionID)
}

func computeStreakWithCommitment(activity []repository.UserSessionActivity, goalSeconds int, now time.Time, currentLongest int) (int, int) {
	dailyTime := make(map[string]int)
	for _, r := range activity {
		if r.CompletedAt != nil {
			day := r.CreatedAt.Format("2006-01-02")
			duration := int(r.CompletedAt.Sub(r.CreatedAt).Seconds())
			if duration > 0 {
				dailyTime[day] += duration
			}
		}
	}

	// Current streak: consecutive days from today backwards meeting the goal.
	newCurrent := 0
	today := now.UTC().Truncate(24 * time.Hour)
	for i := 0; i < 365; i++ {
		checkDate := today.AddDate(0, 0, -i)
		dateStr := checkDate.Format("2006-01-02")
		timeSec := dailyTime[dateStr]
		if timeSec >= goalSeconds {
			newCurrent++
		} else {
			break
		}
	}

	// Longest streak: run of consecutive qualifying days anywhere in history.
	newLongest := currentLongest
	tempStreak := 0
	dates := make([]string, 0, len(dailyTime))
	for d := range dailyTime {
		dates = append(dates, d)
	}
	sort.Strings(dates)
	for _, dateStr := range dates {
		if dailyTime[dateStr] >= goalSeconds {
			tempStreak++
			if tempStreak > newLongest {
				newLongest = tempStreak
			}
		} else {
			tempStreak = 0
		}
	}
	return newCurrent, newLongest
}

func computeLegacyStreak(now time.Time, lastSessionDate *time.Time, currentStreak, longestStreak int) (int, int) {
	if lastSessionDate == nil {
		return 1, 1
	}

	lastDate := lastSessionDate.UTC().Truncate(24 * time.Hour)
	today := now.UTC().Truncate(24 * time.Hour)
	diff := today.Sub(lastDate).Hours()

	newCurrent := currentStreak
	newLongest := longestStreak
	switch {
	case diff == 24:
		// Consecutive day
		newCurrent++
		if newCurrent > newLongest {
			newLongest = newCurrent
		}
	case diff >= 48:
		// Gap detected
		newCurrent = 1
	}
	// If same day (diff == 0), don't increment
	return newCurrent, newLongest
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
