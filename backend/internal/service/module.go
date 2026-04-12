package service

import (
	"context"

	"github.com/acerowl/lockin/backend/internal/models"
)

type ModuleRepository interface {
	Update(ctx context.Context, moduleID string, status string) (*models.Module, error)
	GetByID(ctx context.Context, moduleID string) (*models.Module, error)
	UpdateByTopicID(ctx context.Context, topicID string, index int, status string) (*models.Module, error)
}

type moduleService struct {
	repo ModuleRepository
}

func NewModuleService(r ModuleRepository) *moduleService {
	return &moduleService{repo: r}
}

func (s *moduleService) UpdateStatus(ctx context.Context, moduleID string, status string) (*models.Module, error) {
	return s.repo.Update(ctx, moduleID, status)
}

func (s *moduleService) GetByID(ctx context.Context, moduleID string) (*models.Module, error) {
	return s.repo.GetByID(ctx, moduleID)
}

func (s *moduleService) UpdateByTopicID(ctx context.Context, topicID string, index int, status string) (*models.Module, error) {
	return s.repo.UpdateByTopicID(ctx, topicID, index, status)
}