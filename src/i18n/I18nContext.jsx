import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { SUPPORTED_LANGUAGES, isSupported, resolveInitialLanguage, storeLanguage } from './config'
import { resolve, setModuleLang } from './translate'
import { setFormatLang } from '../utils/format'

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(resolveInitialLanguage)

  // Sincronizza subito locale dei formatter (numeri/date) e traduttore
  // standalone, anche al primo render.
  setFormatLang(lang)
  setModuleLang(lang)

  useEffect(() => {
    setFormatLang(lang)
    setModuleLang(lang)
    if (typeof document !== 'undefined') document.documentElement.lang = lang
  }, [lang])

  const changeLanguage = useCallback((code) => {
    if (!isSupported(code)) return
    storeLanguage(code)
    setLang(code)
  }, [])

  const t = useCallback((key, params) => resolve(lang, key, params), [lang])

  const value = useMemo(
    () => ({ lang, t, changeLanguage, languages: SUPPORTED_LANGUAGES }),
    [lang, t, changeLanguage],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n deve essere usato dentro <I18nProvider>')
  return ctx
}

/** Scorciatoia: restituisce solo la funzione di traduzione. */
export function useTranslation() {
  return useI18n().t
}
