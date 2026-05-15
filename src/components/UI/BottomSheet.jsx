import { useState } from 'react'

/**
 * Bottom sheet a 2 stati (peek / full) — tema chiaro BGLift.
 * Tap sulla maniglia per espandere/comprimere.
 * Ottimizzato per pollice in cantiere (handle ampia, target ≥ 44px).
 */
export default function BottomSheet({ children, peekHeight = 96 }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 md:hidden
                  bg-white border-t border-line rounded-t-2xl shadow-sheet
                  transition-transform duration-300 ease-out
                  ${open ? 'translate-y-0' : ''}`}
      style={{
        height: '85vh',
        transform: open ? 'translateY(0)' : `translateY(calc(100% - ${peekHeight}px))`,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full py-3 flex items-center justify-center gap-3 active:bg-black/5"
        aria-label={open ? 'Chiudi pannello' : 'Apri pannello'}
      >
        <span className="block h-1.5 w-12 rounded-full bg-line" />
        <span className="text-xs text-accent uppercase tracking-[0.15em] font-extrabold">
          {open ? 'Chiudi' : 'Controlli'}
        </span>
      </button>

      <div className="h-[calc(85vh-56px)] overflow-hidden">
        {children}
      </div>
    </div>
  )
}
