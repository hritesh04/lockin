package handlers

import (
	"github.com/acerowl/lockin/backend/internal/service"
)

type APIHandler struct {
	Auth    service.AuthService
	Topic   service.TopicService
	Session service.SessionService
}

func NewAPIHandler(auth service.AuthService, topic service.TopicService, session service.SessionService) *APIHandler {
	return &APIHandler{Auth: auth, Topic: topic, Session: session}
}
