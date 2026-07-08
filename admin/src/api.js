async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* respuesta sin cuerpo */
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Error ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const apiGet = (url) => request('GET', url);
export const apiPost = (url, body) => request('POST', url, body);
export const apiPatch = (url, body) => request('PATCH', url, body);
export const apiPut = (url, body) => request('PUT', url, body);
export const apiDelete = (url) => request('DELETE', url);
