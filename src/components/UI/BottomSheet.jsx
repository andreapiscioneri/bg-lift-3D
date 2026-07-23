import { useState, useRef, useEffect, useCallback } from 'react'
import { useCraneStore } from '../../store/craneStore'
import { useTranslation } from '../../i18n/I18nContext'
import { fmtM, fmtPct } from '../../utils/format'

/**
 * Bottom sheet con 3 snap points e swipe gesture.
 * Snap: peek (88 px visibili) → half (45 dvh) → full (90 dvh)
 *
 * Drag parte SOLO dalla handle — il contenuto scrollabile non interferisce.
 * Usa window pointer-events (non pointer-capture) per non bloccare i range input.
 * Usa visualViewport.height per iOS address bar.
 */

const PEEK_PX    = 88
const SNAP_NAMES = ['peek', 'half', 'full']

const STATUS_COLOR = { safe: '#16a34a', warning: '#b45309', critical: '#dc2626' }
const STATUS_LABEL_KEYS = { safe: 'status.shortSafe', warning: 'status.shortWarning', critical: 'status.shortCritical' }

function MiniStatusBar() {
  const t = useTranslation()
  const safety = useCraneStore((s) => s.safety)
  if (!safety) return <span className="text-[10px] text-muted font-mono">{t('status.calculating')}</span>
  const color = STATUS_COLOR[safety.status] ?? STATUS_COLOR.safe
  const label = t(STATUS_LABEL_KEYS[safety.status] ?? STATUS_LABEL_KEYS.safe)
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono leading-none">
      <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="font-bold" style={{ color }}>{label}</span>
      <span className="text-muted">R {fmtM(safety.radiusM)}</span>
      <span className="text-black/30">·</span>
      <span style={{ color: safety.loadUtil >= 1 ? '#dc2626' : '#6b7280' }}>{fmtPct(safety.loadUtil)}</span>
    </div>
  )
}

function getSheetH() {
  return (window.visualViewport?.height ?? window.innerHeight) * 0.9
}

function calcSnaps() {
  const h = getSheetH()
  return { peek: h - PEEK_PX, half: h * 0.50, full: 0 }
}

export default function BottomSheet({ children }) {
  const t = useTranslation()
  const [snap, setSnap]   = useState('peek')
  const [liveY, setLiveY] = useState(null)
  const dragging          = useRef(false)
  const dragStart         = useRef({ y: 0, translate: 0 })
  const [, forceUpdate]   = useState(0)

  /* ── Aggiorna snap quando la viewport cambia (address bar iOS) ── */
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => forceUpdate((n) => n + 1)
    vv.addEventListener('resize', onResize)
    return () => vv.removeEventListener('resize', onResize)
  }, [])

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
    const capped = Math.max(0, Math.min(raw, getSheetH() - 40))
    setLiveY(capped)
  }, [])

  const endDrag = useCallback((clientY) => {
    if (!dragging.current) return
    dragging.current = false
    const snaps    = calcSnaps()
    const current  = dragStart.current.translate + (clientY - dragStart.current.y)
    const velocity = clientY - dragStart.current.y
    const biased   = current + (velocity > 0 ? 80 : -80)
    let nearest = 'peek'; let minDist = Infinity
    for (const name of SNAP_NAMES) {
      const dist = Math.abs(biased - snaps[name])
      if (dist < minDist) { minDist = dist; nearest = name }
    }
    setSnap(nearest)
    setLiveY(null)
  }, [])

  /* ── Window listeners ─────────────────────────────────────── */
  useEffect(() => {
    if (liveY === null) return
    const onMove = (e) => moveDrag(e.clientY ?? e.touches?.[0]?.clientY ?? 0)
    const onUp   = (e) => endDrag(e.clientY ?? e.changedTouches?.[0]?.clientY ?? 0)
    window.addEventListener('pointermove',   onMove, { passive: true })
    window.addEventListener('pointerup',     onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove',   onMove)
      window.removeEventListener('pointerup',     onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [liveY, moveDrag, endDrag])

  /* ── Transform ─────────────────────────────────────────────── */
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
      className="bottom-sheet fixed inset-x-0 bottom-0 z-30 flex flex-col bg-white border-t border-line rounded-t-3xl shadow-sheet"
      style={{
        transform: `translateY(${translateY})`,
        transition,
        willChange: 'transform',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* ── Handle ─────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex flex-col items-center pt-2.5 pb-2 gap-1.5 cursor-grab active:cursor-grabbing select-none touch-none"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => startDrag(e.clientY)}
      >
        {/* Pill */}
        <span className="block h-1.5 w-14 rounded-full bg-line" />

        {/* Barra: label + mini-status + snap dots */}
        <div className="flex items-center justify-between w-full px-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[11px] text-accent uppercase tracking-[0.15em] font-extrabold leading-none flex-shrink-0">
              {t('status.controls')}
            </span>
            {snap === 'peek' && <MiniStatusBar />}
          </div>

          {/* Snap dots */}
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
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
        onPointerDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
