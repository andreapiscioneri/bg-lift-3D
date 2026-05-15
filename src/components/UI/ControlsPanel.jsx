import { useCraneStore } from '../../store/craneStore'
import Slider from './Slider'
import StatusBadge from './StatusBadge'

/**
 * Pannello di controllo principale.
 * compact=true → gap/padding ridotti, stabilizzatori in griglia 2×2.
 * Usato sia nel BottomSheet mobile sia nei side panel tablet/desktop.
 */
export default function ControlsPanel({ compact = false }) {
  const model     = useCraneStore((s) => s.model)
  const config    = useCraneStore((s) => s.config)
  const safety    = useCraneStore((s) => s.safety)
  const setConfig = useCraneStore((s) => s.setConfig)
  const setOutrigger = useCraneStore((s) => s.setOutrigger)
  const reset     = useCraneStore((s) => s.reset)

  const pad  = compact ? 'p-3'   : 'p-5'
  const gap  = compact ? 'gap-4' : 'gap-5'
  const sGap = compact ? 'gap-2.5' : 'gap-3'

  return (
    <div className={`flex flex-col ${gap} ${pad} max-h-full overflow-y-auto bg-white`}>

      {/* Header */}
      <header className="flex items-start justify-between gap-3 flex-shrink-0">
        <div>
          <h1 className={`font-extrabold leading-tight text-accent ${compact ? 'text-base' : 'text-lg'}`}>
            {model.displayName}
          </h1>
          <p className="text-[11px] text-muted font-medium mt-0.5">
            Configurazione di sollevamento
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

      {/* Braccio principale */}
      <Section title="Braccio principale" gap={sGap}>
        <Slider
          label="Angolo"
          unit="°"
          min={model.mainBoom.elevationRangeDeg[0]}
          max={model.mainBoom.elevationRangeDeg[1]}
          step={1}
          value={config.mainBoomAngleDeg}
          onChange={(v) => setConfig({ mainBoomAngleDeg: v })}
          compact={compact}
        />
        <Slider
          label="Lunghezza sfilo"
          unit="m"
          min={model.mainBoom.retractedLength}
          max={model.mainBoom.extendedLength}
          step={0.1}
          value={config.mainBoomLengthM}
          onChange={(v) => setConfig({ mainBoomLengthM: v })}
          compact={compact}
        />
        <Slider
          label="Rotazione torretta"
          unit="°"
          min={-180}
          max={180}
          step={1}
          value={config.rotationDeg}
          onChange={(v) => setConfig({ rotationDeg: v })}
          compact={compact}
        />
      </Section>

      {/* Jib */}
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

      {/* Carico */}
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
      </Section>

      {/* Stabilizzatori */}
      <Section title="Stabilizzatori" gap={sGap}>
        {compact ? (
          /* 2×2 grid per risparmiare spazio verticale */
          <div className="grid grid-cols-2 gap-x-3 gap-y-3">
            {Object.entries(config.outriggerExtensionM).map(([name, val]) => (
              <Slider
                key={name}
                label={OUTRIGGER_LABELS[name] ?? name}
                unit="m"
                min={0}
                max={Math.max(...model.outriggers.extensionStepsM)}
                step={model.outriggers.extensionStepsM[1] - model.outriggers.extensionStepsM[0]}
                value={val}
                onChange={(v) => setOutrigger(name, v)}
                compact
              />
            ))}
          </div>
        ) : (
          Object.entries(config.outriggerExtensionM).map(([name, val]) => (
            <Slider
              key={name}
              label={OUTRIGGER_LABELS[name] ?? name}
              unit="m"
              min={0}
              max={Math.max(...model.outriggers.extensionStepsM)}
              step={model.outriggers.extensionStepsM[1] - model.outriggers.extensionStepsM[0]}
              value={val}
              onChange={(v) => setOutrigger(name, v)}
            />
          ))
        )}
      </Section>

      {/* Disclaimer */}
      <p className="text-[10px] text-muted leading-relaxed border-t border-line pt-3 flex-shrink-0">
        Prototipo — validare sempre contro la tabella di carico ufficiale BGLift prima dell'uso in cantiere.
      </p>
    </div>
  )
}

function Section({ title, children, gap = 'gap-3' }) {
  return (
    <section className={`flex flex-col ${gap}`}>
      <h2 className="text-[10px] uppercase tracking-[0.18em] text-accent font-extrabold">
        {title}
      </h2>
      {children}
    </section>
  )
}

const OUTRIGGER_LABELS = {
  frontLeft:  'Ant. SX',
  frontRight: 'Ant. DX',
  rearLeft:   'Post. SX',
  rearRight:  'Post. DX',
}
