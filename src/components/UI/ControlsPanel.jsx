import { useCraneStore } from '../../store/craneStore'
import Slider from './Slider'
import StatusBadge from './StatusBadge'
import { fmtM } from '../../utils/format'
import { LEG_OPEN_DEG, FOOT_LIFT_MAX } from '../3D/CraneScene'

// Gambe stabilizzatrici: apertura 0° = ripiegata lungo l'asse macchina,
// LEG_OPEN_DEG = tutta aperta a ragno (posa CAD). "Anteriore" = lato punta braccio.
const LEG_LABELS = [
  ['frontLeft',  'Ant. sinistra'],
  ['frontRight', 'Ant. destra'],
  ['rearLeft',   'Post. sinistra'],
  ['rearRight',  'Post. destra'],
]

/**
 * Pannello laterale / contenuto del bottom sheet.
 *
 * size='xs' → mobile landscape: padding minimo, niente hint, ultra-compatto
 * size='sm' → tablet / bottom sheet: compatto con hint
 * size='lg' → desktop: layout completo
 */
export default function ControlsPanel({ size = 'lg' }) {
  const model              = useCraneStore((s) => s.model)
  const config             = useCraneStore((s) => s.config)
  const safety             = useCraneStore((s) => s.safety)
  const setConfig          = useCraneStore((s) => s.setConfig)
  const reset              = useCraneStore((s) => s.reset)
  const resetBoomConfig    = useCraneStore((s) => s.resetBoomConfig)
  const setOutriggerAngle  = useCraneStore((s) => s.setOutriggerAngle)
  const setOutriggerFootLift = useCraneStore((s) => s.setOutriggerFootLift)

  const xs = size === 'xs'
  const lg = size === 'lg'

  const pad  = xs ? 'p-2'   : lg ? 'p-5'   : 'p-3'
  const gap  = xs ? 'gap-3' : lg ? 'gap-5'  : 'gap-4'
  const sGap = xs ? 'gap-2' : lg ? 'gap-3'  : 'gap-2.5'
  const compact = !lg  // slider/pad compact se non desktop

  return (
    <div className={`flex flex-col h-full overflow-y-auto bg-white`}>

      {/* Header + status badge — fissi in alto, sempre visibili durante lo scroll */}
      <div className={`flex flex-col ${sGap} ${pad} pb-3 flex-shrink-0 sticky top-0 z-10 bg-white border-b border-line`}>
        <header className="flex items-start justify-between gap-2 flex-shrink-0">
          <div className="min-w-0">
            <h1 className={`font-extrabold leading-tight text-accent truncate ${xs ? 'text-sm' : lg ? 'text-lg' : 'text-base'}`}>
              {model.displayName}
            </h1>
            {!xs && (
              <p className="text-[11px] text-muted font-medium mt-0.5">
                Calcolo portata in tempo reale
              </p>
            )}
          </div>
          <button
            onClick={reset}
            className="text-xs font-semibold px-2 py-1.5 rounded border border-line text-black hover:bg-black hover:text-white transition-colors flex-shrink-0"
          >
            Reset
          </button>
        </header>

        <StatusBadge safety={safety} compact={xs} />
      </div>

      <div className={`flex flex-col ${gap} ${pad} pt-3`}>

      {/* Configurazione braccio — slider funzionanti, il pannello sicurezza si ricalcola dal vero */}
      <Section
        title="Braccio"
        gap={sGap}
        action={
          <button
            onClick={resetBoomConfig}
            className="text-[10px] font-semibold text-accent hover:underline flex-shrink-0"
          >
            Ripristina
          </button>
        }
      >
        <Slider
          label="Angolo"
          unit="°"
          min={model.mainBoom.elevationRangeDeg[0]}
          max={model.mainBoom.elevationRangeDeg[1]}
          step={1}
          value={config.mainBoomAngleDeg}
          defaultValue={model.defaultConfiguration.mainBoomAngleDeg}
          onChange={(v) => setConfig({ mainBoomAngleDeg: v })}
          compact={compact}
        />
        <Slider
          label="Corsa sfilo"
          unit="m"
          min={0}
          max={model.mainBoom.strokeMaxM}
          step={0.05}
          value={config.boomStrokeM}
          defaultValue={model.defaultConfiguration.boomStrokeM}
          onChange={(v) => setConfig({ boomStrokeM: v })}
          compact={compact}
        />
        <Slider
          label="Pressione fondello"
          unit="bar"
          min={0}
          max={model.liftCalculation.cylinders.pressureBoreMax_bar}
          step={5}
          value={config.pressureBoreBar}
          defaultValue={model.defaultConfiguration.pressureBoreBar}
          onChange={(v) => setConfig({ pressureBoreBar: v })}
          compact={compact}
        />
        <Slider
          label="Pressione stelo"
          unit="bar"
          min={0}
          max={model.liftCalculation.cylinders.pressureRodMax_bar}
          step={5}
          value={config.pressureRodBar}
          defaultValue={model.defaultConfiguration.pressureRodBar}
          onChange={(v) => setConfig({ pressureRodBar: v })}
          compact={compact}
        />
        <Slider
          label="Angolo jib"
          unit="°"
          min={model.jib.articulationRangeDeg[0]}
          max={model.jib.articulationRangeDeg[1]}
          step={1}
          value={config.jibAngleDeg}
          defaultValue={model.defaultConfiguration.jibAngleDeg}
          onChange={(v) => setConfig({ jibAngleDeg: v })}
          compact={compact}
        />
        <Slider
          label="Rotazione torretta"
          unit="°"
          min={model.turret.rotationRangeDeg[0]}
          max={model.turret.rotationRangeDeg[1]}
          step={1}
          value={config.rotationDeg}
          defaultValue={model.defaultConfiguration.rotationDeg}
          onChange={(v) => setConfig({ rotationDeg: v })}
          compact={compact}
        />
        {safety && (
          <div className="flex items-center justify-between text-xs font-mono pt-0.5">
            <span className="text-muted">Raggio di lavoro</span>
            <span className="font-bold text-accent">{fmtM(safety.radiusM)}</span>
          </div>
        )}
      </Section>

      {/* Gambe stabilizzatrici — apertura e altezza piede per singola gamba */}
      <Section title="Stabilizzatori" gap={sGap}>
        {LEG_LABELS.map(([name, label]) => (
          <div key={name} className="flex flex-col gap-2 pb-2 border-b border-line last:border-b-0">
            <Slider
              label={`${label} — apertura`}
              unit="°"
              min={0}
              max={LEG_OPEN_DEG}
              step={1}
              value={config.outriggerAngleDeg?.[name] ?? LEG_OPEN_DEG}
              defaultValue={model.defaultConfiguration.outriggerAngleDeg[name]}
              onChange={(v) => setOutriggerAngle(name, v)}
              compact={compact}
            />
            <Slider
              label={`${label} — alt. piede`}
              unit="m"
              min={0}
              max={FOOT_LIFT_MAX}
              step={0.01}
              value={config.outriggerFootLiftM?.[name] ?? 0}
              defaultValue={model.defaultConfiguration.outriggerFootLiftM[name]}
              onChange={(v) => setOutriggerFootLift(name, v)}
              compact={compact}
            />
          </div>
        ))}
        <p className="text-[10px] text-muted leading-snug">
          Apertura: 0° = gamba ripiegata lungo il carro, {LEG_OPEN_DEG}° = tutta aperta.
          Alt. piede: 0 = piede a terra, valori positivi = piede sollevato.
          Per ora entrambi sono solo visivi: il calcolo di stabilità usa ancora
          l&apos;estensione stabilizzatori della configurazione.
        </p>
      </Section>

      {/* Disclaimer */}
      {!xs && (
        <p className="text-[10px] text-muted leading-relaxed border-t border-line pt-3 flex-shrink-0 mt-auto">
          Prototipo con dati SWL indicativi. Validare sempre contro la tabella ufficiale BGLift e la normativa EN 13000 prima dell&apos;uso in cantiere.
        </p>
      )}
      </div>
    </div>
  )
}

// ─── Componenti interni ──────────────────────────────────────────

function Section({ title, action, children, gap = 'gap-3' }) {
  return (
    <section className={`flex flex-col ${gap} flex-shrink-0`}>
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] uppercase tracking-[0.18em] text-accent font-extrabold">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

