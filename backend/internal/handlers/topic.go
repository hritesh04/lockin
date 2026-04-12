package handlers

import (
	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// CreateTopicReq is the request body for creating a new topic
type CreateTopicReq struct {
	Title            string `json:"title"             example:"Quantum Mechanics"`
	FamiliarityLevel string `json:"familiarity_level" example:"beginner"` // beginner, intermediate, advanced
}


// CreateTopic godoc
// @Summary      Create a topic
// @Description  Creates a new learning topic. An initial tier is assigned based on familiarity_level (beginner=1, intermediate=4, advanced=7). After AI generates the roadmap, the tier is updated based on the AI response.
// @Tags         topics
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      CreateTopicReq       true  "Topic payload"
// @Success      201   {object}  CreateTopicResponse   "Created topic with generation status"
// @Failure      400   {object}  ErrorResponse         "Validation error"
// @Failure      500   {object}  ErrorResponse         "Internal server error"
// @Router       /topics [post]
func (h *APIHandler) CreateTopic(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req CreateTopicReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "Invalid request payload"})
	}

	if req.FamiliarityLevel == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "familiarity_level is required"})
	}

	topic, err := h.Topic.CreateTopic(c.Context(), userID, req.Title, req.FamiliarityLevel)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Failed to create topic: " + err.Error()})
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
// @Description  Returns all topics for the authenticated user, ordered by creation date (newest first)
// @Tags         topics
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  TopicListResponse  "Array of user topics"
// @Failure      500  {object}  ErrorResponse      "Database error"
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
// @Description  Fetches a single topic by ID for the authenticated user
// @Tags         topics
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string         true  "Topic UUID"
// @Success      200  {object}  TopicResponse  "Topic details"
// @Failure      404  {object}  ErrorResponse  "Topic not found"
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

// GetRoadmap godoc
// @Summary      Get roadmap of a topic
// @Description  Fetches the learning roadmap (modules and lessons) for a topic
// @Tags         topics
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string           true  "Topic UUID"
// @Success      200  {object}  RoadmapResponse  "Roadmap with modules"
// @Failure      404  {object}  ErrorResponse    "Topic or roadmap not found"
// @Router       /topics/roadmap/{id} [get]
func (h *APIHandler) GetRoadmap(c *fiber.Ctx) error {
	topicID := c.Params("id")
	userIDStr := c.Locals("user_id").(string)

	t, err := h.Topic.GetRoadmap(c.Context(), topicID, userIDStr)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "error": "Topic not found"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    t,
	})
}