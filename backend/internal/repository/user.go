package repository

import (
	"context"

	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepository interface {
	CreateUser(ctx context.Context, email, passwordHash, name string) (models.User, error)
	GetUserByEmail(ctx context.Context, email string) (models.User, string, error)
	GetUserByID(ctx context.Context, id string) (models.User, error)
}

type userRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) CreateUser(ctx context.Context, email, passwordHash, name string) (models.User, error) {
	var user models.User
	err := r.db.QueryRow(ctx,
		"INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, streak_count, created_at",
		email, passwordHash, name,
	).Scan(&user.ID, &user.Email, &user.Name, &user.StreakCount, &user.CreatedAt)
	return user, err
}

func (r *userRepository) GetUserByEmail(ctx context.Context, email string) (models.User, string, error) {
	var user models.User
	var passwordHash string
	err := r.db.QueryRow(ctx,
		"SELECT id, email, password_hash, name, streak_count, created_at FROM users WHERE email = $1",
		email,
	).Scan(&user.ID, &user.Email, &passwordHash, &user.Name, &user.StreakCount, &user.CreatedAt)
	return user, passwordHash, err
}

func (r *userRepository) GetUserByID(ctx context.Context, id string) (models.User, error) {
	var user models.User
	err := r.db.QueryRow(ctx,
		"SELECT id, email, name, streak_count, last_session_date, vibe_preference, created_at FROM users WHERE id = $1",
		id,
	).Scan(&user.ID, &user.Email, &user.Name, &user.StreakCount, &user.LastSessionDate, &user.VibePreference, &user.CreatedAt)
	return user, err
}
