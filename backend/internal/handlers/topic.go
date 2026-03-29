package handlers

import (
	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// CreateTopicReq is the request body for creating a new topic
type CreateTopicReq struct {
	Title            string `json:"title"             example:"Quantum Mechanics"`
	FamiliarityLevel string `json:"familiarity_level" example:"beginner"` // beginner, some_exposure, basics
}

// CreateTopic godoc
// @Summary      Create a topic
// @Description  Creates a new learning topic and triggers async question generation
// @Tags         topics
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      CreateTopicReq  true  "Topic payload"
// @Success      201   {object}  map[string]interface{}
// @Failure      400   {object}  map[string]interface{}
// @Failure      500   {object}  map[string]interface{}
// @Router       /topics [post]
func (h *APIHandler) CreateTopic(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)

	var req CreateTopicReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "Invalid request payload"})
	}

	topic, err := h.Topic.CreateTopic(c.Context(), userID, req.Title, "General", req.FamiliarityLevel)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Failed to create topic"})
	}

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"topic":  topic,
			"status": "generating",
		},
	})
}

// ListTopics godoc
// @Summary      List topics
// @Description  Returns all topics for the authenticated user
// @Tags         topics
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]interface{}
// @Router       /topics [get]
func (h *APIHandler) ListTopics(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)

	userID, _ := uuid.Parse(userIDStr)
	topics, err := h.Topic.ListTopics(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Database error"})
	}

	if topics == nil {
		topics = []models.Topic{}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    topics,
	})
}

// GetTopic godoc
// @Summary      Get a topic
// @Description  Fetches a single topic by ID
// @Tags         topics
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "Topic UUID"
// @Success      200  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Router       /topics/{id} [get]
func (h *APIHandler) GetTopic(c *fiber.Ctx) error {
	topicID := c.Params("id")
	userIDStr := c.Locals("user_id").(string)

	t, err := h.Topic.GetTopic(c.Context(), topicID, userIDStr)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "error": "Topic not found"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    t,
	})
}
