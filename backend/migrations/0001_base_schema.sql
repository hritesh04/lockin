-- +goose Up
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS users (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                  TEXT NOT NULL UNIQUE,
    password_hash          TEXT NOT NULL,
    current_streak         INTEGER NOT NULL DEFAULT 0,
    longest_streak         INTEGER NOT NULL DEFAULT 0,
    last_session_date      TIMESTAMPTZ,
    refresh_token          TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at             TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS topics (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title                  TEXT NOT NULL,
    tier                   INTEGER NOT NULL DEFAULT 1,
    status                 TEXT NOT NULL DEFAULT 'locked',
    remark                 TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_topics_user_id ON topics (user_id);

CREATE TABLE IF NOT EXISTS modules (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id               UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    parent_node_id         UUID,
    index                  INTEGER NOT NULL,
    title                  TEXT NOT NULL,
    description            TEXT NOT NULL DEFAULT '',
    status                 TEXT NOT NULL DEFAULT 'locked',
    concept_tags           TEXT[] NOT NULL DEFAULT '{}',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modules_topic_id ON modules (topic_id);

CREATE TABLE IF NOT EXISTS lessons (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id                UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    index                  INTEGER NOT NULL,
    title                  TEXT NOT NULL,
    description            TEXT NOT NULL DEFAULT '',
    content                TEXT NOT NULL DEFAULT '',
    status                 TEXT NOT NULL DEFAULT 'locked',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_node_id ON lessons (node_id);

CREATE TABLE IF NOT EXISTS questions (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id                UUID,
    lesson_id              UUID REFERENCES lessons(id) ON DELETE CASCADE,
    index                  INTEGER NOT NULL,
    type                   TEXT NOT NULL,
    question               TEXT NOT NULL,
    answer                 TEXT,
    explanation            TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_lesson_id ON questions (lesson_id);

CREATE TABLE IF NOT EXISTS question_options (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id            UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    index                  INTEGER NOT NULL,
    label                  TEXT NOT NULL,
    explanation            TEXT,
    is_correct             BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON question_options (question_id);

CREATE TABLE IF NOT EXISTS sessions (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id               UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    lesson_id              UUID REFERENCES lessons(id) ON DELETE SET NULL,
    quiz_mode              TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_topic_id ON sessions (topic_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS question_options;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS lessons;
DROP TABLE IF EXISTS modules;
DROP TABLE IF EXISTS topics;
DROP TABLE IF EXISTS users;

-- +goose StatementEnd
