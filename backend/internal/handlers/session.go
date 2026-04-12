package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// StartSessionReq is the request body for starting a session
type StartSessionReq struct {
	NodeID   string `json:"node_id"   example:"550e8400-e29b-41d4-a716-446655440000"`
	QuizMode string `json:"quiz_mode" example:"mcq"` // mcq, text, speech, mixed
}

// StartSession godoc
// @Summary      Start a quiz session
// @Description  Creates a new quiz session for a module node under a topic. Fetches up to 10 questions with their options.
// @Tags         sessions
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      string               true  "Topic UUID"
// @Param        body  body      StartSessionReq      true  "Session configuration"
// @Success      200   {object}  StartSessionResponse  "Session ID and questions"
// @Failure      400   {object}  ErrorResponse         "Invalid input or not enough questions"
// @Failure      500   {object}  ErrorResponse         "Internal server error"
// @Router       /topics/{id}/session [post]
func (h *APIHandler) StartSession(c *fiber.Ctx) error {
	topicID := c.Params("id")
	userIDStr := c.Locals("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)
	tID, _ := uuid.Parse(topicID)

	var req StartSessionReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "Invalid request payload"})
	}

	nodeID, err := uuid.Parse(req.NodeID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "Invalid node_id"})
	}

	quizMode := req.QuizMode
	if quizMode == "" {
		quizMode = "mcq"
	}

	sessionID, questions, err := h.Session.StartSession(c.Context(), tID, nodeID, userID, quizMode)
	if err != nil {
		if err.Error() == "Not enough questions. Generation might be pending." {
			return c.Status(400).JSON(fiber.Map{"success": false, "error": err.Error()})
		}
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Failed creating session: " + err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"session_id": sessionID,
			"questions":  questions,
		},
	})
}

// CompleteSession godoc
// @Summary      Complete a session
// @Description  Marks a quiz session as completed by setting the completed_at timestamp
// @Tags         sessions
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string                   true  "Session UUID"
// @Success      200  {object}  CompleteSessionResponse   "Completion confirmation"
// @Failure      500  {object}  ErrorResponse             "Internal server error"
// @Router       /sessions/{id}/complete [post]
func (h *APIHandler) CompleteSession(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	err := h.Session.CompleteSession(c.Context(), sessionID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Failed completing session"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"status": "completed",
		},
	})
}
