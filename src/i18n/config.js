/**
 * Configurazione i18n condivisa (nessuna dipendenza da React).
 *
 * Lingua base: inglese. Fallback: lingua del browser se compatibile,
 * altrimenti inglese. La scelta dell'utente è salvata in localStorage.
 */

export const DEFAULT_LANGUAGE = 'en'

export const STORAGE_KEY = 'bglift.lang'

/** Lingue supportate, in ordine di visualizzazione nel selettore. */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano', flag: '🇮🇹' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', flag: '🇪🇸' },
]

export const SUPPORTED_CODES = SUPPORTED_LANGUAGES.map((l) => l.code)

export function isSupported(code) {
  return SUPPORTED_CODES.includes(code)
}

/** Normalizza un tag BCP-47 ("it-IT", "fr_CA") al codice base supportato. */
export function normalizeLanguage(tag) {
  if (!tag || typeof tag !== 'string') return null
  const base = tag.toLowerCase().split(/[-_]/)[0]
  return isSupported(base) ? base : null
}

/** Legge la preferenza salvata in localStorage, se valida. */
export function readStoredLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isSupported(stored) ? stored : null
  } catch {
    return null
  }
}

export function storeLanguage(code) {
  try {
    if (isSupported(code)) localStorage.setItem(STORAGE_KEY, code)
  } catch {
    /* localStorage non disponibile: ignora */
  }
}

/** Prima lingua del browser compatibile con quelle supportate. */
export function detectBrowserLanguage() {
  if (typeof navigator === 'undefined') return null
  const candidates = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
  ].filter(Boolean)
  for (const tag of candidates) {
    const match = normalizeLanguage(tag)
    if (match) return match
  }
  return null
}

/**
 * Risolve la lingua iniziale:
 * 1) scelta salvata dall'utente → 2) lingua del browser → 3) inglese.
 */
export function resolveInitialLanguage() {
  return readStoredLanguage() || detectBrowserLanguage() || DEFAULT_LANGUAGE
}
