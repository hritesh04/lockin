package handlers

import (
	"github.com/acerowl/lockin/backend/internal/models"
)

type ErrorResponse struct {
	Success bool   `json:"success" example:"false"`
	Error   string `json:"error" example:"something went wrong"`
}

type SuccessResponse struct {
	Success bool   `json:"success" example:"true"`
	Message string `json:"message" example:"operation successful"`
}

type AuthTokenData struct {
	Token        string `json:"token" example:"eyJhbGciOiJIUzI1NiIs..."`
	RefreshToken string `json:"refresh_token" example:"eyJhbGciOiJIUzI1NiIs..."`
}

type AuthTokenResponse struct {
	Success bool          `json:"success" example:"true"`
	Data    AuthTokenData `json:"data"`
}


type UserAnswer struct {
	Question models.Question `json:"question"`
	Answer   string   `json:"answer"`
}

type RefreshTokenData struct {
	Token        string `json:"token" example:"eyJhbGciOiJIUzI1NiIs..."`
	RefreshToken string `json:"refresh_token" example:"eyJhbGciOiJIUzI1NiIs..."`
}

type RefreshTokenResponse struct {
	Success bool             `json:"success" example:"true"`
	Data    RefreshTokenData `json:"data"`
}

type UserResponse struct {
	Success bool        `json:"success" example:"true"`
	Data    models.User `json:"data"`
}

type CreateTopicData struct {
	Topic  models.Topic `json:"topic"`
	Status string       `json:"status" example:"generating"`
}

type CreateTopicResponse struct {
	Success bool            `json:"success" example:"true"`
	Data    CreateTopicData `json:"data"`
}

type TopicListResponse struct {
	Success bool           `json:"success" example:"true"`
	Data    []models.Topic `json:"data"`
}

type TopicResponse struct {
	Success bool         `json:"success" example:"true"`
	Data    models.Topic `json:"data"`
}

type RoadmapResponse struct {
	Success bool                `json:"success" example:"true"`
	Data    models.TopicRoadmap `json:"data"`
}

type StartSessionData struct {
	SessionID string            `json:"session_id" example:"550e8400-e29b-41d4-a716-446655440000"`
	Questions []models.Question `json:"questions"`
}

type StartSessionResponse struct {
	Success bool             `json:"success" example:"true"`
	Data    StartSessionData `json:"data"`
}

type CompleteSessionData struct {
	Status string `json:"status" example:"completed"`
}

type CompleteSessionResponse struct {
	Success bool                `json:"success" example:"true"`
	Data    CompleteSessionData `json:"data"`
}

type LessonActivity struct {
	Title       string `json:"title"`
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

type UserActivityInfo struct {
	ActiveStreak  int                `json:"active_streak" example:"3"`
	HighestStreak int                `json:"highest_streak" example:"10"`
	Activity      []UserActivityData `json:"activity"`
}

type GetUserActivityResponse struct {
	Success bool             `json:"success" example:"true"`
	Data    UserActivityInfo `json:"data"`
}

type AssessmentResponse struct {
	Success bool             `json:"success" example:"true"`
	Data    struct{
		Questions []models.Question `json:"data"`
	} `json:"questions"`
}