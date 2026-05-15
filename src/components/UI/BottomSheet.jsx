import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * Bottom sheet con 3 snap points e swipe gesture.
 * Snap: peek (100 px visibili) → half (45 vh) → full (90 vh)
 *
 * Drag parte SOLO dalla handle — il contenuto scrollabile non interferisce.
 * Usa window pointer-events (non pointer-capture) per non bloccare i range input.
 */

const SHEET_VH   = 90   // altezza totale del sheet in vh
const PEEK_PX    = 108  // px visibili in modalità "peek"
const SNAP_NAMES = ['peek', 'half', 'full']

function calcSnaps() {
  const h = window.innerHeight * SHEET_VH / 100
  return {
    peek: h - PEEK_PX,
    half: h * 0.50,
    full: 0,
  }
}

export default function BottomSheet({ children }) {
  const [snap, setSnap]         = useState('peek')
  const [liveY, setLiveY]       = useState(null)   // null → usa CSS snap, number → dragging
  const dragging                = useRef(false)
  const dragStart               = useRef({ y: 0, translate: 0 })

  /* ── Gesture handlers ─────────────────────────────────────── */
  const startDrag = useCallback((clientY) => {
    const snaps = calcSnaps()
    dragging.current = true
    dragStart.current = { y: clientY, translate: snaps[snap] }
    setLiveY(snaps[snap])
  }, [snap])

  const moveDrag = useCallback((clientY) => {
    if (!dragging.current) return
    const delta  = clientY - dragStart.current.y
    const raw    = dragStart.current.translate + delta
    const capped = Math.max(0, Math.min(raw, window.innerHeight * SHEET_VH / 100 - 40))
    setLiveY(capped)
  }, [])

  const endDrag = useCallback((clientY) => {
    if (!dragging.current) return
    dragging.current = false

    const snaps    = calcSnaps()
    const current  = dragStart.current.translate + (clientY - dragStart.current.y)
    // Bias verso la direzione del gesto (inerzia semplificata)
    const velocity = clientY - dragStart.current.y
    const biased   = current + (velocity > 0 ? 80 : -80)

    let nearest = 'peek'
    let minDist = Infinity
    for (const name of SNAP_NAMES) {
      const dist = Math.abs(biased - snaps[name])
      if (dist < minDist) { minDist = dist; nearest = name }
    }

    setSnap(nearest)
    setLiveY(null)
  }, [])

  /* ── Window listeners (attivi solo durante il drag) ───────── */
  useEffect(() => {
    if (liveY === null) return
    const onMove = (e) => moveDrag(e.clientY ?? e.touches?.[0]?.clientY ?? 0)
    const onUp   = (e) => endDrag(e.clientY ?? e.changedTouches?.[0]?.clientY ?? 0)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup',   onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup',   onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [liveY, moveDrag, endDrag])

  /* ── Transform ────────────────────────────────────────────── */
  const translateY = liveY !== null
    ? `${liveY}px`
    : snap === 'full'
      ? '0px'
      : snap === 'half'
        ? '50%'
        : `calc(100% - ${PEEK_PX}px)`

  const transition = liveY !== null
    ? 'none'
    : 'transform 0.38s cubic-bezier(0.32, 0.72, 0, 1)'

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 flex flex-col bg-white border-t border-line rounded-t-3xl shadow-sheet"
      style={{
        height: `${SHEET_VH}vh`,
        transform: `translateY(${translateY})`,
        transition,
        willChange: 'transform',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* ── Handle & intestazione ─────────────────────────────── */}
      <div
        className="flex-shrink-0 flex flex-col items-center pt-2.5 pb-2 gap-1 cursor-grab active:cursor-grabbing select-none touch-none"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => startDrag(e.clientY)}
      >
        {/* Pill */}
        <span className="block h-1.5 w-14 rounded-full bg-line" />

        {/* Barra snap + etichetta */}
        <div className="flex items-center justify-between w-full px-4 pt-1">
          <span className="text-[11px] text-accent uppercase tracking-[0.15em] font-extrabold leading-none">
            Controlli
          </span>

          {/* Indicatori snap (•••) */}
          <div className="flex items-center gap-1.5">
            {SNAP_NAMES.map((s) => (
              <button
                key={s}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => { setSnap(s); setLiveY(null) }}
                className="rounded-full transition-all duration-200"
                style={{
                  width:  snap === s ? 16 : 6,
                  height: 6,
                  background: snap === s ? '#EC6726' : '#e5e5e5',
                }}
                aria-label={s}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Contenuto scrollabile ─────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={(e) => e.stopPropagation()}  // non innescare drag dal contenuto
      >
        {children}
      </div>
    </div>
  )
}
