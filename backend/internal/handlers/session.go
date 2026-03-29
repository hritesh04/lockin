package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// StartSession godoc
// @Summary      Start a session
// @Description  Fetches up to 10 unanswered questions for a topic and creates a new session
// @Tags         sessions
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "Topic UUID"
// @Success      200  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]interface{}
// @Router       /topics/{id}/session [get]
func (h *APIHandler) StartSession(c *fiber.Ctx) error {
	topicID := c.Params("id")
	userIDStr := c.Locals("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)
	tID, _ := uuid.Parse(topicID)

	sessionID, questions, err := h.Session.StartSession(c.Context(), tID, userID)
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

// AnswerReq is the request body for submitting an answer
type AnswerReq struct {
	QuestionID     string `json:"question_id"      example:"550e8400-e29b-41d4-a716-446655440000"`
	SelectedAnswer string `json:"selected_answer"  example:"A"`
}

// SubmitAnswer godoc
// @Summary      Submit an answer
// @Description  Records the user's answer for a question and returns correctness feedback
// @Tags         sessions
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      string     true  "Session UUID"
// @Param        body  body      AnswerReq  true  "Answer payload"
// @Success      200   {object}  map[string]interface{}
// @Failure      400   {object}  map[string]interface{}
// @Failure      404   {object}  map[string]interface{}
// @Router       /sessions/{id}/answer [post]
func (h *APIHandler) SubmitAnswer(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	var req AnswerReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "Invalid payload"})
	}

	isCorrect, correct, explanation, err := h.Session.SubmitAnswer(c.Context(), sessionID, req.QuestionID, req.SelectedAnswer)
	if err != nil {
		if err.Error() == "Question not found" {
			return c.Status(404).JSON(fiber.Map{"success": false, "error": "Question not found"})
		}
		return c.Status(500).JSON(fiber.Map{"success": false, "error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"is_correct":     isCorrect,
			"correct_answer": correct,
			"explanation":    explanation,
		},
	})
}

// CompleteSession godoc
// @Summary      Complete a session
// @Description  Marks a session as completed
// @Tags         sessions
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "Session UUID"
// @Success      200  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]interface{}
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
