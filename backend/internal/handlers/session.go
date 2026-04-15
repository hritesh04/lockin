package handlers

import (
	"encoding/json"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// StartSessionReq is the request body for starting a session
type StartSessionReq struct {
	TopicID  string `json:"topic_id"  example:"550e8400-e29b-41d4-a716-446655440000"`
	LessonID string `json:"lesson_id" example:"550e8400-e29b-41d4-a716-446655440000"`
	QuizMode string `json:"quiz_mode" example:"options"` // options, text, lesson
}

type CompleteSessionReq struct {
	TopicID string       `json:"topic_id"`
	Answers []UserAnswer `json:"answers"`
}

type TopicAssessmentEvaluationReq struct {
	Topic	string	`json:"topic"`
	Assessment []UserAnswer	`json:"assessment"`
}

// StartSession godoc
// @Summary      Start a quiz session
// @Description  Creates a new quiz session. If lesson_id is provided, it uses existing questions. Otherwise, it generates questions via AI.
// @Tags         sessions
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      StartSessionReq      true  "Session configuration"
// @Success      200   {object}  StartSessionResponse  "Session ID and questions"
// @Failure      400   {object}  ErrorResponse         "Invalid input"
// @Failure      500   {object}  ErrorResponse         "Internal server error"
// @Router       /sessions/start [post]
func (h *APIHandler) StartSession(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)

	var req StartSessionReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "Invalid request payload"})
	}

	topicID, err := uuid.Parse(req.TopicID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "Invalid topic_id"})
	}

	var lessonID *uuid.UUID
	quizMode := req.QuizMode
	if req.LessonID != "" {
		lID, err := uuid.Parse(req.LessonID)
		if err == nil {
			lessonID = &lID
			quizMode = "lesson"
		}
	}

	if quizMode == "" {
		quizMode = "options"
	}

	sessionID, questions, err := h.Session.StartSession(c.Context(), topicID, lessonID, userID, quizMode)
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
// @Description  Marks a quiz session as completed. If answers are provided, it triggers AI evaluation.
// @Tags         sessions
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string                   true  "Session UUID"
// @Param        body body      CompleteSessionReq       true  "Performance data"
// @Success      200  {object}  CompleteSessionResponse   "Completion confirmation"
// @Failure      500  {object}  ErrorResponse             "Internal server error"
// @Router       /sessions/{id}/complete [post]
func (h *APIHandler) CompleteSession(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	userIDStr := c.Locals("user_id").(string)

	var req CompleteSessionReq
	_ = c.BodyParser(&req)

	answersJSON := ""
	if len(req.Answers) > 0 {
		b, _ := json.Marshal(req.Answers)
		answersJSON = string(b)
	}

	err := h.Session.CompleteSession(c.Context(), sessionID, answersJSON, req.TopicID, userIDStr)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Failed completing session: " + err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"status": "completed",
		},
	})
}

// GetLast7DaysActivity godoc
// @Summary      Get last 7 days activity
// @Description  Returns the last 7 days activity of the user.
// @Tags         sessions
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  GetUserActivityResponse   "Activity data"
// @Failure      500  {object}  ErrorResponse             "Internal server error"
// @Router       /sessions/activity [get]
func (h *APIHandler) GetUserActivity(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)
	userID, _ := uuid.Parse(userIDStr)

	activity, err := h.Session.GetUserActivity(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Failed getting user activity: " + err.Error()})
	}

	user, err := h.Auth.GetMe(c.Context(), userIDStr)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Failed getting user data: " + err.Error()})
	}

	return c.JSON(GetUserActivityResponse{
		Success: true,
		Data: UserActivityInfo{
			ActiveStreak:  user.CurrentStreak,
			HighestStreak: user.LongestStreak,
			Activity:      activity,
		},
	})
}
