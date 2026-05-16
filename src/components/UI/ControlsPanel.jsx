import { useCraneStore } from '../../store/craneStore'
import Slider from './Slider'
import StatusBadge from './StatusBadge'
import { fmtKg, fmtM, fmtPct } from '../../utils/format'

/**
 * Pannello laterale / bottom sheet.
 *
 * Braccio, rotazione e stabilizzatori vengono controllati
 * direttamente nella scena 3D trascinando i relativi handles.
 *
 * Qui restano:
 *  • StatusBadge con dati di sicurezza
 *  • Slider carico al gancio (valore non draggable in 3D)
 *  • Slider Jib (se disponibile)
 *  • Pannello pressioni pad (feedback di sicurezza per cantiere)
 *  • Hint istruzioni direct manipulation
 */
export default function ControlsPanel({ compact = false }) {
  const model      = useCraneStore((s) => s.model)
  const config     = useCraneStore((s) => s.config)
  const safety     = useCraneStore((s) => s.safety)
  const setConfig  = useCraneStore((s) => s.setConfig)
  const reset      = useCraneStore((s) => s.reset)

  const pad  = compact ? 'p-3'   : 'p-5'
  const gap  = compact ? 'gap-4' : 'gap-5'
  const sGap = compact ? 'gap-2.5' : 'gap-3'

  return (
    <div className={`flex flex-col ${gap} ${pad} h-full overflow-y-auto bg-white`}>

      {/* Header */}
      <header className="flex items-start justify-between gap-3 flex-shrink-0">
        <div>
          <h1 className={`font-extrabold leading-tight text-accent ${compact ? 'text-base' : 'text-lg'}`}>
            {model.displayName}
          </h1>
          <p className="text-[11px] text-muted font-medium mt-0.5">
            Calcolo portata in tempo reale
          </p>
        </div>
        <button
          onClick={reset}
          className="text-xs font-semibold px-2.5 py-1.5 rounded border border-line text-black hover:bg-black hover:text-white transition-colors flex-shrink-0"
        >
          Reset
        </button>
      </header>

      {/* Status badge */}
      <StatusBadge safety={safety} />

      {/* Hint direct manipulation */}
      <div className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-accent/5 border border-accent/20">
        <span className="text-accent text-base leading-none mt-0.5">✦</span>
        <p className="text-[11px] text-black/70 leading-snug">
          <strong className="text-accent font-semibold">Trascina nella scena 3D:</strong>
          {' '}anello arancio per ruotare · sfera alla punta per angolo e lunghezza · sfere sui pad per lo sfilo stabilizzatori
        </p>
      </div>

      {/* Lettura corrente configurazione braccio (read-only) */}
      <Section title="Configurazione braccio" gap={sGap}>
        <ReadoutRow
          label="Angolo"
          value={`${Math.round(config.mainBoomAngleDeg)}°`}
        />
        <ReadoutRow
          label="Lunghezza sfilo"
          value={fmtM(config.mainBoomLengthM)}
        />
        <ReadoutRow
          label="Rotazione torretta"
          value={`${Math.round(config.rotationDeg)}°`}
        />
        {safety && (
          <ReadoutRow
            label="Raggio di lavoro"
            value={fmtM(safety.radiusM)}
            highlight
          />
        )}
      </Section>

      {/* Carico al gancio — unico slider operativo per il braccio */}
      <Section title="Carico al gancio" gap={sGap}>
        <Slider
          label="Massa"
          unit="kg"
          min={0}
          max={Math.ceil(model.loadChart.swl_kg[0][0] / 100) * 100}
          step={50}
          value={config.loadKg}
          onChange={(v) => setConfig({ loadKg: v })}
          compact={compact}
        />
        {safety && (
          <div className="flex items-center justify-between text-xs font-mono pt-0.5">
            <span className="text-muted">SWL nominale</span>
            <span className="font-bold text-black">{fmtKg(safety.swl_kg)}</span>
          </div>
        )}
      </Section>

      {/* Jib (se disponibile) */}
      {model.jib?.available && (
        <Section title="Jib" gap={sGap}>
          <Slider
            label="Angolo articolazione"
            unit="°"
            min={model.jib.articulationRangeDeg[0]}
            max={model.jib.articulationRangeDeg[1]}
            step={1}
            value={config.jibAngleDeg}
            onChange={(v) => setConfig({ jibAngleDeg: v })}
            compact={compact}
          />
          <Slider
            label="Sfilo Jib"
            unit="m"
            min={0}
            max={model.jib.extendedLength}
            step={0.1}
            value={config.jibLengthM}
            onChange={(v) => setConfig({ jibLengthM: v })}
            compact={compact}
          />
        </Section>
      )}

      {/* Pannello pressioni pad */}
      {safety?.reactions && (
        <Section title="Reazioni stabilizzatori" gap="gap-2">
          <PadGrid reactions={safety.reactions} model={model} compact={compact} />
        </Section>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-muted leading-relaxed border-t border-line pt-3 flex-shrink-0 mt-auto">
        Prototipo con dati SWL indicativi. Validare sempre contro la tabella ufficiale BGLift e la normativa EN 13000 prima dell'uso in cantiere.
      </p>
    </div>
  )
}

// ─── Componenti interni ──────────────────────────────────────────

function Section({ title, children, gap = 'gap-3' }) {
  return (
    <section className={`flex flex-col ${gap} flex-shrink-0`}>
      <h2 className="text-[10px] uppercase tracking-[0.18em] text-accent font-extrabold">
        {title}
      </h2>
      {children}
    </section>
  )
}

function ReadoutRow({ label, value, highlight = false }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-muted">{label}</span>
      <span className={`text-xs font-mono font-bold ${highlight ? 'text-accent' : 'text-black'}`}>
        {value}
      </span>
    </div>
  )
}

const PAD_LABELS = {
  frontLeft:  'Ant. SX',
  frontRight: 'Ant. DX',
  rearLeft:   'Post. SX',
  rearRight:  'Post. DX',
}

function PadGrid({ reactions, model, compact }) {
  const maxLoad_kN = model.outriggers.maxAllowableLoadPerPad_kN
  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
      {reactions.map((r) => {
        const pct  = Math.min(100, Math.round(r.utilization * 100))
        const col  = r.utilization >= 1
          ? '#dc2626'
          : r.utilization >= 0.85
          ? '#b45309'
          : '#16a34a'
        return (
          <div key={r.name} className="flex flex-col gap-0.5 p-2 rounded border border-line bg-white">
            <span className="text-[9px] uppercase tracking-wide text-muted font-semibold">
              {PAD_LABELS[r.name] ?? r.name}
            </span>
            <span className="text-xs font-mono font-bold" style={{ color: col }}>
              {r.reaction_kN.toFixed(1)} kN
            </span>
            {/* Barra utilizzo */}
            <div className="h-1 rounded-full bg-line overflow-hidden mt-0.5">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, background: col }}
              />
            </div>
            <span className="text-[9px] font-mono text-muted">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}
