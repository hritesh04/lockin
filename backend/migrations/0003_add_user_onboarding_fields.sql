-- +goose Up
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS goal                TEXT,
    ADD COLUMN IF NOT EXISTS daily_commitment    INTEGER,
    ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- +goose Down
ALTER TABLE users
    DROP COLUMN IF EXISTS goal,
    DROP COLUMN IF EXISTS daily_commitment,
    DROP COLUMN IF EXISTS onboarding_completed;
