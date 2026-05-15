import CraneScene from './components/3D/CraneScene'
import ControlsPanel from './components/UI/ControlsPanel'
import BottomSheet from './components/UI/BottomSheet'
import { useCraneCalc } from './hooks/useCraneCalc'
import { useLayout } from './hooks/useResponsive'

/**
 * Layout responsive:
 *  mobile-portrait  → scena 3D fullscreen + BottomSheet con swipe
 *  mobile-landscape → scena 3D a sinistra + side panel stretto (260 px)
 *  tablet           → scena 3D a sinistra + side panel medio   (300 px)
 *  desktop          → scena 3D a sinistra + side panel largo   (380 px)
 */

const PANEL_W = {
  'mobile-landscape': 260,
  tablet:             300,
  desktop:            380,
}

export default function App() {
  useCraneCalc()
  const layout = useLayout()
  const useSheet = layout === 'mobile-portrait'
  const panelW   = PANEL_W[layout] ?? 380
  const compact  = layout === 'mobile-landscape' || layout === 'tablet'

  return (
    <div className="h-[100dvh] w-screen overflow-hidden flex bg-white"
         style={{ flexDirection: useSheet ? 'column' : 'row' }}>

      {/* ── Scena 3D ─────────────────────────────────────────────── */}
      <div className="relative flex-1 min-w-0 min-h-0">
        <CraneScene />

        <div className="absolute top-3 left-3 select-none pointer-events-none">
          <img
            src="/Logo-BGLift.webp"
            alt="BG Lift"
            className="w-auto drop-shadow-sm"
            style={{ height: useSheet ? '32px' : compact ? '36px' : '42px' }}
          />
        </div>
      </div>

      {/* ── Side panel (landscape / tablet / desktop) ────────────── */}
      {!useSheet && (
        <aside
          className="flex flex-col flex-shrink-0 border-l border-line bg-white shadow-panel overflow-hidden"
          style={{ width: panelW }}
        >
          <ControlsPanel compact={compact} />
        </aside>
      )}

      {/* ── Bottom sheet (mobile portrait) ───────────────────────── */}
      {useSheet && (
        <BottomSheet>
          <ControlsPanel compact />
        </BottomSheet>
      )}
    </div>
  )
}
