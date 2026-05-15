import { useEffect, useState } from 'react'

/**
 * Hook che rileva il breakpoint corrente in JS.
 * Usalo solo dove non basta una classe Tailwind responsive
 * (es. switch tra Bottom Sheet e Side Panel).
 */
export function useIsDesktop(breakpointPx = 768) {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= breakpointPx : true
  )

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${breakpointPx}px)`)
    const handler = (e) => setIsDesktop(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [breakpointPx])

  return isDesktop
}
