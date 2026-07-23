import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n/I18nContext'

/**
 * Selettore lingua per la navbar. `variant` adatta i colori al contesto:
 * 'light' (header chiari) o 'dark' (barra scura del configuratore).
 */
export default function LanguageSelector({ variant = 'light' }) {
  const { lang, changeLanguage, languages } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = languages.find((l) => l.code === lang) ?? languages[0]

  const triggerClass =
    variant === 'dark'
      ? 'text-white/80 hover:text-white hover:bg-white/10'
      : 'text-muted hover:text-ink hover:bg-neutral-100'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Lingua: ${current.nativeLabel}`}
        className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition ${triggerClass}`}
      >
        <span aria-hidden="true" className="text-base leading-none">{current.flag}</span>
        <span className="uppercase tracking-wide text-xs font-semibold">{current.code}</span>
        <svg
          width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-panel"
        >
          {languages.map((l) => {
            const active = l.code === lang
            return (
              <li key={l.code} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    changeLanguage(l.code)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition ${
                    active ? 'bg-accent/10 text-accent font-semibold' : 'text-ink hover:bg-neutral-100'
                  }`}
                >
                  <span aria-hidden="true" className="text-base leading-none">{l.flag}</span>
                  <span className="flex-1 text-left">{l.nativeLabel}</span>
                  {active && (
                    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M3 8.5l3.5 3.5L13 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
