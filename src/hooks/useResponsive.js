import { useEffect, useState } from 'react'

/**
 * Rileva il layout corrente in base a larghezza e orientamento.
 * Returns: 'mobile-portrait' | 'mobile-landscape' | 'tablet' | 'desktop'
 *
 * mobile-portrait  → < 768 px, portrait  → BottomSheet
 * mobile-landscape → < 768 px, landscape → side panel stretto (260 px)
 * tablet           → 768–1023 px         → side panel medio  (300 px)
 * desktop          → ≥ 1024 px           → side panel largo  (380 px)
 */
function getLayout() {
  if (typeof window === 'undefined') return 'desktop'
  const { innerWidth: w, innerHeight: h } = window
  if (w < 768) return w > h ? 'mobile-landscape' : 'mobile-portrait'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

export function useLayout() {
  const [layout, setLayout] = useState(getLayout)

  useEffect(() => {
    const update = () => setLayout(getLayout())
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return layout
}

// Backward compat — usato da nessun file al momento ma lo teniamo
export function useIsDesktop(breakpointPx = 768) {
  const [ok, setOk] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= breakpointPx : true
  )
  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${breakpointPx}px)`)
    const h = (e) => setOk(e.matches)
    mql.addEventListener('change', h)
    return () => mql.removeEventListener('change', h)
  }, [breakpointPx])
  return ok
}
