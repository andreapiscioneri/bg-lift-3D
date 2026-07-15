import { useState } from 'react'
import { useCraneStore } from '../../store/craneStore'
import Slider from './Slider'
import StatusBadge from './StatusBadge'
import ReviewBox from './ReviewBox'
import { fmtM } from '../../utils/format'
import { LEG_OPEN_DEG, FOOT_LIFT_MAX, KNEE_RANGE_DEG } from '../3D/CraneScene'

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
 * Organizzato in due gruppi di sezioni richiudibili:
 *   Gruppo aereo — sez. Braccio, sez. Jib
 *   Gruppo terra — una sezione per gamba stabilizzatrice
 * più la sezione Carico (sempre visibile, non richiudibile).
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
  const setOutriggerKnee   = useCraneStore((s) => s.setOutriggerKnee)

  // Sezioni aperte (id → bool). Di default: braccio aperto, il resto chiuso.
  const [open, setOpen] = useState(() => new Set(['braccio']))
  const toggle = (id) =>
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

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
        <ReviewBox compact={xs} />
      </div>

      <div className={`flex flex-col ${gap} ${pad} pt-3`}>

      {/* Carico al gancio — alimenta reazioni sui piedi e margine ribaltamento */}
      <Group title="Carico">
        <div className={`flex flex-col ${sGap}`}>
          <Slider
            label="Peso sollevato"
            unit="kg"
            min={0}
            max={2000}
            step={10}
            value={config.loadKg ?? 0}
            defaultValue={model.defaultConfiguration.loadKg ?? 0}
            onChange={(v) => setConfig({ loadKg: v })}
            compact={compact}
          />
          {safety && (
            <div className="flex flex-col gap-1 text-xs font-mono pt-0.5">
              <div className="flex items-center justify-between">
                <span className="text-muted">Portata max (SWL)</span>
                <span className="font-bold text-accent">{Math.round(safety.swl_kg)} kg</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Utilizzo carico</span>
                <span
                  className="font-bold"
                  style={{ color: safety.loadUtil >= 1 ? '#dc2626' : safety.loadUtil >= 0.85 ? '#b45309' : '#16a34a' }}
                >
                  {Number.isFinite(safety.loadUtil) ? `${Math.round(safety.loadUtil * 100)}%` : '—'}
                </span>
              </div>
            </div>
          )}
        </div>
      </Group>

      {/* ── GRUPPO AEREO — torretta, braccio, jib ─────────────────── */}
      <Group
        title="Gruppo aereo"
        action={
          <button
            onClick={resetBoomConfig}
            className="text-[10px] font-semibold text-accent hover:underline flex-shrink-0"
          >
            Ripristina
          </button>
        }
      >
        <Collapsible title="Braccio" isOpen={open.has('braccio')} onToggle={() => toggle('braccio')} gap={sGap}>
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
        </Collapsible>

        {/* Sezione visibile solo per i modelli con jib (es. M250 + JIB) */}
        {model.jib?.available && (
          <Collapsible title="Jib" isOpen={open.has('jib')} onToggle={() => toggle('jib')} gap={sGap}>
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
          </Collapsible>
        )}
      </Group>

      {/* ── GRUPPO TERRA — una sezione per gamba stabilizzatrice ──── */}
      <Group title="Gruppo terra">
        {LEG_LABELS.map(([name, label]) => (
          <Collapsible
            key={name}
            title={label}
            isOpen={open.has(name)}
            onToggle={() => toggle(name)}
            gap={sGap}
            modified={
              (config.outriggerAngleDeg?.[name] ?? LEG_OPEN_DEG) !== model.defaultConfiguration.outriggerAngleDeg[name] ||
              (config.outriggerFootLiftM?.[name] ?? 0) !== (model.defaultConfiguration.outriggerFootLiftM?.[name] ?? 0) ||
              (config.outriggerKneeDeg?.[name] ?? 0) !== (model.defaultConfiguration.outriggerKneeDeg?.[name] ?? 0)
            }
          >
            <Slider
              label="Apertura"
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
              label="Alt. piede"
              unit="m"
              min={0}
              max={FOOT_LIFT_MAX}
              step={0.01}
              value={config.outriggerFootLiftM?.[name] ?? 0}
              defaultValue={model.defaultConfiguration.outriggerFootLiftM[name]}
              onChange={(v) => setOutriggerFootLift(name, v)}
              compact={compact}
            />
            <Slider
              label="Ginocchio"
              unit="°"
              min={-KNEE_RANGE_DEG}
              max={KNEE_RANGE_DEG}
              step={1}
              value={config.outriggerKneeDeg?.[name] ?? 0}
              defaultValue={model.defaultConfiguration.outriggerKneeDeg?.[name] ?? 0}
              onChange={(v) => setOutriggerKnee(name, v)}
              compact={compact}
            />
          </Collapsible>
        ))}
        <p className="text-[10px] text-muted leading-snug">
          Apertura: 0° = gamba ripiegata lungo il carro, {LEG_OPEN_DEG}° = tutta aperta.
          Alt. piede: 0 = piede a terra, valori positivi = piede sollevato.
          Ginocchio: piega dello stinco, positivo = piede in su.
          Per ora sono solo visivi: il calcolo di stabilità usa ancora
          l&apos;estensione stabilizzatori della configurazione.
        </p>
      </Group>

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

// Gruppo di primo livello: intestazione marcata + elenco di sezioni.
function Group({ title, action, children }) {
  return (
    <section className="flex flex-col gap-2 flex-shrink-0">
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

// Sezione richiudibile dentro un gruppo. `modified` mostra un pallino quando
// la sezione (chiusa) contiene valori diversi dal default.
function Collapsible({ title, isOpen, onToggle, gap = 'gap-3', modified = false, children }) {
  return (
    <div className="rounded-lg border border-line overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-2 bg-white hover:bg-black/[0.03] transition-colors text-left"
      >
        <span className="text-xs font-semibold text-black truncate flex items-center gap-1.5">
          {modified && <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />}
          {title}
        </span>
        <span className="text-muted text-xs flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className={`px-2.5 py-2.5 border-t border-line flex flex-col ${gap} bg-black/[0.015]`}>
          {children}
        </div>
      )}
    </div>
  )
}
