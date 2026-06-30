-- ═══════════════════════════════════════════════════════════════════════
-- seed-quiz.sql — Datos iniciales: planes, survey, secciones, preguntas y opciones
-- Ejecutar DESPUÉS de schema.sql
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- PLANES
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO plans (name, description, price_usd) VALUES
  ('Reto 21 Días',      'Programa grupal de 21 días para ordenar hormonas y hábitos', 47.00),
  ('Plan $300',         'Programa intensivo con seguimiento personalizado',           300.00),
  ('1:1 Premium',       'Consultoría 1 a 1 con Carolina Marino',                     NULL),
  ('Comunidad Mensual', 'Acceso mensual a comunidad y sesiones grupales',             29.00);

-- ───────────────────────────────────────────────────────────────────────
-- SURVEY
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO surveys (name, slug, version, is_active) VALUES
  ('Evaluación NutriBalance', 'nutribalance-v1', '1.0', true);
-- survey_id = 1

-- ───────────────────────────────────────────────────────────────────────
-- SECCIONES
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO sections (survey_id, section_order, name) VALUES
  (1,  1, 'Reconocimiento inicial'),
  (1,  2, 'País de residencia'),
  (1,  3, 'Perfil demográfico'),
  (1,  4, 'Síntomas principales'),
  (1,  5, 'Historial del problema'),
  (1,  6, 'Detonantes y motivaciones'),
  (1,  7, 'Pregunta de intención'),
  (1,  8, 'Hábitos de salud'),
  (1,  9, 'Síntomas vasomotores y hormonales'),
  (1, 10, 'Sueño y sistema nervioso'),
  (1, 11, 'Estado de ánimo y cognitivo'),
  (1, 12, 'Tiroides y metabolismo'),
  (1, 13, 'Minerales y músculo'),
  (1, 14, 'Digestión, azúcar e inflamación'),
  (1, 15, 'Resumen de síntomas'),
  (1, 16, 'Triaje de seguridad'),
  (1, 17, 'Preferencias comerciales'),
  (1, 18, 'Datos de contacto');
-- section_id 1..18

-- ───────────────────────────────────────────────────────────────────────
-- HELPER: insertar opción buscando la pregunta por question_order
-- ───────────────────────────────────────────────────────────────────────
-- Se usa un bloque DO para mayor legibilidad; todas las opciones usan
-- (SELECT id FROM questions WHERE survey_id=1 AND question_order=N).

-- ═══ SECCIÓN 1: Reconocimiento inicial ═══════════════════════════════════
INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 1, 1, 'Marca lo que reconoces', 'checkbox');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1, 'Me dijeron que mis análisis están bien pero yo sigo sintiéndome mal'),
  (2, 'Me levanto cansada aunque haya dormido'),
  (3, 'Mi humor cambió y yo misma no me reconozco'),
  (4, 'Subo de peso aunque me cuido'),
  (5, 'Tengo ansiedad o palpitaciones sin razón clara'),
  (6, 'Siento que me estoy perdiendo de mí misma')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 1;

-- ═══ SECCIÓN 2: País de residencia ═══════════════════════════════════════
INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 2, 2, '¿En qué país resides actualmente?', 'select');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  ( 1,'Estados Unidos'),( 2,'Canadá'),( 3,'México'),( 4,'Costa Rica'),
  ( 5,'Guatemala'),( 6,'Honduras'),( 7,'El Salvador'),( 8,'Nicaragua'),
  ( 9,'Panamá'),(10,'República Dominicana'),(11,'Cuba'),(12,'Puerto Rico'),
  (13,'Colombia'),(14,'Venezuela'),(15,'Ecuador'),(16,'Perú'),
  (17,'Bolivia'),(18,'Chile'),(19,'Argentina'),(20,'Uruguay'),
  (21,'Paraguay'),(22,'España'),(23,'Otro país de Europa'),(24,'Otro país')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 2;

-- ═══ SECCIÓN 3: Perfil demográfico ═══════════════════════════════════════
INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 3, 3, '¿Cuál es tu edad?', 'radio');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'Menos de 35'),(2,'35–39'),(3,'40–44'),(4,'45–49'),
  (5,'50–54'),(6,'55–60'),(7,'Más de 60')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 3;

INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 3, 4, '¿Cuál describe mejor tu situación actual?', 'radio');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'Trabajo tiempo completo'),
  (2,'Trabajo medio tiempo'),
  (3,'Tengo mi propio negocio o emprendimiento'),
  (4,'Soy profesional independiente'),
  (5,'Me dedico principalmente al hogar y la familia'),
  (6,'Estoy jubilada o retirada'),
  (7,'Otra')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 4;

INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 3, 5, '¿Cuál es el síntoma que más afecta tu calidad de vida hoy?', 'radio');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'No duermo bien'),(2,'Ansiedad o irritabilidad'),
  (3,'Inflamación abdominal'),(4,'Antojos de azúcar'),
  (5,'Falta de energía'),(6,'Sofocos o sudores nocturnos'),
  (7,'Aumento de peso'),(8,'Dolor articular'),
  (9,'Problemas digestivos'),(10,'Otro')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 5;

-- ═══ SECCIÓN 4: Síntomas principales ══════════════════════════════════════
INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 4, 6, '¿Cuál es el segundo síntoma que más te gustaría resolver?', 'radio');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'No duermo bien'),(2,'Ansiedad o irritabilidad'),
  (3,'Inflamación abdominal'),(4,'Antojos de azúcar'),
  (5,'Falta de energía'),(6,'Sofocos o sudores nocturnos'),
  (7,'Aumento de peso'),(8,'Dolor articular'),
  (9,'Problemas digestivos'),(10,'Otro')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 6;

INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 4, 7, '¿Hace cuánto tiempo este problema afecta tu vida?', 'radio');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'Menos de 3 meses'),(2,'3 a 12 meses'),
  (3,'1 a 3 años'),(4,'Más de 3 años')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 7;

-- ═══ SECCIÓN 5: Historial del problema ════════════════════════════════════
INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 5, 8, 'Si este problema continúa igual durante otro año, ¿qué es lo que más te preocupa?', 'radio');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'Dormir peor'),(2,'Subir más de peso'),(3,'Tener menos energía'),
  (4,'Sentirme más ansiosa'),(5,'Necesitar más medicamentos'),
  (6,'No reconocerme'),(7,'Que afecte mi relación de pareja'),
  (8,'Que afecte mi trabajo'),(9,'Otro')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 8;

INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 5, 9, '¿Qué has intentado para sentirte mejor?', 'checkbox');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'Suplementos'),(2,'Dietas'),(3,'Nutricionista'),
  (4,'Ginecólogo'),(5,'Endocrinólogo'),(6,'Hormonas / TRH'),
  (7,'Ejercicio'),(8,'Terapia psicológica'),
  (9,'Remedios naturales'),(10,'Nada todavía')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 9;

INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 5, 10, 'Aproximadamente, ¿cuánto has gastado intentando resolver este problema?', 'radio');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'Nada'),(2,'Menos de $100 USD'),(3,'$100–$500 USD'),
  (4,'$500–$1,000 USD'),(5,'Más de $1,000 USD')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 10;

INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 5, 11, '¿Qué fue lo que te hizo buscar ayuda justamente ahora?', 'radio');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'Los síntomas empeoraron'),(2,'Ya no estoy durmiendo bien'),
  (3,'Mi ansiedad aumentó'),(4,'Subí de peso'),
  (5,'Mi médico me dijo que era normal'),
  (6,'Vi información que me hizo reflexionar'),
  (7,'Una amiga me recomendó buscar ayuda'),
  (8,'Siento que ya no puedo seguir igual'),(9,'Otro')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 11;

-- ═══ SECCIÓN 6: Detonantes y motivaciones ═════════════════════════════════
INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 6, 12, '¿Cuál de estas frases se parece más a ti?', 'radio');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'Me cuesta priorizarme cuando otros me necesitan'),
  (2,'Suelo poner las necesidades de mi familia antes que las mías'),
  (3,'Me siento culpable cuando gasto dinero en mí'),
  (4,'Me resulta más fácil cuidar a otros que cuidarme a mí'),
  (5,'No me identifico con ninguna')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 12;

INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 6, 13, '¿Qué es lo más difícil para ti en este momento?', 'radio');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'Encontrar tiempo para mí'),(2,'Tener energía durante el día'),
  (3,'Ser constante'),(4,'Saber qué hacer'),
  (5,'Dejar de sentirme culpable'),(6,'Mantener hábitos saludables')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 13;

-- ═══ SECCIÓN 7: Pregunta de intención (texto libre) ═══════════════════════
INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type, is_required)
VALUES (1, 7, 14, 'Si pudiera resolver ___ en los próximos 30 días, sentiría que voy por buen camino.', 'text', true);
-- Sin opciones

-- ═══ SECCIÓN 8: Hábitos de salud ══════════════════════════════════════════
INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 8, 15, '¿Cuánta agua tomas al día?', 'select');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'Menos de 1 litro'),(2,'Entre 1 y 2 litros'),(3,'Más de 2 litros')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 15;

INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 8, 16, '¿Cuántos cafés tomas al día?', 'select');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'Ninguno'),(2,'1 café'),(3,'2 a 3 cafés'),(4,'Más de 3 cafés')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 16;

INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 8, 17, 'Horas de sueño promedio por noche', 'select');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'Menos de 5 horas'),(2,'5 a 6 horas'),(3,'7 a 8 horas'),
  (4,'Más de 8 horas pero me levanto cansada')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 17;

INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 8, 18, 'Nivel de estrés diario (1 bajo — 5 muy alto)', 'select');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'1 — Bajo'),(2,'2 — Leve'),(3,'3 — Moderado'),
  (4,'4 — Alto'),(5,'5 — Muy alto')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 18;

INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 8, 19, '¿Cómo está tu ciclo menstrual actualmente?', 'select');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'Regular (cada 28-32 días)'),(2,'Irregular'),
  (3,'Sin menstruación hace menos de 1 año'),
  (4,'Sin menstruación hace más de 1 año'),
  (5,'Menopausia quirúrgica')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 19;

INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 8, 20, '¿Cuántas veces vas al baño (evacuación) al día?', 'select');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'Menos de 1 vez'),(2,'1 vez'),(3,'2 a 3 veces'),(4,'Más de 3 veces')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 20;

INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 8, 21, '¿Cómo son tus evacuaciones habitualmente?', 'select');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'Normales / formadas'),(2,'Duras o con esfuerzo'),
  (3,'Sueltas o líquidas'),(4,'Variables')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 21;

-- ═══ SECCIÓN 9: Síntomas vasomotores y hormonales (Q22–Q29, severity) ════
INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type) VALUES
  (1, 9, 22, 'Sofocos o calores repentinos de día',            'severity'),
  (1, 9, 23, 'Sudores nocturnos que me despiertan',            'severity'),
  (1, 9, 24, 'Palpitaciones sin causa cardíaca confirmada',    'severity'),
  (1, 9, 25, 'Ciclo irregular o muy diferente a antes',        'severity'),
  (1, 9, 26, 'Pérdida de libido o sequedad vaginal',           'severity'),
  (1, 9, 27, 'Senos sensibles o hinchados sin razón',          'severity'),
  (1, 9, 28, 'Irritabilidad nueva que no reconozco en mí',     'severity'),
  (1, 9, 29, 'Nerviosismo antes del período o sin razón',      'severity');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT q.id, o.n, o.txt
FROM questions q
CROSS JOIN (VALUES (1,'0 - Sin síntoma'),(2,'1 - Leve'),(3,'2 - Moderado'),(4,'3 - Severo')) AS o(n, txt)
WHERE q.survey_id = 1 AND q.question_order BETWEEN 22 AND 29;

-- ═══ SECCIÓN 10: Sueño y sistema nervioso (Q30–Q37, severity) ════════════
INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type) VALUES
  (1, 10, 30, 'Me despierto entre las 2 y 4am sin poder volver a dormir', 'severity'),
  (1, 10, 31, 'Me levanto cansada aunque dormí suficientes horas',        'severity'),
  (1, 10, 32, 'Dificultad para quedarme dormida',                         'severity'),
  (1, 10, 33, 'Ansiedad sin razón clara',                                 'severity'),
  (1, 10, 34, 'Energía alta en la noche, baja en la mañana',              'severity'),
  (1, 10, 35, 'Fatiga que no mejora aunque duerma',                       'severity'),
  (1, 10, 36, 'Dificultad para relajarme o desconectarme',                'severity'),
  (1, 10, 37, 'Sensación de alerta sin peligro real',                     'severity');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT q.id, o.n, o.txt
FROM questions q
CROSS JOIN (VALUES (1,'0 - Sin síntoma'),(2,'1 - Leve'),(3,'2 - Moderado'),(4,'3 - Severo')) AS o(n, txt)
WHERE q.survey_id = 1 AND q.question_order BETWEEN 30 AND 37;

-- ═══ SECCIÓN 11: Estado de ánimo y cognitivo (Q38–Q45, severity) ═════════
INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type) VALUES
  (1, 11, 38, 'Tristeza o ganas de llorar sin razón clara',             'severity'),
  (1, 11, 39, 'Cambios de humor que me sorprenden a mí misma',          'severity'),
  (1, 11, 40, 'Más deprimida que de costumbre',                         'severity'),
  (1, 11, 41, 'Niebla mental o dificultad para concentrarme',           'severity'),
  (1, 11, 42, 'Olvidos frecuentes o memoria que falla',                 'severity'),
  (1, 11, 43, 'Dificultad para encontrar palabras al hablar',           'severity'),
  (1, 11, 44, 'El estrés me afecta mucho más que antes',                'severity'),
  (1, 11, 45, 'Llanto fácil o reacciones emocionales fuertes',          'severity');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT q.id, o.n, o.txt
FROM questions q
CROSS JOIN (VALUES (1,'0 - Sin síntoma'),(2,'1 - Leve'),(3,'2 - Moderado'),(4,'3 - Severo')) AS o(n, txt)
WHERE q.survey_id = 1 AND q.question_order BETWEEN 38 AND 45;

-- ═══ SECCIÓN 12: Tiroides y metabolismo (Q46–Q53, severity) ══════════════
INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type) VALUES
  (1, 12, 46, 'Fatiga profunda aunque haya dormido',                         'severity'),
  (1, 12, 47, 'Caída de cabello más de lo normal',                           'severity'),
  (1, 12, 48, 'Frío en manos y pies con frecuencia',                         'severity'),
  (1, 12, 49, 'Niebla mental o dificultad para concentrarme (tiroides)',      'severity'),
  (1, 12, 50, 'Olvidos frecuentes o memoria que falla (tiroides)',            'severity'),
  (1, 12, 51, 'El médico me dijo que estaba bien pero no me siento bien',    'severity'),
  (1, 12, 52, 'El peso no baja aunque me cuide y haga ejercicio',            'severity'),
  (1, 12, 53, 'Me levanto lenta y gano energía en la tarde',                 'severity');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT q.id, o.n, o.txt
FROM questions q
CROSS JOIN (VALUES (1,'0 - Sin síntoma'),(2,'1 - Leve'),(3,'2 - Moderado'),(4,'3 - Severo')) AS o(n, txt)
WHERE q.survey_id = 1 AND q.question_order BETWEEN 46 AND 53;

-- ═══ SECCIÓN 13: Minerales y músculo (Q54–Q61, severity) ═════════════════
INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type) VALUES
  (1, 13, 54, 'Calambres en piernas o pies, especialmente de noche', 'severity'),
  (1, 13, 55, 'Dolor en articulaciones al despertar',                'severity'),
  (1, 13, 56, 'Uñas quebradizas o que crecen lento',                'severity'),
  (1, 13, 57, 'Cabello seco o con caída excesiva',                  'severity'),
  (1, 13, 58, 'Dolor de cabeza nuevo o más frecuente',              'severity'),
  (1, 13, 59, 'Pérdida de masa muscular aunque haga ejercicio',     'severity'),
  (1, 13, 60, 'Manchas blancas en las uñas',                        'severity'),
  (1, 13, 61, 'Heridas que tardan en sanar',                        'severity');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT q.id, o.n, o.txt
FROM questions q
CROSS JOIN (VALUES (1,'0 - Sin síntoma'),(2,'1 - Leve'),(3,'2 - Moderado'),(4,'3 - Severo')) AS o(n, txt)
WHERE q.survey_id = 1 AND q.question_order BETWEEN 54 AND 61;

-- ═══ SECCIÓN 14: Digestión, azúcar e inflamación (Q62–Q69, severity) ════
INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type) VALUES
  (1, 14, 62, 'Me hincho durante el día aunque coma poco',               'severity'),
  (1, 14, 63, 'Gases o eructos frecuentes después de comer',             'severity'),
  (1, 14, 64, 'Bajón de energía a las 3pm',                              'severity'),
  (1, 14, 65, 'Antojos de dulce o pan después de comer',                 'severity'),
  (1, 14, 66, 'Grasa abdominal que no baja aunque me cuide',             'severity'),
  (1, 14, 67, 'Tomo suplementos pero no noto diferencia real',           'severity'),
  (1, 14, 68, 'Infecciones urinarias o vaginales frecuentes',            'severity'),
  (1, 14, 69, 'Cansancio después de comer',                              'severity');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT q.id, o.n, o.txt
FROM questions q
CROSS JOIN (VALUES (1,'0 - Sin síntoma'),(2,'1 - Leve'),(3,'2 - Moderado'),(4,'3 - Severo')) AS o(n, txt)
WHERE q.survey_id = 1 AND q.question_order BETWEEN 62 AND 69;

-- ═══ SECCIÓN 15: Resumen de síntomas ══════════════════════════════════════
INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 15, 70, '¿Cuánto tiempo llevas sintiéndote así?', 'radio');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'Menos de 6 meses'),(2,'Entre 6 meses y 1 año'),
  (3,'Entre 1 y 2 años'),(4,'Más de 2 años')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 70;

INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 15, 71, '¿Qué has intentado antes para sentirte mejor?', 'radio');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'No he intentado nada todavía'),
  (2,'Fui al médico y me dijeron que estaba bien'),
  (3,'Tomé suplementos por cuenta propia'),
  (4,'Cambié la dieta o probé algún plan'),
  (5,'Varias cosas y ninguna funcionó del todo')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 71;

-- ═══ SECCIÓN 16: Triaje de seguridad ══════════════════════════════════════
INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 16, 72, '¿Estás actualmente en tratamiento activo por cáncer?', 'radio');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES (1,'No'),(2,'Sí')) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 72;

INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 16, 73, '¿Estás embarazada o en período de lactancia activa?', 'radio');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES (1,'No'),(2,'Sí')) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 73;

INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 16, 74, '¿Tienes insuficiencia renal diagnosticada?', 'radio');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES (1,'No'),(2,'Sí')) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 74;

INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 16, 75, '¿Estás tomando algún medicamento psiquiátrico actualmente?', 'radio');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES (1,'No'),(2,'Sí')) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 75;

-- Q76: CONDICIONAL — solo aparece si Q75 = 'Sí'
INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type,
                       is_conditional, conditional_on, conditional_value)
SELECT 1, 16, 76, '¿Cuál o cuáles? (nombre del medicamento)', 'text',
       true, id, 'Sí'
FROM questions WHERE survey_id = 1 AND question_order = 75;
-- Sin opciones (texto libre)

INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 16, 77, 'En las últimas 2 semanas, ¿has tenido pensamientos de no querer estar aquí o de hacerte daño?', 'radio');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'No'),(2,'A veces'),(3,'Sí, casi todos los días')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 77;

INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 16, 78, '¿Tienes antecedentes familiares de cáncer hormonal (mama, ovario, útero)?', 'radio');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES (1,'No'),(2,'Sí'),(3,'No sé')) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 78;

-- ═══ SECCIÓN 17: Preferencias comerciales ═════════════════════════════════
INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 17, 79, '¿Cuál de estas opciones te haría decir: "esto es exactamente lo que necesito ahora"?', 'radio');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'Entender qué le pasa a mi cuerpo y por dónde empezar'),
  (2,'Dormir mejor y despertar con más energía'),
  (3,'Desinflamar mi barriga y sentirme más liviana'),
  (4,'Calmar la ansiedad, las palpitaciones y la irritabilidad'),
  (5,'Bajar de peso sin seguir probando dietas al azar'),
  (6,'Ordenar mis hormonas después de los 40')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 79;

INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 17, 80, '¿Cómo prefieres aprender?', 'checkbox');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'Guías PDF'),(2,'Videos cortos'),(3,'Audios'),
  (4,'Comunidad privada'),(5,'Sesiones grupales'),(6,'Sesiones individuales')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 80;

INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 17, 81, 'Si decidieras empezar por algo pequeño, ¿qué probarías primero?', 'radio');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'Reto 21 días acompañado'),(2,'Taller en vivo'),
  (3,'Mini curso'),(4,'Comunidad mensual'),
  (5,'Programa completo'),(6,'Consulta privada')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 81;

INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 17, 82, 'Si encontraras una solución que realmente se adapte a tu situación, ¿qué inversión mensual considerarías razonable?', 'radio');

INSERT INTO question_options (question_id, option_order, option_text)
SELECT id, n, txt FROM questions, (VALUES
  (1,'Menos de $20 USD'),(2,'$20–$50 USD'),
  (3,'$50–$100 USD'),(4,'$100–$200 USD'),(5,'Más de $200 USD')
) AS opts(n, txt)
WHERE survey_id = 1 AND question_order = 82;

-- ═══ SECCIÓN 18: Datos de contacto ════════════════════════════════════════
INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 18, 83, 'Nombre', 'text');
-- Sin opciones

INSERT INTO questions (survey_id, section_id, question_order, question_text, question_type)
VALUES (1, 18, 84, 'Correo electrónico', 'text');
-- Sin opciones

COMMIT;

-- ───────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ───────────────────────────────────────────────────────────────────────
\echo ''
\echo 'Seed completado. Conteos:'
SELECT 'plans'            AS tabla, count(*) FROM plans
UNION ALL
SELECT 'surveys',          count(*) FROM surveys
UNION ALL
SELECT 'sections',         count(*) FROM sections
UNION ALL
SELECT 'questions',        count(*) FROM questions
UNION ALL
SELECT 'question_options', count(*) FROM question_options;
