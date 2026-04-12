package service

import (
	"context"
	"log"

	"github.com/acerowl/lockin/backend/internal/models"
)

type LessonRepository interface {
	Update(ctx context.Context, lessonID string, status string) (*models.Lesson, error)
	UpdateByModuleID(ctx context.Context, moduleID string, index int, status string) (*models.Lesson, error)
}

type lessonService struct {
	repo       LessonRepository
	moduleRepo ModuleRepository
}

func NewLessonService(r LessonRepository, mr ModuleRepository) *lessonService {
	return &lessonService{repo: r, moduleRepo: mr}
}

func (s *lessonService) Progress(ctx context.Context, lessonID string) (*models.ProgressUpdate, error) {
	update := &models.ProgressUpdate{
		UpdatedLessons: []models.Lesson{},
		UpdatedModules: []models.Module{},
	}

	//Complete current lesson
	completedLesson, err := s.repo.Update(ctx, lessonID, "completed")
	if err != nil {
		log.Println("Error updating lesson status:", err)
		return nil, err
	}
	update.UpdatedLessons = append(update.UpdatedLessons, *completedLesson)

	//Try unlock next lesson in same module
	unlockedLesson, err := s.repo.UpdateByModuleID(ctx, completedLesson.NodeID, completedLesson.Index+1, "in-progress")
	if err != nil {
		log.Println("Error unlocking next lesson:", err)
		return nil, err
	}

	if unlockedLesson != nil {
		update.UpdatedLessons = append(update.UpdatedLessons, *unlockedLesson)
	} else {
		//If no next lesson, current module is completed
		completedModule, err := s.moduleRepo.Update(ctx, completedLesson.NodeID, "completed")
		if err != nil {
			log.Println("Error completing module:", err)
		} else {
			update.UpdatedModules = append(update.UpdatedModules, *completedModule)

			//Try unlock next module in topic
			nextModule, err := s.moduleRepo.UpdateByTopicID(ctx, completedModule.TopicID, completedModule.Index+1, "in-progress")
			if err != nil {
				log.Println("Error unlocking next module:", err)
			} else if nextModule != nil {
				update.UpdatedModules = append(update.UpdatedModules, *nextModule)

				//Unlock first lesson of next module
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
