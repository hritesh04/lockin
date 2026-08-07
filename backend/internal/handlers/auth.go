package handlers

import (
	"errors"

	"github.com/acerowl/lockin/backend/internal/service"
	"github.com/gofiber/fiber/v2"
)

// RegisterReq is the request body for /auth/register
type RegisterReq struct {
	Email    string `json:"email"    example:"user@example.com"`
	Password string `json:"password" example:"supersecret"`
}

// LoginReq is the request body for /auth/login
type LoginReq struct {
	Email    string `json:"email"    example:"user@example.com"`
	Password string `json:"password" example:"supersecret"`
}

// RefreshReq is the request body for /auth/refresh
type RefreshReq struct {
	RefreshToken string `json:"refresh_token" example:"eyJhbGciOiJIUzI1NiIs..."`
}

// ForgotPasswordReq is the request body for /auth/forgot-password
type ForgotPasswordReq struct {
	Email string `json:"email" example:"user@example.com"`
}

// UpdateMeReq is the request body for PATCH /users/me
type UpdateMeReq struct {
	Goal                *string `json:"goal" example:"Academic Excellence"`
	DailyCommitment     *int    `json:"daily_commitment" example:"15"`
	OnboardingCompleted *bool   `json:"onboarding_completed" example:"true"`
}

// Register godoc
// @Summary      Register a new user
// @Description  Creates a new user account and returns access + refresh tokens
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body      RegisterReq        true  "Registration payload"
// @Success      200   {object}  AuthTokenResponse   "Tokens and user profile"
// @Failure      400   {object}  ErrorResponse       "Validation or registration error"
// @Failure      500   {object}  ErrorResponse       "Internal server error"
// @Router       /auth/register [post]
func (h *APIHandler) Register(c *fiber.Ctx) error {
	var req RegisterReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "Invalid request payload"})
	}

	token, refreshToken, _, err := h.Auth.Register(c.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, service.ErrEmailExists) {
			return c.Status(400).JSON(fiber.Map{"success": false, "error": "An account with this email may already exist."})
		}
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "Registration failed. Please try again."})
	}

	return c.JSON(AuthTokenResponse{
		Success: true,
		Data: AuthTokenData{
			Token:        token,
			RefreshToken: refreshToken,
		},
	})
}

// Login godoc
// @Summary      Login
// @Description  Authenticates a user and returns access + refresh tokens
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body      LoginReq           true  "Login credentials"
// @Success      200   {object}  AuthTokenResponse   "Tokens and user profile"
// @Failure      400   {object}  ErrorResponse       "Invalid request payload"
// @Failure      401   {object}  ErrorResponse       "Invalid credentials"
// @Router       /auth/login [post]
func (h *APIHandler) Login(c *fiber.Ctx) error {
	var req LoginReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "Invalid request payload"})
	}
	token, refreshToken, err := h.Auth.Login(c.Context(), req.Email, req.Password)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"success": false, "error": "Invalid email or password"})
	}

	return c.JSON(AuthTokenResponse{
		Success: true,
		Data: AuthTokenData{
			Token:        token,
			RefreshToken: refreshToken,
		},
	})
}

// RefreshToken godoc
// @Summary      Refresh access token
// @Description  Exchanges a valid refresh token for a new access + refresh token pair
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body      RefreshReq             true  "Refresh token"
// @Success      200   {object}  RefreshTokenResponse    "New token pair"
// @Failure      400   {object}  ErrorResponse           "Invalid request payload"
// @Failure      401   {object}  ErrorResponse           "Invalid or expired refresh token"
// @Router       /auth/refresh [post]
func (h *APIHandler) RefreshToken(c *fiber.Ctx) error {
	var req RefreshReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "Invalid request payload"})
	}

	newToken, newRefreshToken, err := h.Auth.RefreshToken(c.Context(), req.RefreshToken)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"success": false, "error": "Invalid or expired refresh token"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"token":         newToken,
			"refresh_token": newRefreshToken,
		},
	})
}

// GetMe godoc
// @Summary      Get current user
// @Description  Returns the profile of the authenticated user
// @Tags         users
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  UserResponse   "User profile"
// @Failure      404  {object}  ErrorResponse  "User not found"
// @Router       /users/me [get]
func (h *APIHandler) GetMe(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)

	user, err := h.Auth.GetMe(c.Context(), userIDStr)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "error": "User not found"})
	}
	return c.JSON(fiber.Map{
		"success": true,
		"data":    user,
	})
}

// UpdateMe godoc
// @Summary      Update current user profile
// @Description  Updates onboarding fields (goal, daily_commitment, onboarding_completed) for the authenticated user
// @Tags         users
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      UpdateMeReq       true  "Fields to update"
// @Success      200   {object}  UserResponse      "Updated user profile"
// @Failure      400   {object}  ErrorResponse     "Invalid request payload"
// @Failure      500   {object}  ErrorResponse     "Internal server error"
// @Router       /users/me [patch]
func (h *APIHandler) UpdateMe(c *fiber.Ctx) error {
	userIDStr := c.Locals("user_id").(string)

	var req UpdateMeReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "Invalid request payload"})
	}

	onboardingCompleted := false
	if req.OnboardingCompleted != nil {
		onboardingCompleted = *req.OnboardingCompleted
	}

	if err := h.Auth.UpdateOnboarding(c.Context(), userIDStr, req.Goal, req.DailyCommitment, onboardingCompleted); err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Failed to update profile"})
	}

	user, err := h.Auth.GetMe(c.Context(), userIDStr)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "error": "User not found"})
	}
	return c.JSON(fiber.Map{
		"success": true,
		"data":    user,
	})
}

// @Summary      Request password reset
// @Description  Sends a password reset token to the user's email (simulated)
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body      ForgotPasswordReq  true  "Email address"
// @Success      200   {object}  SuccessResponse    "Reset request processed"
// @Failure      400   {object}  ErrorResponse      "Invalid request payload"
// @Router       /auth/forgot-password [post]
func (h *APIHandler) ForgotPassword(c *fiber.Ctx) error {
	var req ForgotPasswordReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "Invalid request payload"})
	}

	if err := h.Auth.ForgotPassword(c.Context(), req.Email); err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Internal server error"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "If an account exists with that email, a reset link has been sent.",
	})
}
