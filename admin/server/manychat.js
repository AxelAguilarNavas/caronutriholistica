// Cliente HTTP mínimo para la API de ManyChat (api.manychat.com).
// Requiere MANYCHAT_API_TOKEN en el entorno. Cada función corresponde a un
// endpoint real de ManyChat — agregar funciones acá, no repetir fetch() en
// las rutas.
const BASE_URL = 'https://api.manychat.com';

function authHeaders() {
  const token = process.env.MANYCHAT_API_TOKEN;
  if (!token) throw new Error('MANYCHAT_API_TOKEN no está configurado');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function manychatRequest(path, options = {}) {
  const r = await fetch(`${BASE_URL}${path}`, { ...options, headers: { ...authHeaders(), ...options.headers } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.status === 'error') {
    const err = new Error(data.message || data.error || `ManyChat respondió ${r.status}`);
    err.status = r.status;
    err.manychat = data;
    throw err;
  }
  return data;
}

export async function getSubscriberInfo(subscriberId) {
  return manychatRequest(`/fb/subscriber/getInfo?subscriber_id=${encodeURIComponent(subscriberId)}`);
}

export async function setCustomFieldByName(subscriberId, fieldName, fieldValue) {
  return manychatRequest('/fb/subscriber/setCustomFieldByName', {
    method: 'POST',
    body: JSON.stringify({ subscriber_id: subscriberId, field_name: fieldName, field_value: fieldValue }),
  });
}

// getInfo devuelve custom_fields como array de {id,name,type,value} (o {}
// vacío si no hay ninguno seteado — típico de un backend PHP serializando
// un array asociativo vacío). Misma semántica que ChatBot.json: bot activo
// si BotStatus es true, vacío o no existe.
export async function getBotStatus(subscriberId) {
  const info = await getSubscriberInfo(subscriberId);
  const fields = info?.data?.custom_fields;
  const field = Array.isArray(fields) ? fields.find((f) => f.name === 'BotStatus') : undefined;
  return field?.value !== false;
}

export async function setBotStatus(subscriberId, enabled) {
  return setCustomFieldByName(subscriberId, 'BotStatus', enabled === true);
}
