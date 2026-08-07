package handlers

import (
	"context"
	"fmt"
	"log"

	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// ReviewService is the service interface the review handlers depend on.
type ReviewService interface {
	GenerateAndStore(ctx context.Context, userID, topicID string) (int, error)
	ListDue(ctx context.Context, userID string, topicID *uuid.UUID, limit int) ([]models.ReviewCard, error)
	DueCount(ctx context.Context, userID string) (int, error)
	Rate(ctx context.Context, cardID, userID string, quality int) (models.ReviewCard, error)
	Stats(ctx context.Context, userID string) (models.ReviewStats, error)
	RetentionByTopic(ctx context.Context, userID string, days int) ([]models.TopicRetentionSeries, error)
}

// RateReviewCardReq is the request body for rating a review card.
type RateReviewCardReq struct {
	Quality int `json:"quality" example:"3"` // 0-5 SM-2 quality score
}

// GenerateReviewCards godoc
// @Summary      Generate review cards for a topic
// @Description  Uses AI to generate spaced-repetition flashcards from the topic's roadmap and inserts them into the review queue.
// @Tags         reviews
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "Topic UUID"
// @Success      200  {object}  map[string]interface{}  "Number of generated cards"
// @Failure      500  {object}  ErrorResponse           "Generation error"
// @Router       /topics/{id}/review-cards/generate [post]
func (h *APIHandler) GenerateReviewCards(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)
	topicID := c.Params("id")

	generated, err := h.Review.GenerateAndStore(c.Context(), userIDStr, topicID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Failed to generate review cards"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"generated": generated,
		},
	})
}

// GetDueReviews godoc
// @Summary      Get due review cards
// @Description  Returns the user's cards that are due for review, optionally filtered by topic.
// @Tags         reviews
// @Produce      json
// @Security     BearerAuth
// @Param        topic_id  query     string  false  "Filter by topic (optional)"
// @Param        limit     query     int     false  "Max number of cards to return (default 20)"
// @Success      200  {object}  map[string]interface{}  "Due review cards"
// @Failure      500  {object}  ErrorResponse           "Internal server error"
// @Router       /reviews/due [get]
func (h *APIHandler) GetDueReviews(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)

	var topicID *uuid.UUID
	if tid := c.Query("topic_id"); tid != "" {
		parsed, err := uuid.Parse(tid)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"success": false, "error": "invalid topic_id"})
		}
		topicID = &parsed
	}

	limit := 20
	if l := c.QueryInt("limit"); l > 0 {
		limit = l
	}

	cards, err := h.Review.ListDue(c.Context(), userIDStr, topicID, limit)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Failed to fetch due cards"})
	}
	if cards == nil {
		cards = []models.ReviewCard{}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    cards,
	})
}

// GetReviewDueCount godoc
// @Summary      Get number of due review cards
// @Description  Returns the total count of review cards due right now for the user.
// @Tags         reviews
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  map[string]interface{}  "Due count"
// @Failure      500  {object}  ErrorResponse           "Internal server error"
// @Router       /reviews/due/count [get]
func (h *APIHandler) GetReviewDueCount(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)

	count, err := h.Review.DueCount(c.Context(), userIDStr)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Failed to count due cards"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"due_count": count,
		},
	})
}

// GetReviewStats godoc
// @Summary      Get retention stats
// @Description  Returns retention-by-interval, weak concepts, and card totals for the user.
// @Tags         reviews
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  map[string]interface{}  "Retention stats"
// @Failure      500  {object}  ErrorResponse           "Internal server error"
// @Router       /reviews/stats [get]
func (h *APIHandler) GetReviewStats(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)

	stats, err := h.Review.Stats(c.Context(), userIDStr)
	if err != nil {
		fmt.Println(err)
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Failed to fetch review stats"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    stats,
	})
}

// RateReviewCard godoc
// @Summary      Rate a review card
// @Description  Applies SM-2 scheduling based on a quality score (0-5). Higher is better recall.
// @Tags         reviews
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "Card UUID"
// @Param        body body      RateReviewCardReq  true  "Quality score 0-5"
// @Success      200  {object}  map[string]interface{}  "Updated card with next schedule"
// @Failure      400  {object}  ErrorResponse           "Invalid input"
// @Failure      500  {object}  ErrorResponse           "Internal server error"
// @Router       /reviews/{id}/rate [post]
func (h *APIHandler) RateReviewCard(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)
	cardID := c.Params("id")

	var req RateReviewCardReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "Invalid request payload"})
	}

	card, err := h.Review.Rate(c.Context(), cardID, userIDStr, req.Quality)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "Failed to rate review card"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"card":          card,
			"next_due_at":   card.DueAt,
			"interval_days": card.IntervalDays,
		},
	})
}

// GetRetentionByTopic godoc
// @Summary      Get retention by topic over time
// @Description  Returns retention data for each topic over the last N days (default 7).
// @Tags         reviews
// @Produce      json
// @Security     BearerAuth
// @Param        days  query     int     false  "Number of days to look back (default 7)"
// @Success      200  {object}  map[string]interface{}  "Retention series by topic"
// @Failure      500  {object}  ErrorResponse           "Internal server error"
// @Router       /reviews/retention [get]
func (h *APIHandler) GetRetentionByTopic(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)

	days := 7
	if d := c.QueryInt("days"); d > 0 {
		days = d
	}

	series, err := h.Review.RetentionByTopic(c.Context(), userIDStr, days)
	if err != nil {
		log.Printf("GetRetentionByTopic error: %v", err)
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Failed to fetch retention by topic"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    series,
	})
}
