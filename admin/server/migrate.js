// Migración idempotente del panel admin sobre el esquema existente
// (scripts/schema.sql). Se ejecuta al arrancar el servidor y también
// manualmente con `npm run migrate`.
//
// Cambios:
//  1. clients.nutrition_plan_text / nutrition_plan_updated_at (nuevos).
//  2. Amplía el CHECK de clients.plan_status con 'paused' (el diseño del
//     panel ofrece Activo/Pausado/Cancelado; se mapean a
//     enrolled/paused/cancelled sin romper los valores existentes).
//  3. Amplía el CHECK de questions.question_type con los tipos del
//     constructor de encuestas (short_text, long_text, single_choice,
//     multiple_choice, yes_no, scale) manteniendo los tipos legados del
//     quiz (checkbox, radio, select, text, severity).
import { pool } from './db.js';

const STATEMENTS = [
  `ALTER TABLE clients ADD COLUMN IF NOT EXISTS nutrition_plan_text TEXT`,
  `ALTER TABLE clients ADD COLUMN IF NOT EXISTS nutrition_plan_updated_at TIMESTAMPTZ`,
  `ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_plan_status_check`,
  `ALTER TABLE clients ADD CONSTRAINT clients_plan_status_check
     CHECK (plan_status IN ('interested','enrolled','paused','completed','cancelled'))`,
  `ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check`,
  `ALTER TABLE questions ADD CONSTRAINT questions_question_type_check
     CHECK (question_type IN ('checkbox','radio','select','text','severity',
                              'short_text','long_text','single_choice','multiple_choice','yes_no','scale'))`,
];

export async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const sql of STATEMENTS) await client.query(sql);
    await client.query('COMMIT');
    console.log('[migrate] OK');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[migrate] ERROR', err);
      process.exit(1);
    });
}
