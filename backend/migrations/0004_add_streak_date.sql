-- +goose Up
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS streak_date DATE;

-- +goose Down
ALTER TABLE users
    DROP COLUMN IF EXISTS streak_date;
