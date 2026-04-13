package repository

import (
	"context"
	"time"

	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type userRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool)*userRepository {
	return &userRepository{db: db}
}

func (r *userRepository) CreateUser(ctx context.Context, email, passwordHash string) (models.User, error) {
	var user models.User
	err := r.db.QueryRow(ctx,
		"INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, current_streak, longest_streak, created_at",
		email, passwordHash,
	).Scan(&user.ID, &user.Email, &user.CurrentStreak, &user.LongestStreak, &user.CreatedAt)
	return user, err
}

func (r *userRepository) GetUserByEmail(ctx context.Context, email string) (models.User, string, error) {
	var user models.User
	var passwordHash string
	err := r.db.QueryRow(ctx,
		"SELECT id, email, password_hash, current_streak, longest_streak, last_session_date, created_at FROM users WHERE email = $1 AND deleted_at IS NULL",
		email,
	).Scan(&user.ID, &user.Email, &passwordHash, &user.CurrentStreak, &user.LongestStreak, &user.LastSessionDate, &user.CreatedAt)
	return user, passwordHash, err
}

func (r *userRepository) GetUserByID(ctx context.Context, id string) (models.User, error) {
	var user models.User
	err := r.db.QueryRow(ctx,
		"SELECT id, email, current_streak, longest_streak, last_session_date, created_at FROM users WHERE id = $1 AND deleted_at IS NULL",
		id,
	).Scan(&user.ID, &user.Email, &user.CurrentStreak, &user.LongestStreak, &user.LastSessionDate, &user.CreatedAt)
	return user, err
}

func (r *userRepository) SaveRefreshToken(ctx context.Context, userID string, refreshToken string) error {
	_, err := r.db.Exec(ctx,
		"UPDATE users SET refresh_token = $1 WHERE id = $2",
		refreshToken, userID,
	)
	return err
}

func (r *userRepository) UpdateStreak(ctx context.Context, userID string, current, longest int, lastDate time.Time) error {
	_, err := r.db.Exec(ctx,
		"UPDATE users SET current_streak = $1, longest_streak = $2, last_session_date = $3 WHERE id = $4",
		current, longest, lastDate, userID,
	)
	return err
}

func (r *userRepository) CheckUserRefreshToken(ctx context.Context, userID string, refreshToken string) (bool, error) {
	var id string
	if err := r.db.QueryRow(ctx, "SELECT id FROM users WHERE id = $1 AND refresh_token = $2 AND deleted_at IS NULL", userID, refreshToken).Scan(&id); err != nil {
		return false, err
	}
	return true, nil
}
