-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS review_cards (
    id                 UUID PRIMARY KEY,
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id           UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    lesson_id          UUID REFERENCES lessons(id) ON DELETE CASCADE,
    source_question_id UUID,
    prompt             TEXT NOT NULL,
    answer             TEXT NOT NULL,
    concept_tags       TEXT[] NOT NULL DEFAULT '{}',
    ease_factor        DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    interval_days      INTEGER NOT NULL DEFAULT 0,
    repetitions        INTEGER NOT NULL DEFAULT 0,
    lapses             INTEGER NOT NULL DEFAULT 0,
    last_result        INTEGER NOT NULL DEFAULT 0,
    due_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_reviewed_at   TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- +goose StatementEnd

CREATE INDEX IF NOT EXISTS idx_review_cards_user_due ON review_cards (user_id, due_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_cards_user_source
    ON review_cards (user_id, source_question_id)
    WHERE source_question_id IS NOT NULL;

-- +goose Down
DROP TABLE IF EXISTS review_cards;
