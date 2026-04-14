package models

import (
	"time"
)

type QuestionType string

const (
	MCQ       QuestionType = "mcq"
	TrueFalse QuestionType = "true_false"
	FillBlank QuestionType = "fill_blank"
	Speech    QuestionType = "speech"
)

type Status string

const (
	StatusLocked     Status = "locked"
	StatusInProgress Status = "in-progress"
	StatusCompleted  Status = "completed"
)

type QuizMode string

const (
	QuizModeMCQ    QuizMode = "mcq"
	QuizModeText   QuizMode = "text"
	QuizModeSpeech QuizMode = "speech"
	QuizModeMixed  QuizMode = "mixed"
)

type Roadmap struct {
	Modules []Module `json:"modules"`
}

type ProgressUpdate struct {
	UpdatedLessons []Lesson `json:"updatedLessons"`
	UpdatedModules []Module `json:"updatedModules"`
}

type TopicRoadmap struct {
	ID                string   `json:"id"`
	Title             string   `json:"title"`
	Tier              int      `json:"tier"`
	SessionsCompleted int      `json:"sessionsCompleted"`
	TotalTimeSeconds  float64      `json:"totalTimeSeconds"`
	Modules           []Module `json:"modules"`
}

type Module struct {
	ID           string       `json:"id" db:"id"`
	TopicID      string       `json:"topicId" db:"topic_id"`
	ParentNodeID *string      `json:"parentNodeId,omitempty" db:"parent_node_id"`
	Index        int          `json:"index" db:"index"`
	Title        string       `json:"title" db:"title"`
	Description  string       `json:"description" db:"description"`
	Status       Status `json:"status" db:"status"`
	ConceptTags  []string     `json:"concept_tags" db:"concept_tags"`
	Lessons      []Lesson     `json:"lessons,omitempty"`
	CreatedAt    time.Time    `json:"createdAt" db:"created_at"`
}

type Lesson struct {
	ID        string    `json:"id" db:"id"`
	NodeID    string    `json:"nodeId" db:"node_id"`
	Index     int       `json:"index" db:"index"`
	Title     string    `json:"title" db:"title"`
	Description string    `json:"description" db:"description"`
	Content   string    `json:"content" db:"content"`
	Status    Status    `json:"status" db:"status"`
	Quizzes   []Question `json:"quizzes,omitempty"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
}

type Question struct {
	ID          string       `json:"id" db:"id"`
	NodeID      string       `json:"nodeId" db:"node_id"`
	LessonID    *string      `json:"lessonId,omitempty" db:"lesson_id"`
	Index       int          `json:"index" db:"index"`
	Type        QuestionType `json:"type" db:"type"`
	Question    string       `json:"question" db:"question"`
	Answer      *string      `json:"answer,omitempty" db:"answer"`
	Explanation string       `json:"explanation" db:"explanation"`
	Options     []Option     `json:"options,omitempty"`
	CreatedAt   time.Time    `json:"createdAt" db:"created_at"`
}

type Option struct {
	ID           string `json:"id" db:"id"`
	QuestionID   string `json:"questionId" db:"question_id"`
	Index        int    `json:"index" db:"index"`
	Label        string `json:"label" db:"label"`
	Explanation  string `json:"explanation" db:"explanation"`
	IsCorrect    bool   `json:"is_correct" db:"is_correct"`
}

type User struct {
	ID              string     `json:"id" db:"id"`
	Email           string     `json:"email" db:"email"`
	PasswordHash    string     `json:"-" db:"password_hash"`
	CurrentStreak   int        `json:"currentStreak" db:"current_streak"`
	LongestStreak   int        `json:"longestStreak" db:"longest_streak"`
	LastSessionDate *time.Time `json:"lastSessionDate,omitempty" db:"last_session_date"`
	RefreshToken    *string    `json:"-" db:"refresh_token"`
	CreatedAt       time.Time  `json:"createdAt" db:"created_at"`
	DeletedAt       *time.Time `json:"deletedAt,omitempty" db:"deleted_at"`
}

type Topic struct {
	ID        string     `json:"id" db:"id"`
	UserID    string     `json:"userId" db:"user_id"`
	Title     string     `json:"title" db:"title"`
	Tier      int        `json:"tier" db:"tier"`
	Status    string     `json:"status" db:"status"`
	Remark    *string    `json:"remark,omitempty" db:"remark"`
	CreatedAt time.Time  `json:"createdAt" db:"created_at"`
	DeletedAt *time.Time `json:"deletedAt,omitempty" db:"deleted_at"`
}

type Session struct {
	ID          string     `json:"id" db:"id"`
	UserID      string     `json:"userId" db:"user_id"`
	TopicID     string     `json:"topicId" db:"topic_id"`
	LessonID    string     `json:"lessonId" db:"lesson_id"`
	QuizMode    QuizMode   `json:"quizMode" db:"quiz_mode"`
	CreatedAt   time.Time  `json:"createdAt" db:"created_at"`
	CompletedAt *time.Time `json:"completedAt,omitempty" db:"completed_at"`
}
