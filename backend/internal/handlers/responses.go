package handlers

import (
	"github.com/acerowl/lockin/backend/internal/models"
)

type ErrorResponse struct {
	Success bool   `json:"success" example:"false"`
	Error   string `json:"error" example:"something went wrong"`
}

type AuthTokenData struct {
	Token        string      `json:"token" example:"eyJhbGciOiJIUzI1NiIs..."`
	RefreshToken string      `json:"refresh_token" example:"eyJhbGciOiJIUzI1NiIs..."`
	User         models.User `json:"user"`
}

type AuthTokenResponse struct {
	Success bool          `json:"success" example:"true"`
	Data    AuthTokenData `json:"data"`
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
