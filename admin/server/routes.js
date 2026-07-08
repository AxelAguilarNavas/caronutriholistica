import { Router } from 'express';
import { pool, query } from './db.js';
import { requireAuth, isValidEmail } from './auth.js';
import * as manychat from './manychat.js';

export const api = Router();
api.use(requireAuth);

const PLAN_STATUSES = ['interested', 'enrolled', 'paused', 'completed', 'cancelled'];
const QUESTION_TYPES = [
  'checkbox', 'radio', 'select', 'text', 'severity',
  'short_text', 'long_text', 'single_choice', 'multiple_choice', 'yes_no', 'scale',
];

function bad(res, msg) {
  return res.status(400).json({ error: msg });
}

// ─────────────────────────────────────────────────────────────────────
// Bootstrap: todos los datos que el panel carga tras el login
// ─────────────────────────────────────────────────────────────────────
api.get('/bootstrap', async (_req, res, next) => {
  try {
    const [plans, clients, surveys, sections, questions, options, submissions, answers] =
      await Promise.all([
        query('SELECT * FROM plans ORDER BY id'),
        query('SELECT * FROM clients ORDER BY id'),
        query('SELECT * FROM surveys ORDER BY id'),
        query('SELECT * FROM sections ORDER BY survey_id, section_order'),
        query('SELECT * FROM questions ORDER BY survey_id, question_order'),
        query('SELECT * FROM question_options ORDER BY question_id, option_order'),
        query('SELECT id, client_id, survey_id, user_id, source_platform, channel, is_complete, submitted_at FROM quiz_submissions ORDER BY submitted_at DESC'),
        query('SELECT submission_id, question_id, option_id, answer_text FROM submission_answers ORDER BY submission_id, question_order, id'),
      ]);

    const optionsByQuestion = new Map();
    for (const o of options.rows) {
      if (!optionsByQuestion.has(o.question_id)) optionsByQuestion.set(o.question_id, []);
      optionsByQuestion.get(o.question_id).push(o);
    }
    const questionsBySection = new Map();
    const questionsNoSection = new Map(); // survey_id -> []
    for (const q of questions.rows) {
      const withOpts = { ...q, options: optionsByQuestion.get(q.id) || [] };
      if (q.section_id != null) {
        if (!questionsBySection.has(q.section_id)) questionsBySection.set(q.section_id, []);
        questionsBySection.get(q.section_id).push(withOpts);
      } else {
        if (!questionsNoSection.has(q.survey_id)) questionsNoSection.set(q.survey_id, []);
        questionsNoSection.get(q.survey_id).push(withOpts);
      }
    }
    const sectionsBySurvey = new Map();
    for (const sec of sections.rows) {
      if (!sectionsBySurvey.has(sec.survey_id)) sectionsBySurvey.set(sec.survey_id, []);
      sectionsBySurvey.get(sec.survey_id).push({ ...sec, questions: questionsBySection.get(sec.id) || [] });
    }
    const surveysNested = surveys.rows.map((sv) => {
      const secs = sectionsBySurvey.get(sv.id) || [];
      const orphans = questionsNoSection.get(sv.id) || [];
      if (orphans.length) secs.push({ id: null, survey_id: sv.id, name: 'Sin sección', section_order: 9999, questions: orphans });
      return { ...sv, sections: secs };
    });

    const answersBySubmission = new Map();
    for (const a of answers.rows) {
      if (!answersBySubmission.has(a.submission_id)) answersBySubmission.set(a.submission_id, []);
      answersBySubmission.get(a.submission_id).push({ question_id: a.question_id, option_id: a.option_id, answer_text: a.answer_text });
    }
    const submissionsOut = submissions.rows.map((s) => ({ ...s, answers: answersBySubmission.get(s.id) || [] }));

    res.json({ plans: plans.rows, clients: clients.rows, surveys: surveysNested, submissions: submissionsOut });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────
// Clientes
// ─────────────────────────────────────────────────────────────────────
api.patch('/clients/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { name, email, phone, channel, source_platform, plan_id, plan_status, notes } = req.body || {};
    if (!name || !String(name).trim()) return bad(res, 'El nombre es obligatorio');
    if (!isValidEmail(email)) return bad(res, 'El correo del cliente no es válido');
    if (plan_status != null && plan_status !== '' && !PLAN_STATUSES.includes(plan_status)) return bad(res, 'Estado de plan inválido');
    const { rows } = await query(
      `UPDATE clients SET name=$1, email=$2, phone=$3, channel=$4, source_platform=$5,
              plan_id=$6, plan_status=$7, notes=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [String(name).trim(), String(email).trim(), phone || null, channel || null, source_platform || null,
       plan_id || null, plan_status || null, notes || null, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

api.patch('/clients/:id/vip', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { is_vip, vip_reason } = req.body || {};
    const { rows } = is_vip
      ? await query(
          `UPDATE clients SET is_vip=TRUE, vip_set_by='manual', vip_set_at=COALESCE(vip_set_at, NOW()),
                  vip_reason=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
          [vip_reason || null, id]
        )
      : await query(
          `UPDATE clients SET is_vip=FALSE, vip_set_by=NULL, vip_set_at=NULL, vip_reason=NULL,
                  updated_at=NOW() WHERE id=$1 RETURNING *`,
          [id]
        );
    if (!rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

api.patch('/clients/:id/bot-status', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { bot_enabled } = req.body || {};
    if (typeof bot_enabled !== 'boolean') return bad(res, 'bot_enabled debe ser booleano');

    const current = await query('SELECT user_id FROM clients WHERE id=$1', [id]);
    if (!current.rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    const subscriberId = current.rows[0].user_id;

    let synced = false, syncError = null;
    if (!subscriberId) {
      syncError = 'El cliente no tiene user_id de ManyChat; solo se guardó en el panel';
    } else {
      try {
        await manychat.setBotStatus(subscriberId, bot_enabled);
        synced = true;
      } catch (e) {
        syncError = e.message;
      }
    }

    const { rows } = await query(
      `UPDATE clients SET bot_enabled=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [bot_enabled, id]
    );
    res.json({ client: rows[0], synced, syncError });
  } catch (err) {
    next(err);
  }
});

api.post('/clients/:id/bot-status/sync', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const current = await query('SELECT user_id, bot_enabled FROM clients WHERE id=$1', [id]);
    if (!current.rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    const { user_id: subscriberId, bot_enabled: localValue } = current.rows[0];
    if (!subscriberId) return res.json({ client: null, synced: false });

    let remoteValue;
    try {
      remoteValue = await manychat.getBotStatus(subscriberId);
    } catch {
      return res.json({ client: null, synced: false });
    }
    if (remoteValue === localValue) return res.json({ client: null, synced: true });

    const { rows } = await query(
      `UPDATE clients SET bot_enabled=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [remoteValue, id]
    );
    res.json({ client: rows[0], synced: true });
  } catch (err) {
    next(err);
  }
});

api.patch('/clients/:id/nutrition-plan', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { nutrition_plan_text } = req.body || {};
    const { rows } = await query(
      `UPDATE clients SET nutrition_plan_text=$1, nutrition_plan_updated_at=NOW(), updated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [nutrition_plan_text || '', id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────
// Mensajería (solo lectura por ahora — el envío está en construcción)
// ─────────────────────────────────────────────────────────────────────
api.get('/messages/latest', async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT DISTINCT ON (m.user_id)
        m.user_id, c.id AS client_id, m.message_text, m.orientation, m.sent_at
      FROM messages m
      LEFT JOIN clients c ON c.user_id = m.user_id
      ORDER BY m.user_id, m.sent_at DESC
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

api.get('/clients/:id/messages', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const clientRes = await query('SELECT user_id FROM clients WHERE id=$1', [id]);
    if (!clientRes.rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    const userId = clientRes.rows[0].user_id;
    const { rows } = await query(
      `SELECT id, orientation, message_text, channel, sent_at FROM messages
       WHERE client_id=$1 OR user_id=$2 ORDER BY sent_at ASC`,
      [id, userId || '']
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────
// Planes
// ─────────────────────────────────────────────────────────────────────
api.post('/plans', async (req, res, next) => {
  try {
    const { name, description, price_usd, is_active } = req.body || {};
    if (!name || !String(name).trim()) return bad(res, 'El nombre del plan es obligatorio');
    const { rows } = await query(
      `INSERT INTO plans (name, description, price_usd, is_active) VALUES ($1,$2,$3,$4) RETURNING *`,
      [String(name).trim(), description || null, Number(price_usd) || 0, is_active !== false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

api.patch('/plans/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const current = await query('SELECT * FROM plans WHERE id=$1', [id]);
    if (!current.rows.length) return res.status(404).json({ error: 'Plan no encontrado' });
    const c = current.rows[0];
    const body = req.body || {};
    const name = body.name !== undefined ? String(body.name).trim() : c.name;
    if (!name) return bad(res, 'El nombre del plan es obligatorio');
    const { rows } = await query(
      `UPDATE plans SET name=$1, description=$2, price_usd=$3, is_active=$4 WHERE id=$5 RETURNING *`,
      [
        name,
        body.description !== undefined ? body.description : c.description,
        body.price_usd !== undefined ? Number(body.price_usd) || 0 : c.price_usd,
        body.is_active !== undefined ? !!body.is_active : c.is_active,
        id,
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

api.delete('/plans/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM plans WHERE id=$1', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────
// Encuestas (estructura anidada)
// ─────────────────────────────────────────────────────────────────────
function validateSurveyPayload(body) {
  if (!body || !body.name || !String(body.name).trim()) return 'El nombre de la encuesta es obligatorio';
  if (!Array.isArray(body.sections)) return 'La encuesta debe incluir secciones';
  for (const sec of body.sections) {
    if (!Array.isArray(sec.questions)) return 'Cada sección debe incluir preguntas';
    for (const q of sec.questions) {
      if (!q.question_text || !String(q.question_text).trim()) return 'Toda pregunta debe tener texto';
      if (!QUESTION_TYPES.includes(q.question_type)) return `Tipo de pregunta inválido: ${q.question_type}`;
    }
  }
  return null;
}

// Inserta secciones/preguntas/opciones de una encuesta. `conditional_on`
// llega como índice plano (posición de la pregunta en el formulario) y se
// convierte al id real insertado.
async function insertStructure(client, surveyId, sections) {
  let questionOrder = 0;
  const idByFlatIndex = [];
  let flatIndex = 0;
  const pendingConditionals = []; // { questionId, dependsOnFlatIndex, value }

  for (let si = 0; si < sections.length; si++) {
    const sec = sections[si];
    const secRes = await client.query(
      `INSERT INTO sections (survey_id, section_order, name) VALUES ($1,$2,$3) RETURNING id`,
      [surveyId, si + 1, String(sec.name || '').trim() || `Sección ${si + 1}`]
    );
    const sectionId = secRes.rows[0].id;

    for (const q of sec.questions) {
      questionOrder += 1;
      const qRes = await client.query(
        `INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type,
                                is_required, is_conditional, conditional_on, conditional_value)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,$8) RETURNING id`,
        [
          surveyId, sectionId, questionOrder,
          String(q.question_text).trim(), q.question_type,
          !!q.is_required, !!q.is_conditional,
          q.is_conditional ? (q.conditional_value || '') : null,
        ]
      );
      const questionId = qRes.rows[0].id;
      idByFlatIndex[flatIndex] = questionId;

      if (q.is_conditional && q.conditional_on != null && q.conditional_on !== '') {
        pendingConditionals.push({ questionId, dependsOnFlatIndex: Number(q.conditional_on) });
      }

      const opts = Array.isArray(q.options) ? q.options.filter((o) => String(o.option_text || '').trim()) : [];
      for (let oi = 0; oi < opts.length; oi++) {
        await client.query(
          `INSERT INTO question_options (question_id, option_order, option_text, option_value)
           VALUES ($1,$2,$3,$4)`,
          [questionId, oi + 1, String(opts[oi].option_text).trim(), opts[oi].option_value || null]
        );
      }
      flatIndex += 1;
    }
  }

  for (const pc of pendingConditionals) {
    const dependsOnId = idByFlatIndex[pc.dependsOnFlatIndex];
    if (dependsOnId) {
      await client.query('UPDATE questions SET conditional_on=$1 WHERE id=$2', [dependsOnId, pc.questionId]);
    }
  }
}

async function surveyResponsesCount(surveyId, client = pool) {
  const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM quiz_submissions WHERE survey_id=$1', [surveyId]);
  return rows[0].n;
}

api.post('/surveys', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const err = validateSurveyPayload(req.body);
    if (err) return bad(res, err);
    const { name, slug, version, sections } = req.body;
    await client.query('BEGIN');
    const svRes = await client.query(
      `INSERT INTO surveys (name, slug, version, is_active) VALUES ($1,$2,$3,TRUE) RETURNING id`,
      [
        String(name).trim(),
        (slug || String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) || `encuesta-${Date.now()}`,
        version || 'v1',
      ]
    );
    await insertStructure(client, svRes.rows[0].id, sections);
    await client.query('COMMIT');
    res.status(201).json({ id: svRes.rows[0].id });
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === '23505') return bad(res, 'Ya existe una encuesta con ese slug');
    next(e);
  } finally {
    client.release();
  }
});

api.put('/surveys/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    const err = validateSurveyPayload(req.body);
    if (err) return bad(res, err);
    if ((await surveyResponsesCount(id)) > 0) {
      return res.status(409).json({ error: 'Esta encuesta ya tiene respuestas registradas — su estructura no puede editarse.' });
    }
    const { name, slug, version, sections } = req.body;
    await client.query('BEGIN');
    const upd = await client.query(
      `UPDATE surveys SET name=$1, slug=$2, version=$3 WHERE id=$4 RETURNING id`,
      [String(name).trim(), slug || `encuesta-${id}`, version || 'v1', id]
    );
    if (!upd.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Encuesta no encontrada' });
    }
    await client.query('DELETE FROM questions WHERE survey_id=$1', [id]);
    await client.query('DELETE FROM sections WHERE survey_id=$1', [id]);
    await insertStructure(client, id, sections);
    await client.query('COMMIT');
    res.json({ id });
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === '23505') return bad(res, 'Ya existe una encuesta con ese slug');
    next(e);
  } finally {
    client.release();
  }
});

api.patch('/surveys/:id/active', async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE surveys SET is_active = NOT is_active WHERE id=$1 RETURNING *`,
      [Number(req.params.id)]
    );
    if (!rows.length) return res.status(404).json({ error: 'Encuesta no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

api.delete('/surveys/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if ((await surveyResponsesCount(id)) > 0) {
      return res.status(409).json({ error: 'Esta encuesta ya tiene respuestas registradas — no puede eliminarse.' });
    }
    await query('DELETE FROM surveys WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────
// Respuestas de encuesta (quiz_submissions)
// ─────────────────────────────────────────────────────────────────────
api.put('/submissions/:id/answers', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    const { answers } = req.body || {};
    if (!Array.isArray(answers)) return bad(res, 'answers debe ser un arreglo');
    const subRes = await client.query('SELECT id, survey_id FROM quiz_submissions WHERE id=$1', [id]);
    if (!subRes.rows.length) return res.status(404).json({ error: 'Respuesta no encontrada' });
    const surveyId = subRes.rows[0].survey_id;
    const qRes = await client.query('SELECT id, question_order FROM questions WHERE survey_id=$1', [surveyId]);
    const orderByQuestion = new Map(qRes.rows.map((q) => [q.id, q.question_order]));

    await client.query('BEGIN');
    await client.query('DELETE FROM submission_answers WHERE submission_id=$1', [id]);
    for (const a of answers) {
      if (!orderByQuestion.has(a.question_id)) continue;
      const text = a.answer_text == null ? '' : String(a.answer_text);
      if (text.trim() === '') continue;
      await client.query(
        `INSERT INTO submission_answers (submission_id, survey_id, question_id, option_id, question_order, answer_text)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, surveyId, a.question_id, a.option_id || null, orderByQuestion.get(a.question_id), text]
      );
    }
    await client.query('COMMIT');

    const saved = await client.query(
      'SELECT question_id, option_id, answer_text FROM submission_answers WHERE submission_id=$1 ORDER BY question_order, id',
      [id]
    );
    res.json({ id, answers: saved.rows });
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
});

api.delete('/submissions/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM quiz_submissions WHERE id=$1', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
