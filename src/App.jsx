import CraneScene from './components/3D/CraneScene'
import ControlsPanel from './components/UI/ControlsPanel'
import BottomSheet from './components/UI/BottomSheet'
import { useCraneCalc } from './hooks/useCraneCalc'

/**
 * Layout responsive:
 *  - Mobile (<768px): scena 3D fullscreen + bottom sheet con i controlli
 *  - Desktop (≥768px): scena 3D a sinistra, side panel a destra (380px)
 */
export default function App() {
  // Avvia il worker e ricalcola la sicurezza ad ogni cambio di config
  useCraneCalc()

  return (
    <div className="h-[100dvh] w-screen overflow-hidden flex flex-col md:flex-row bg-white">
      {/* Scena 3D */}
      <div className="relative flex-1 min-h-0 bg-white">
        <CraneScene />

        {/* Branding angolo — riprende lo stile BGLift: nero + arancio */}
        <div className="absolute top-3 left-4 flex items-baseline gap-1.5 select-none pointer-events-none">
          <span className="text-base font-extrabold tracking-tight text-black">BG</span>
          <span className="text-base font-extrabold tracking-tight text-accent">LIFT</span>
          <span className="text-[11px] font-semibold tracking-[0.2em] text-black/60 ml-1">3D</span>
        </div>
      </div>

      {/* Side panel — solo desktop */}
      <aside
        className="hidden md:flex md:flex-col w-[380px] border-l border-line bg-white shadow-panel"
      >
        <ControlsPanel />
      </aside>

      {/* Bottom sheet — solo mobile */}
      <BottomSheet>
        <ControlsPanel />
      </BottomSheet>
    </div>
  )
}
