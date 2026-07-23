/**
 * Client API minimale: cookie httpOnly gestiti dal browser (same-origin),
 * risposte JSON, errori normalizzati in Error con message leggibile.
 */
import { translate } from '../i18n/translate'

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
    const err = new Error(payload?.error || translate('common.serverError', { status: res.status }))
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

/** Valori enum dei tipi gru; le etichette sono localizzate via i18n (chiave craneType.<value>). */
export const CRANE_TYPES = [
  { value: 'CINGOLATA' },
  { value: 'RAGNO' },
  { value: 'AUTOCARRATA' },
  { value: 'TORRE' },
]
