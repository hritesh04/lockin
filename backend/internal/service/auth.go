package service

import (
	"context"
	"errors"

	"github.com/acerowl/lockin/backend/internal/lib"
	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/acerowl/lockin/backend/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

type authService struct {
	repo repository.UserRepository
}

func NewAuthService(r repository.UserRepository) *authService {
	return &authService{repo: r}
}

func (s *authService) Register(ctx context.Context, email, password string) (string, string, models.User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return "", "", models.User{}, err
	}

	user, err := s.repo.CreateUser(ctx, email, string(hash))
	if err != nil {
		return "", "", models.User{}, err
	}

	token, _ := lib.GenerateToken(user.ID)
	refreshToken, _ := lib.GenerateRefreshToken(user.ID)

	if err := s.repo.SaveRefreshToken(ctx, user.ID, refreshToken); err != nil {
		return "", "", models.User{}, err
	}

	return token, refreshToken, user, nil
}

func (s *authService) Login(ctx context.Context, email, password string) (string, string, models.User, error) {
	user, hash, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return "", "", models.User{}, errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)); err != nil {
		return "", "", models.User{}, errors.New("invalid credentials")
	}

	token, _ := lib.GenerateToken(user.ID)
	refreshToken, _ := lib.GenerateRefreshToken(user.ID)

	if err := s.repo.SaveRefreshToken(ctx, user.ID, refreshToken); err != nil {
		return "", "", models.User{}, err
	}

	return token, refreshToken, user, nil
}

func (s *authService) RefreshToken(ctx context.Context, refreshToken string) (string, string, error) {
	userID, err := lib.ValidateToken(refreshToken)
	if err != nil {
		return "", "", errors.New("invalid or expired refresh token")
	}

	valid, err := s.repo.CheckUserRefreshToken(ctx, userID, refreshToken)
	if err != nil || !valid {
		return "", "", errors.New("invalid or expired refresh token")
	}

	newToken, _ := lib.GenerateToken(userID)
	newRefreshToken, _ := lib.GenerateRefreshToken(userID)

	if err := s.repo.SaveRefreshToken(ctx, userID, newRefreshToken); err != nil {
		return "", "", err
	}

	return newToken, newRefreshToken, nil
}

func (s *authService) GetMe(ctx context.Context, userID string) (models.User, error) {
	return s.repo.GetUserByID(ctx, userID)
}
