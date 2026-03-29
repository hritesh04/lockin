package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	Email           string     `json:"email" db:"email"`
	PasswordHash    string     `json:"-" db:"password_hash"`
	Name            string     `json:"name" db:"name"`
	StreakCount     int        `json:"streakCount" db:"streak_count"`
	LastSessionDate *time.Time `json:"lastSessionDate" db:"last_session_date"`
	VibePreference  string     `json:"vibePreference" db:"vibe_preference"`
	CreatedAt       time.Time  `json:"createdAt" db:"created_at"`
}

type Topic struct {
	ID               uuid.UUID `json:"id" db:"id"`
	UserID           uuid.UUID `json:"userId" db:"user_id"`
	Title            string    `json:"title" db:"title"`
	Domain           string    `json:"domain" db:"domain"`
	FamiliarityLevel string    `json:"familiarityLevel" db:"familiarity_level"`
	CurrentTier      int       `json:"currentTier" db:"current_tier"`
	CreatedAt        time.Time `json:"createdAt" db:"created_at"`
}

type LessonCard struct {
	ID        uuid.UUID `json:"id" db:"id"`
	TopicID   uuid.UUID `json:"topicId" db:"topic_id"`
	Content   string    `json:"content" db:"content"`
	Tier      int       `json:"tier" db:"tier"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
}

type Question struct {
	ID            uuid.UUID   `json:"id" db:"id"`
	TopicID       uuid.UUID   `json:"topicId" db:"topic_id"`
	LessonCardID  *uuid.UUID  `json:"lessonCardId" db:"lesson_card_id"`
	Format        string      `json:"format" db:"format"`
	Content       string      `json:"content" db:"content"`
	Options       interface{} `json:"options" db:"options"` // JSONB mapped to interface{}
	Answer        string      `json:"answer" db:"answer"`
	Explanation   string      `json:"explanation" db:"explanation"`
	Tier          int         `json:"tier" db:"tier"`
	ConceptTags   []string    `json:"conceptTags" db:"concept_tags"`
	TimesAnswered int         `json:"timesAnswered" db:"times_answered"`
	TimesCorrect  int         `json:"timesCorrect" db:"times_correct"`
	CreatedAt     time.Time   `json:"createdAt" db:"created_at"`
}

type Session struct {
	ID                uuid.UUID  `json:"id" db:"id"`
	UserID            uuid.UUID  `json:"userId" db:"user_id"`
	TopicID           uuid.UUID  `json:"topicId" db:"topic_id"`
	StartedAt         time.Time  `json:"startedAt" db:"started_at"`
	CompletedAt       *time.Time `json:"completedAt" db:"completed_at"`
	Score             int        `json:"score" db:"score"`
	QuestionsAnswered int        `json:"questionsAnswered" db:"questions_answered"`
}

type SessionAnswer struct {
	ID             uuid.UUID `json:"id" db:"id"`
	SessionID      uuid.UUID `json:"sessionId" db:"session_id"`
	QuestionID     uuid.UUID `json:"questionId" db:"question_id"`
	SelectedAnswer string    `json:"selectedAnswer" db:"selected_answer"`
	IsCorrect      bool      `json:"isCorrect" db:"is_correct"`
	AnsweredAt     time.Time `json:"answeredAt" db:"answered_at"`
}
