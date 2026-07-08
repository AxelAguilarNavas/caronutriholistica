// Rutas públicas (sin login) para el visualizador de encuestas del
// constructor (/encuesta en el frontend). Guarda directo en Postgres, sin
// pasar por el pipeline de n8n/Coco — ese flujo es exclusivo del quiz
// NutriBalance (evaluacion.html). Montado en /api/public ANTES del router
// autenticado (ver index.js).
import { Router } from 'express';
import { pool, query } from './db.js';

export const publicApi = Router();

const CHOICE_TYPES = [
  'single_choice', 'multiple_choice', 'yes_no', 'scale',
  'radio', 'checkbox', 'select', 'severity',
];

async function loadSurveyBySlug(slug) {
  const svRes = await query(
    'SELECT id, name, slug FROM surveys WHERE slug=$1 AND is_active=TRUE',
    [slug]
  );
  if (!svRes.rows.length) return null;
  const survey = svRes.rows[0];

  const [sections, questions, options] = await Promise.all([
    query('SELECT id, name, section_order FROM sections WHERE survey_id=$1 ORDER BY section_order', [survey.id]),
    query(
      `SELECT id, section_id, question_order, question_text, question_type,
              is_required, is_conditional, conditional_on, conditional_value
       FROM questions WHERE survey_id=$1 ORDER BY question_order`,
      [survey.id]
    ),
    query(
      `SELECT qo.id, qo.question_id, qo.option_order, qo.option_text
       FROM question_options qo
       JOIN questions q ON q.id = qo.question_id
       WHERE q.survey_id=$1 ORDER BY qo.question_id, qo.option_order`,
      [survey.id]
    ),
  ]);

  const optionsByQuestion = new Map();
  for (const o of options.rows) {
    if (!optionsByQuestion.has(o.question_id)) optionsByQuestion.set(o.question_id, []);
    optionsByQuestion.get(o.question_id).push({ id: o.id, option_text: o.option_text });
  }
  const questionsBySection = new Map();
  const orphans = [];
  for (const q of questions.rows) {
    const withOpts = { ...q, options: optionsByQuestion.get(q.id) || [] };
    if (q.section_id != null) {
      if (!questionsBySection.has(q.section_id)) questionsBySection.set(q.section_id, []);
      questionsBySection.get(q.section_id).push(withOpts);
    } else {
      orphans.push(withOpts);
    }
  }
  const sectionsOut = sections.rows.map((sec) => ({
    ...sec,
    questions: questionsBySection.get(sec.id) || [],
  }));
  if (orphans.length) {
    sectionsOut.push({ id: null, name: '', section_order: 9999, questions: orphans });
  }

  return { ...survey, sections: sectionsOut };
}

function flatQuestions(survey) {
  return survey.sections.flatMap((sec) => sec.questions);
}

// Una pregunta condicional se muestra solo si la respuesta de su pregunta
// de referencia (conditional_on) coincide con conditional_value. Mismo
// criterio que muestra SurveyDetail en el panel. answersByQuestion mapea
// question_id -> array de textos respondidos.
function visibleQuestions(questions, answersByQuestion) {
  return questions.filter((q) => {
    if (!q.is_conditional || q.conditional_on == null) return true;
    const refAnswers = answersByQuestion.get(q.conditional_on) || [];
    return refAnswers.includes(String(q.conditional_value ?? ''));
  });
}

publicApi.get('/surveys/:slug', async (req, res, next) => {
  try {
    const survey = await loadSurveyBySlug(String(req.params.slug || ''));
    if (!survey) return res.status(404).json({ error: 'Encuesta no disponible' });
    res.json(survey);
  } catch (err) {
    next(err);
  }
});

publicApi.post('/surveys/:slug/submit', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { userId, sourcePlatform, channel, answers } = req.body || {};
    if (!userId || !String(userId).trim() || !sourcePlatform || !String(sourcePlatform).trim()) {
      return res.status(400).json({ error: 'userId y sourcePlatform son obligatorios' });
    }
    if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers debe ser un arreglo' });

    const survey = await loadSurveyBySlug(String(req.params.slug || ''));
    if (!survey) return res.status(404).json({ error: 'Encuesta no disponible' });

    const questions = flatQuestions(survey);
    const questionById = new Map(questions.map((q) => [q.id, q]));

    // Normaliza las respuestas recibidas a question_id -> textos, para
    // evaluar visibilidad condicional y obligatoriedad del lado servidor.
    const byQuestion = new Map();
    const optionTextById = new Map();
    for (const q of questions) for (const o of q.options) optionTextById.set(o.id, { text: o.option_text, questionId: q.id });
    for (const a of answers) {
      const q = questionById.get(Number(a?.question_id));
      if (!q) continue;
      const texts = [];
      if (CHOICE_TYPES.includes(q.question_type)) {
        for (const oid of Array.isArray(a.option_ids) ? a.option_ids : []) {
          const opt = optionTextById.get(Number(oid));
          if (opt && opt.questionId === q.id) texts.push(opt.text);
        }
      } else if (a.text != null && String(a.text).trim() !== '') {
        texts.push(String(a.text).trim());
      }
      if (texts.length) byQuestion.set(q.id, texts);
    }

    const visible = visibleQuestions(questions, byQuestion);
    const missing = visible
      .filter((q) => q.is_required && !(byQuestion.get(q.id) || []).length)
      .map((q) => q.question_text);
    if (missing.length) {
      return res.status(400).json({ error: 'Faltan preguntas obligatorias', missing });
    }

    const clientRes = await query('SELECT id FROM clients WHERE user_id=$1', [String(userId).trim()]);
    const clientId = clientRes.rows[0]?.id ?? null;

    await client.query('BEGIN');
    // raw_payload usa la clave "answers" (no "responses") a propósito: el
    // trigger trg_normalize_answers solo procesa raw_payload->'responses',
    // así que acá no se dispara y el INSERT de submission_answers es manual.
    const subRes = await client.query(
      `INSERT INTO quiz_submissions (client_id, survey_id, user_id, source_platform, channel, is_complete, raw_payload)
       VALUES ($1,$2,$3,$4,$5,TRUE,$6) RETURNING id`,
      [
        clientId, survey.id, String(userId).trim(),
        String(sourcePlatform).trim(), channel ? String(channel).trim() : null,
        JSON.stringify({ userId, sourcePlatform, channel: channel || null, answers }),
      ]
    );
    const submissionId = subRes.rows[0].id;

    const visibleIds = new Set(visible.map((q) => q.id));
    for (const [qid, texts] of byQuestion) {
      if (!visibleIds.has(qid)) continue;
      const q = questionById.get(qid);
      if (CHOICE_TYPES.includes(q.question_type)) {
        for (const text of texts) {
          const opt = q.options.find((o) => o.option_text === text);
          await client.query(
            `INSERT INTO submission_answers (submission_id, survey_id, question_id, option_id, question_order, answer_text)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [submissionId, survey.id, qid, opt?.id ?? null, q.question_order, text]
          );
        }
      } else {
        await client.query(
          `INSERT INTO submission_answers (submission_id, survey_id, question_id, option_id, question_order, answer_text)
           VALUES ($1,$2,$3,NULL,$4,$5)`,
          [submissionId, survey.id, qid, q.question_order, texts[0]]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ ok: true, submissionId });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});
