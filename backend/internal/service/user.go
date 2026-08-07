package service

import (
	"context"
	"errors"
	"time"

	"github.com/acerowl/lockin/backend/internal/lib"
	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
)

var ErrEmailExists = errors.New("email already registered")

type UserRepository interface {
	CreateUser(ctx context.Context, email, passwordHash string) (models.User, error)
	GetUserByEmail(ctx context.Context, email string) (models.User, string, error)
	GetUserByID(ctx context.Context, id string) (models.User, error)
	SaveRefreshToken(ctx context.Context, userID string, refreshToken string) error
	CheckUserRefreshToken(ctx context.Context, userID string, refreshToken string) (bool, error)
	UpdateStreak(ctx context.Context, userID string, current, longest int, lastDate time.Time) error
	UpdateOnboarding(ctx context.Context, userID string, goal *string, dailyCommitment *int, onboardingCompleted bool) error
}

type authService struct {
	repo UserRepository
}

func NewAuthService(r UserRepository) *authService {
	return &authService{repo: r}
}

func (s *authService) Register(ctx context.Context, email, password string) (string, string, models.User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return "", "", models.User{}, err
	}

	user, err := s.repo.CreateUser(ctx, email, string(hash))
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return "", "", models.User{}, ErrEmailExists
		}
		return "", "", models.User{}, err
	}

	token, _ := lib.GenerateToken(user.ID)
	refreshToken, _ := lib.GenerateRefreshToken(user.ID)

	if err := s.repo.SaveRefreshToken(ctx, user.ID, refreshToken); err != nil {
		return "", "", models.User{}, err
	}

	return token, refreshToken, user, nil
}

func (s *authService) Login(ctx context.Context, email, password string) (string, string, error) {
	user, hash, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return "", "", errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)); err != nil {
		return "", "", errors.New("invalid credentials")
	}

	token, _ := lib.GenerateToken(user.ID)
	refreshToken, _ := lib.GenerateRefreshToken(user.ID)

	if err := s.repo.SaveRefreshToken(ctx, user.ID, refreshToken); err != nil {
		return "", "", err
	}

	return token, refreshToken, nil
}

func (s *authService) RefreshToken(ctx context.Context, refreshToken string) (string, string, error) {
	userID, err := lib.ValidateRefreshToken(refreshToken)
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

func (s *authService) UpdateOnboarding(ctx context.Context, userID string, goal *string, dailyCommitment *int, onboardingCompleted bool) error {
	return s.repo.UpdateOnboarding(ctx, userID, goal, dailyCommitment, onboardingCompleted)
}

func (s *authService) ForgotPassword(ctx context.Context, email string) error {
	user, _, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return nil
	}

	// TODO
	resetToken := lib.GenerateRandomString(16)
	println("[EMAIL] To: " + user.Email + " Reset Token: " + resetToken)

	return nil
}
