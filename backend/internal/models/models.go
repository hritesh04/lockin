package models

import (
	"time"
)

type QuestionType string

const (
	MCQ         QuestionType = "mcq"
	TrueFalse   QuestionType = "true_false"
	FillBlank   QuestionType = "fill_blank"
	ShortAnswer QuestionType = "short_answer"
	Speech      QuestionType = "speech"
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
	TotalTimeSeconds  float64  `json:"totalTimeSeconds"`
	Modules           []Module `json:"modules"`
}

type Module struct {
	ID           string    `json:"id" db:"id"`
	TopicID      string    `json:"topicId" db:"topic_id"`
	ParentNodeID *string   `json:"parentNodeId,omitempty" db:"parent_node_id"`
	Index        int       `json:"index" db:"index"`
	Title        string    `json:"title" db:"title"`
	Description  string    `json:"description" db:"description"`
	Status       Status    `json:"status" db:"status"`
	ConceptTags  []string  `json:"concept_tags" db:"concept_tags"`
	Lessons      []Lesson  `json:"lessons,omitempty"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
}

type Lesson struct {
	ID          string     `json:"id" db:"id"`
	NodeID      string     `json:"nodeId" db:"node_id"`
	Index       int        `json:"index" db:"index"`
	Title       string     `json:"title" db:"title"`
	Description string     `json:"description" db:"description"`
	Content     string     `json:"content" db:"content"`
	Status      Status     `json:"status" db:"status"`
	Quizzes     []Question `json:"quizzes,omitempty"`
	CreatedAt   time.Time  `json:"createdAt" db:"created_at"`
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
	ConceptTags []string     `json:"concept_tags,omitempty"`
	Options     []Option     `json:"options,omitempty"`
	CreatedAt   time.Time    `json:"createdAt" db:"created_at"`
}

type Option struct {
	ID          string `json:"id" db:"id"`
	QuestionID  string `json:"questionId" db:"question_id"`
	Index       int    `json:"index" db:"index"`
	Label       string `json:"label" db:"label"`
	Explanation string `json:"explanation" db:"explanation"`
	IsCorrect   bool   `json:"is_correct" db:"is_correct"`
}

type User struct {
	ID                  string     `json:"id" db:"id"`
	Email               string     `json:"email" db:"email"`
	PasswordHash        string     `json:"-" db:"password_hash"`
	CurrentStreak       int        `json:"currentStreak" db:"current_streak"`
	LongestStreak       int        `json:"longestStreak" db:"longest_streak"`
	LastSessionDate     *time.Time `json:"lastSessionDate,omitempty" db:"last_session_date"`
	StreakDate          *time.Time `json:"-" db:"streak_date"`
	Goal                *string    `json:"goal,omitempty" db:"goal"`
	DailyCommitment     *int       `json:"dailyCommitment,omitempty" db:"daily_commitment"`
	OnboardingCompleted bool       `json:"onboardingCompleted" db:"onboarding_completed"`
	RefreshToken        *string    `json:"-" db:"refresh_token"`
	CreatedAt           time.Time  `json:"createdAt" db:"created_at"`
	DeletedAt           *time.Time `json:"deletedAt,omitempty" db:"deleted_at"`
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

type ReviewCard struct {
	ID               string     `json:"id" db:"id"`
	UserID           string     `json:"userId" db:"user_id"`
	TopicID          string     `json:"topicId" db:"topic_id"`
	LessonID         *string    `json:"lessonId,omitempty" db:"lesson_id"`
	SourceQuestionID *string    `json:"sourceQuestionId,omitempty" db:"source_question_id"`
	Prompt           string     `json:"prompt" db:"prompt"`
	Answer           string     `json:"answer" db:"answer"`
	ConceptTags      []string   `json:"concept_tags" db:"concept_tags"`
	EaseFactor       float64    `json:"easeFactor" db:"ease_factor"`
	IntervalDays     int        `json:"intervalDays" db:"interval_days"`
	Repetitions      int        `json:"repetitions" db:"repetitions"`
	Lapses           int        `json:"lapses" db:"lapses"`
	LastResult       int        `json:"-" db:"last_result"`
	DueAt            time.Time  `json:"dueAt" db:"due_at"`
	LastReviewedAt   *time.Time `json:"lastReviewedAt,omitempty" db:"last_reviewed_at"`
	CreatedAt        time.Time  `json:"createdAt" db:"created_at"`
}

// ReviewCardInput is the AI-generated card shape before it is persisted.
type ReviewCardInput struct {
	Prompt     string `json:"prompt"`
	Answer     string `json:"answer"`
	ConceptTag string `json:"concept_tag"`
}

// SocraticFollowUp is the AI-generated Socratic follow-up for a text answer.
type SocraticFollowUp struct {
	FollowUp    string `json:"follow_up"`
	Explanation string `json:"explanation"`
}

// RetentionBucket is one retention data point: pct_correct for cards reviewed
// `days` days after they were learned.
type RetentionBucket struct {
	Days       int     `json:"days"`
	PctCorrect float64 `json:"pct_correct"`
}

// WeakConcept aggregates per-concept accuracy from review outcomes.
type WeakConcept struct {
	Concept    string  `json:"concept"`
	TopicName  string  `json:"topic_name"`
	PctCorrect float64 `json:"pct_correct"`
	SampleSize int     `json:"sample_size"`
}

// ReviewStats is the aggregate retention summary for a user.
type ReviewStats struct {
	RetentionByInterval []RetentionBucket `json:"retention_by_interval"`
	WeakConcepts        []WeakConcept     `json:"weak_concepts"`
	TotalCards          int               `json:"total_cards"`
	DueToday            int               `json:"due_today"`
}

// TopicRetentionSeries represents retention data for a single topic over time.
type TopicRetentionSeries struct {
	TopicID          string           `json:"topic_id"`
	TopicTitle       string           `json:"topic_title"`
	AvgEase          float64          `json:"avg_ease"`
	CompletedLessons int              `json:"completed_lessons"`
	CreatedAt        string           `json:"created_at"`
	Points           []RetentionPoint `json:"points"`
}

// RetentionPoint is a single data point in the retention series.
type RetentionPoint struct {
	Date       string  `json:"date"` // YYYY-MM-DD format
	PctCorrect float64 `json:"pct_correct"`
	Reviews    int     `json:"reviews"`
}

type LessonActivity struct {
	Title       string `json:"title"`
	TopicName   string `json:"topic_name"`
	CreatedAt   string `json:"created_at"`
	CompletedAt string `json:"completed_at"`
}

type QuizActivity struct {
	TopicName   string `json:"topic_name"`
	CreatedAt   string `json:"created_at"`
	CompletedAt string `json:"completed_at"`
}

type UserActivityData struct {
	Day       string           `json:"day"`
	Lessons   []LessonActivity `json:"lessons"`
	Quizes    []QuizActivity   `json:"quizes"`
	TotalTime int              `json:"total_time"` // in seconds
}
