package handlers

import (
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

	token, refreshToken, user, err := h.Auth.Register(c.Context(), req.Email, req.Password)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "Registration failed: " + err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"token":         token,
			"refresh_token": refreshToken,
			"user":          user,
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
	token, refreshToken, user, err := h.Auth.Login(c.Context(), req.Email, req.Password)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"success": false, "error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"token":         token,
			"refresh_token": refreshToken,
			"user":          user,
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
		return c.Status(401).JSON(fiber.Map{"success": false, "error": err.Error()})
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
