package service

import (
	"context"
	"errors"
	"log"

	"github.com/acerowl/lockin/backend/internal/models"
)

type LessonRepository interface {
	Update(ctx context.Context, lessonID string, status string) (*models.Lesson, error)
	UpdateByModuleID(ctx context.Context, moduleID string, index int, status string) (*models.Lesson, error)
	IsUserLesson(ctx context.Context, lessonID, userID string) bool
}

type lessonService struct {
	repo       LessonRepository
	moduleRepo ModuleRepository
}

func NewLessonService(r LessonRepository, mr ModuleRepository) *lessonService {
	return &lessonService{repo: r, moduleRepo: mr}
}

func (s *lessonService) Progress(ctx context.Context, lessonID string, userID string) (*models.ProgressUpdate, error) {
	if !s.repo.IsUserLesson(ctx, lessonID, userID) {
		return nil, errors.New("lesson not found")
	}

	update := &models.ProgressUpdate{
		UpdatedLessons: []models.Lesson{},
		UpdatedModules: []models.Module{},
	}

	completedLesson, err := s.repo.Update(ctx, lessonID, "completed")
	if err != nil {
		log.Println("Error updating lesson status:", err)
		return nil, err
	}
	update.UpdatedLessons = append(update.UpdatedLessons, *completedLesson)

	unlockedLesson, err := s.repo.UpdateByModuleID(ctx, completedLesson.NodeID, completedLesson.Index+1, "in-progress")
	if err != nil {
		log.Println("Error unlocking next lesson:", err)
		return nil, err
	}

	if unlockedLesson != nil {
		update.UpdatedLessons = append(update.UpdatedLessons, *unlockedLesson)
	} else {
		completedModule, err := s.moduleRepo.Update(ctx, completedLesson.NodeID, "completed")
		if err != nil {
			log.Println("Error completing module:", err)
		} else {
			update.UpdatedModules = append(update.UpdatedModules, *completedModule)

			nextModule, err := s.moduleRepo.UpdateByTopicID(ctx, completedModule.TopicID, completedModule.Index+1, "in-progress")
			if err != nil {
				log.Println("Error unlocking next module:", err)
			} else if nextModule != nil {
				update.UpdatedModules = append(update.UpdatedModules, *nextModule)

				firstLesson, err := s.repo.UpdateByModuleID(ctx, nextModule.ID, 1, "in-progress")
				if err != nil {
					log.Println("Error unlocking first lesson of next module:", err)
				} else if firstLesson != nil {
					update.UpdatedLessons = append(update.UpdatedLessons, *firstLesson)
				}
			}
		}
	}

	return update, nil
}
