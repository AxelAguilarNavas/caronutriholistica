-- ═══════════════════════════════════════════════════════════════════════
-- schema.sql — PostgreSQL dedicado "carolina-marino-postgresql"
-- Base de datos: PostgresSQL
-- Ejecutar: docker exec -i <container> psql -U postgres -d PostgresSQL -f /tmp/schema.sql
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- DROP (orden inverso de dependencias)
-- ───────────────────────────────────────────────────────────────────────
DROP TRIGGER  IF EXISTS trg_normalize_answers   ON quiz_submissions;
DROP FUNCTION IF EXISTS normalize_submission_answers();
DROP TABLE    IF EXISTS submission_answers    CASCADE;
DROP TABLE    IF EXISTS quiz_submissions      CASCADE;
DROP TABLE    IF EXISTS question_options      CASCADE;
DROP TABLE    IF EXISTS questions             CASCADE;
DROP TABLE    IF EXISTS sections              CASCADE;
DROP TABLE    IF EXISTS surveys               CASCADE;
DROP TABLE    IF EXISTS clients               CASCADE;
DROP TABLE    IF EXISTS plans                 CASCADE;

-- ───────────────────────────────────────────────────────────────────────
-- TABLAS
-- ───────────────────────────────────────────────────────────────────────

CREATE TABLE plans (
  id          SERIAL PRIMARY KEY,
  name        TEXT           NOT NULL,
  description TEXT,
  price_usd   NUMERIC(10,2),
  is_active   BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE clients (
  id               SERIAL PRIMARY KEY,
  user_id          TEXT        UNIQUE,
  name             TEXT,
  email            TEXT,
  phone            TEXT,
  source_platform  TEXT,
  channel          TEXT,
  plan_id          INTEGER     REFERENCES plans(id) ON DELETE SET NULL,
  plan_status      TEXT        CHECK (plan_status IN ('interested','enrolled','completed','cancelled')),
  plan_enrolled_at TIMESTAMPTZ,
  is_vip           BOOLEAN     NOT NULL DEFAULT FALSE,
  vip_set_by       TEXT        CHECK (vip_set_by IN ('manual','automatic')),
  vip_reason       TEXT,
  vip_set_at       TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE surveys (
  id         SERIAL PRIMARY KEY,
  name       TEXT        NOT NULL,
  slug       TEXT        UNIQUE NOT NULL,
  version    TEXT,
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sections (
  id            SERIAL PRIMARY KEY,
  survey_id     INTEGER     NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  section_order INTEGER     NOT NULL,
  name          TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (survey_id, section_order)
);

CREATE TABLE questions (
  id                SERIAL PRIMARY KEY,
  survey_id         INTEGER     NOT NULL REFERENCES surveys(id)  ON DELETE CASCADE,
  section_id        INTEGER              REFERENCES sections(id) ON DELETE SET NULL,
  question_order    INTEGER     NOT NULL,
  question_text     TEXT        NOT NULL,
  question_type     TEXT        NOT NULL CHECK (question_type IN ('checkbox','radio','select','text','severity')),
  is_required       BOOLEAN     NOT NULL DEFAULT TRUE,
  is_conditional    BOOLEAN     NOT NULL DEFAULT FALSE,
  conditional_on    INTEGER              REFERENCES questions(id) ON DELETE SET NULL,
  conditional_value TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (survey_id, question_order)
);

CREATE TABLE question_options (
  id           SERIAL PRIMARY KEY,
  question_id  INTEGER     NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_order INTEGER     NOT NULL,
  option_text  TEXT        NOT NULL,
  option_value TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (question_id, option_order)
);

CREATE TABLE quiz_submissions (
  id              SERIAL PRIMARY KEY,
  client_id       INTEGER              REFERENCES clients(id) ON DELETE SET NULL,
  survey_id       INTEGER     NOT NULL REFERENCES surveys(id),
  user_id         TEXT        NOT NULL DEFAULT '',
  source_platform TEXT,
  channel         TEXT,
  is_complete     BOOLEAN     NOT NULL DEFAULT TRUE,
  raw_payload     JSONB,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE submission_answers (
  id             SERIAL PRIMARY KEY,
  submission_id  INTEGER     NOT NULL REFERENCES quiz_submissions(id) ON DELETE CASCADE,
  survey_id      INTEGER     NOT NULL REFERENCES surveys(id),
  question_id    INTEGER     NOT NULL REFERENCES questions(id),
  option_id      INTEGER              REFERENCES question_options(id) ON DELETE SET NULL,
  question_order INTEGER     NOT NULL,
  answer_text    TEXT        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────────
-- ÍNDICES
-- ───────────────────────────────────────────────────────────────────────
CREATE INDEX ON clients            (email);
CREATE INDEX ON questions          (survey_id, question_order);
CREATE INDEX ON quiz_submissions   (client_id);
CREATE INDEX ON quiz_submissions   (user_id);
CREATE INDEX ON quiz_submissions   (submitted_at);
CREATE INDEX ON submission_answers (submission_id);
CREATE INDEX ON submission_answers (question_id);
CREATE INDEX ON submission_answers (survey_id);
CREATE INDEX ON submission_answers (option_id);
CREATE INDEX ON quiz_submissions   USING GIN (raw_payload);

-- ───────────────────────────────────────────────────────────────────────
-- TRIGGER: normaliza raw_payload → submission_answers al insertar
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION normalize_submission_answers()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  r       JSONB;
  ans     JSONB;
  q_id    INTEGER;
  q_order INTEGER;
  o_id    INTEGER;
  a_text  TEXT;
BEGIN
  IF NEW.raw_payload IS NULL THEN
    RETURN NEW;
  END IF;

  FOR r IN SELECT jsonb_array_elements(NEW.raw_payload->'responses')
  LOOP
    SELECT id, question_order
      INTO q_id, q_order
      FROM questions
     WHERE survey_id   = NEW.survey_id
       AND question_text = r->>'questionText'
     LIMIT 1;

    IF q_id IS NOT NULL THEN
      FOR ans IN SELECT jsonb_array_elements(r->'answers')
      LOOP
        a_text := ans #>> '{}';
        o_id   := NULL;

        SELECT id INTO o_id
          FROM question_options
         WHERE question_id = q_id
           AND option_text  = a_text
         LIMIT 1;

        INSERT INTO submission_answers
          (submission_id, survey_id, question_id, option_id, question_order, answer_text)
        VALUES
          (NEW.id, NEW.survey_id, q_id, o_id, q_order, a_text);
      END LOOP;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_normalize_answers
AFTER INSERT ON quiz_submissions
FOR EACH ROW EXECUTE FUNCTION normalize_submission_answers();

-- ───────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ───────────────────────────────────────────────────────────────────────
\echo 'Schema creado OK. Tablas:'
\dt
