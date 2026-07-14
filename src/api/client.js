/**
 * Client API minimale: cookie httpOnly gestiti dal browser (same-origin),
 * risposte JSON, errori normalizzati in Error con message leggibile.
 */
async function request(path, { method = 'GET', body, formData } = {}) {
  const opts = { method, headers: {} }
  if (formData) {
    opts.body = formData
  } else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }

  const res = await fetch(path, opts)
  let payload = null
  try {
    payload = await res.json()
  } catch {
    /* risposta senza body */
  }

  if (!res.ok) {
    const err = new Error(payload?.error || `Errore ${res.status}`)
    err.status = res.status
    throw err
  }
  return payload
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  postForm: (path, formData) => request(path, { method: 'POST', formData }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  patchForm: (path, formData) => request(path, { method: 'PATCH', formData }),
  delete: (path) => request(path, { method: 'DELETE' }),
}

export const CRANE_TYPES = [
  { value: 'CINGOLATA', label: 'Gru cingolata' },
  { value: 'RAGNO', label: 'Gru ragno' },
  { value: 'AUTOCARRATA', label: 'Gru autocarrata' },
  { value: 'TORRE', label: 'Gru a torre' },
]

export function craneTypeLabel(value) {
  return CRANE_TYPES.find((t) => t.value === value)?.label ?? value
}
