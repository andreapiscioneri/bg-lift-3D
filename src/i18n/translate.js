/**
 * Traduttore non reattivo + helper condivisi.
 *
 * Serve per tradurre fuori dall'albero React (es. dentro il <Canvas> di
 * react-three-fiber, dove il Context non attraversa il boundary). La lingua
 * attiva è tenuta a livello di modulo e aggiornata dal provider i18n.
 */
import { messages } from './locales'
import { DEFAULT_LANGUAGE } from './config'

/** Lookup annidato "a.b.c" su un oggetto. */
export function lookup(dict, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), dict)
}

/** Sostituisce i placeholder {{name}} con i parametri passati. */
export function interpolate(str, params) {
  if (!params) return str
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key) =>
    params[key] != null ? String(params[key]) : m,
  )
}

/** Risolve una chiave in una lingua data, con fallback all'inglese e poi alla chiave. */
export function resolve(lang, key, params) {
  const active = lookup(messages[lang], key)
  const value = typeof active === 'string' ? active : lookup(messages[DEFAULT_LANGUAGE], key)
  if (typeof value !== 'string') return key
  return interpolate(value, params)
}

let moduleLang = DEFAULT_LANGUAGE

export function setModuleLang(lang) {
  if (messages[lang]) moduleLang = lang
}

/** Traduttore standalone per contesti fuori dai componenti/Provider. */
export function translate(key, params) {
  return resolve(moduleLang, key, params)
}
