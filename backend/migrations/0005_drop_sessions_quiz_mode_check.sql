-- +goose Up
-- The base schema defines quiz_mode as unconstrained TEXT. A CHECK constraint
-- was added out-of-band to the database that rejected the "review" quiz mode,
-- breaking review session tracking. Drop it to restore the intended schema.
ALTER TABLE sessions
    DROP CONSTRAINT IF EXISTS sessions_quiz_mode_check;

-- +goose Down
ALTER TABLE sessions
    ADD CONSTRAINT sessions_quiz_mode_check CHECK (quiz_mode IN ('lesson', 'options', 'mcq', 'text', 'speech', 'review'));
