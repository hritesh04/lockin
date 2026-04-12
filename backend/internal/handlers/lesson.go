package handlers

import (
	"log"

	"github.com/gofiber/fiber/v2"
)

// UpdateLessonStatus godoc
// @Summary      Update lesson status
// @Description  Updates the status of a specific lesson, automatically cascading unlocks for next items if status is "completed"
// @Tags         lessons
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string           true  "Lesson UUID"
// @Router       /lessons/progress/{id} [post]
func (h *APIHandler) Progress(c *fiber.Ctx) error {
	lessonID := c.Params("id")

	data, err := h.Lesson.Progress(c.Context(), lessonID)
	if  err != nil {
		log.Println("Error updating lesson:",err)
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Failed to update lesson status"})
	}

	return c.JSON(fiber.Map{"success": true, "data": data})
}
