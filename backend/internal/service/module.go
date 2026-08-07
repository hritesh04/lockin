package service

import (
	"context"
	"errors"

	"github.com/acerowl/lockin/backend/internal/models"
)

type ModuleRepository interface {
	Update(ctx context.Context, moduleID string, status string) (*models.Module, error)
	GetByID(ctx context.Context, moduleID string) (*models.Module, error)
	UpdateByTopicID(ctx context.Context, topicID string, index int, status string) (*models.Module, error)
	IsUserModule(ctx context.Context, moduleID, userID string) bool
}

type moduleService struct {
	repo ModuleRepository
}

func NewModuleService(r ModuleRepository) *moduleService {
	return &moduleService{repo: r}
}

func (s *moduleService) UpdateStatus(ctx context.Context, moduleID string, status string, userID string) (*models.Module, error) {
	if !s.repo.IsUserModule(ctx, moduleID, userID) {
		return nil, errors.New("module not found")
	}
	return s.repo.Update(ctx, moduleID, status)
}

func (s *moduleService) GetByID(ctx context.Context, moduleID string) (*models.Module, error) {
	return s.repo.GetByID(ctx, moduleID)
}

func (s *moduleService) UpdateByTopicID(ctx context.Context, topicID string, index int, status string) (*models.Module, error) {
	return s.repo.UpdateByTopicID(ctx, topicID, index, status)
}
