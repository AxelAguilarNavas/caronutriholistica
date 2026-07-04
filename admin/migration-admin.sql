-- ═══════════════════════════════════════════════════════════════════════
-- migration-admin.sql — Cambios del panel admin sobre el esquema existente
-- Idempotente. El servidor (server/migrate.js) la aplica automáticamente
-- al arrancar; este archivo existe para aplicarla a mano si se prefiere:
--
--   ssh root@2.25.66.208
--   docker exec -i <contenedor-postgres> psql -U postgres -d PostgresSQL < migration-admin.sql
-- ═══════════════════════════════════════════════════════════════════════
BEGIN;

-- 1. Plan de nutrición entregado al cliente (README §Data Model)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS nutrition_plan_text TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS nutrition_plan_updated_at TIMESTAMPTZ;

-- 2. plan_status: agrega 'paused' (el panel ofrece Activo=enrolled,
--    Pausado=paused, Cancelado=cancelled, más los estados existentes)
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_plan_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_plan_status_check
  CHECK (plan_status IN ('interested','enrolled','paused','completed','cancelled'));

-- 3. question_type: agrega los tipos del constructor de encuestas,
--    manteniendo los tipos legados del quiz
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_question_type_check
  CHECK (question_type IN ('checkbox','radio','select','text','severity',
                           'short_text','long_text','single_choice','multiple_choice','yes_no','scale'));

COMMIT;
