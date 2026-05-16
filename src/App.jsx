import CraneScene from './components/3D/CraneScene'
import ControlsPanel from './components/UI/ControlsPanel'
import BottomSheet from './components/UI/BottomSheet'
import { useCraneCalc } from './hooks/useCraneCalc'
import { useLayout } from './hooks/useResponsive'

/**
 * Layout responsive:
 *  mobile-portrait  → scena 3D fullscreen + BottomSheet con swipe
 *  mobile-landscape → scena 3D a sinistra + side panel stretto (260 px)  size=xs
 *  tablet           → scena 3D a sinistra + side panel medio   (300 px)  size=sm
 *  desktop          → scena 3D a sinistra + side panel largo   (380 px)  size=lg
 */

const PANEL_W = { 'mobile-landscape': 260, tablet: 300, desktop: 380 }
const PANEL_SIZE = { 'mobile-landscape': 'xs', tablet: 'sm', desktop: 'lg' }

export default function App() {
  useCraneCalc()
  const layout   = useLayout()
  const useSheet = layout === 'mobile-portrait'
  const panelW   = PANEL_W[layout]   ?? 380
  const panelSize = PANEL_SIZE[layout] ?? 'lg'

  // Notch safe area: in landscape su iPhone la scena perde spazio a sx/dx
  const sceneStyle = layout === 'mobile-landscape'
    ? { paddingLeft: 'env(safe-area-inset-left)' }
    : undefined

  const asideStyle = layout === 'mobile-landscape'
    ? { width: panelW, paddingRight: 'env(safe-area-inset-right)' }
    : { width: panelW }

  return (
    <div
      className="w-screen overflow-hidden flex bg-white"
      style={{ height: '100dvh', flexDirection: useSheet ? 'column' : 'row' }}
    >
      {/* ── Scena 3D ─────────────────────────────────────────────── */}
      <div className="relative flex-1 min-w-0 min-h-0" style={sceneStyle}>
        <CraneScene />

        <div className="absolute top-3 left-3 select-none pointer-events-none">
          <img
            src="/Logo-BGLift.webp"
            alt="BG Lift"
            className="w-auto drop-shadow-sm"
            style={{
              height: useSheet ? '30px' : panelSize === 'xs' ? '28px' : panelSize === 'sm' ? '34px' : '42px',
            }}
          />
        </div>
      </div>

      {/* ── Side panel (landscape / tablet / desktop) ────────────── */}
      {!useSheet && (
        <aside
          className="flex flex-col flex-shrink-0 border-l border-line bg-white shadow-panel overflow-hidden"
          style={asideStyle}
        >
          <ControlsPanel size={panelSize} />
        </aside>
      )}

      {/* ── Bottom sheet (mobile portrait) ───────────────────────── */}
      {useSheet && (
        <BottomSheet>
          <ControlsPanel size="sm" />
        </BottomSheet>
      )}
    </div>
  )
}
