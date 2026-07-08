export const AVATAR_COLORS = ['#0071e3', '#ff9500', '#34a853', '#af52de', '#ff3b30', '#00a3a3'];

export const QUESTION_TYPES = [
  { value: 'short_text', label: 'Texto corto' },
  { value: 'long_text', label: 'Texto largo' },
  { value: 'single_choice', label: 'Opción única' },
  { value: 'multiple_choice', label: 'Opción múltiple' },
  { value: 'yes_no', label: 'Sí / No' },
  { value: 'scale', label: 'Escala (1-5)' },
];

// Tipos legados del quiz original (evaluacion.html) — solo lectura.
export const LEGACY_TYPE_LABELS = {
  text: 'Texto',
  radio: 'Opción única',
  checkbox: 'Opción múltiple',
  select: 'Lista desplegable',
  severity: 'Escala de severidad',
};

export const CHOICE_TYPES = [
  'single_choice', 'multiple_choice', 'yes_no', 'scale',
  'radio', 'checkbox', 'select', 'severity',
];

export function questionTypeLabel(type) {
  const t = QUESTION_TYPES.find((x) => x.value === type);
  return t ? t.label : LEGACY_TYPE_LABELS[type] || type;
}

export const PLAN_STATUS_OPTIONS = [
  { value: 'enrolled', label: 'Activo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'interested', label: 'Interesado' },
  { value: 'completed', label: 'Completado' },
];

export function planStatusLabel(value) {
  const o = PLAN_STATUS_OPTIONS.find((x) => x.value === value);
  return o ? o.label : value || '—';
}

export function initialsOf(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '·';
}

export function avatarColor(id) {
  return AVATAR_COLORS[Number(id || 0) % AVATAR_COLORS.length];
}

export function fmtDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return String(iso);
  }
}

export function fmtTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(value) {
  const email = String(value || '').trim();
  if (email.length > 254) return false;
  if (!EMAIL_RE.test(email)) return false;
  if (email.includes('..')) return false;
  const [local, domain] = email.split('@');
  if (local.length > 64) return false;
  const tld = domain.split('.').pop();
  if (tld.length < 2) return false;
  return true;
}

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Link para compartir una encuesta. nutribalance-v1 mantiene su flujo
// dedicado (evaluacion.html en el dominio raíz + pipeline de n8n); el
// resto usa el visualizador público /encuesta de este panel. Sin cliente,
// userId queda vacío y hay que completarlo antes de enviar el link.
export function surveyShareLink(survey, client) {
  const userId = client?.user_id || '';
  const sourcePlatform = client?.source_platform || 'manychat';
  if (survey.slug === 'nutribalance-v1') {
    return `https://www.caronutriholistica.tech/?userId=${encodeURIComponent(userId)}&sourcePlatform=${encodeURIComponent(sourcePlatform)}&channel=${encodeURIComponent(client?.channel || 'whatsapp')}`;
  }
  return `${window.location.origin}/encuesta?slug=${encodeURIComponent(survey.slug)}&userId=${encodeURIComponent(userId)}&sourcePlatform=${encodeURIComponent(sourcePlatform)}`;
}

export function surveyQuestionsFlat(survey) {
  const out = [];
  (survey?.sections || []).forEach((sec) => (sec.questions || []).forEach((q) => out.push(q)));
  return out;
}
