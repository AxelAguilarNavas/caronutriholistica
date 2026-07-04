-- ═══════════════════════════════════════════════════════════════════════
-- migration-messages.sql — Tabla de historial de mensajes WhatsApp
-- Idempotente (CREATE TABLE/INDEX IF NOT EXISTS). Aplicar a mano:
--
--   ssh root@2.25.66.208
--   docker exec -i <contenedor-postgres> psql -U postgres -d PostgresSQL < migration-messages.sql
--
-- Registra cada mensaje entrante/saliente de WhatsApp (Coco/Nora vía
-- ManyChat). Hoy ese historial vive en la Data Table "Messages" de n8n
-- (nodos GetLastMessage/SaveIncomingMessage/SaveOutgoingMessage en
-- ChatBot.json); esta tabla es el destino para migrar esos datos a
-- PostgreSQL. Nombres de columna alineados 1:1 con la Data Table de n8n
-- para facilitar la copia:
--   n8n Message          -> message_text
--   n8n UserId            -> phone           (n8n la llama "UserId" pero
--                                              en realidad guarda el
--                                              teléfono, Customer_PhoneNumber)
--   n8n MannychatUserId   -> user_id          (subscriber_id de ManyChat,
--                                              = clients.user_id)
--   n8n SocialNetwork     -> channel
--   n8n Orientation       -> orientation      (mismos valores: 'Incoming'/'Outgoing')
-- ═══════════════════════════════════════════════════════════════════════
BEGIN;

CREATE TABLE IF NOT EXISTS messages (
  id           SERIAL PRIMARY KEY,
  client_id    INTEGER     REFERENCES clients(id) ON DELETE SET NULL,
  user_id      TEXT        NOT NULL,
  phone        TEXT,
  orientation  TEXT        NOT NULL CHECK (orientation IN ('Incoming','Outgoing')),
  message_text TEXT,
  channel      TEXT,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_client_id_idx   ON messages (client_id);
CREATE INDEX IF NOT EXISTS messages_user_id_idx     ON messages (user_id);
CREATE INDEX IF NOT EXISTS messages_phone_idx       ON messages (phone);
CREATE INDEX IF NOT EXISTS messages_sent_at_idx     ON messages (sent_at);
CREATE INDEX IF NOT EXISTS messages_orientation_idx ON messages (orientation);

COMMIT;
