import { useCraneStore } from '../../store/craneStore'
import Slider from './Slider'
import StatusBadge from './StatusBadge'

/**
 * Pannello di controllo principale: slider per cinematica, carico e stabilizzatori.
 * Lo stesso componente è usato sia nel Bottom Sheet mobile sia nel Side Panel desktop.
 */
export default function ControlsPanel() {
  const model = useCraneStore((s) => s.model)
  const config = useCraneStore((s) => s.config)
  const safety = useCraneStore((s) => s.safety)
  const setConfig = useCraneStore((s) => s.setConfig)
  const setOutrigger = useCraneStore((s) => s.setOutrigger)
  const reset = useCraneStore((s) => s.reset)

  return (
    <div className="flex flex-col gap-5 p-4 md:p-5 max-h-full overflow-y-auto bg-white">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold leading-tight text-accent">
            {model.displayName}
          </h1>
          <p className="text-xs text-muted font-medium">Configurazione di sollevamento</p>
        </div>
        <button
          onClick={reset}
          className="text-xs font-semibold px-2.5 py-1.5 rounded border border-line text-black hover:bg-black hover:text-white transition-colors"
        >
          Reset
        </button>
      </header>

      <StatusBadge safety={safety} />

      <Section title="Braccio principale">
        <Slider
          label="Angolo"
          unit="°"
          min={model.mainBoom.elevationRangeDeg[0]}
          max={model.mainBoom.elevationRangeDeg[1]}
          step={1}
          value={config.mainBoomAngleDeg}
          onChange={(v) => setConfig({ mainBoomAngleDeg: v })}
        />
        <Slider
          label="Lunghezza (sfilo totale)"
          unit="m"
          min={model.mainBoom.retractedLength}
          max={model.mainBoom.extendedLength}
          step={0.1}
          value={config.mainBoomLengthM}
          onChange={(v) => setConfig({ mainBoomLengthM: v })}
        />
        <Slider
          label="Rotazione torretta"
          unit="°"
          min={-180}
          max={180}
          step={1}
          value={config.rotationDeg}
          onChange={(v) => setConfig({ rotationDeg: v })}
        />
      </Section>

      {model.jib?.available && (
        <Section title="Jib">
          <Slider
            label="Angolo articolazione"
            unit="°"
            min={model.jib.articulationRangeDeg[0]}
            max={model.jib.articulationRangeDeg[1]}
            step={1}
            value={config.jibAngleDeg}
            onChange={(v) => setConfig({ jibAngleDeg: v })}
          />
          <Slider
            label="Sfilo Jib"
            unit="m"
            min={0}
            max={model.jib.extendedLength}
            step={0.1}
            value={config.jibLengthM}
            onChange={(v) => setConfig({ jibLengthM: v })}
          />
        </Section>
      )}

      <Section title="Carico">
        <Slider
          label="Massa al gancio"
          unit="kg"
          min={0}
          max={Math.ceil(model.loadChart.swl_kg[0][0] / 100) * 100}
          step={50}
          value={config.loadKg}
          onChange={(v) => setConfig({ loadKg: v })}
        />
      </Section>

      <Section title="Stabilizzatori (sfilo per piede)">
        {Object.entries(config.outriggerExtensionM).map(([name, val]) => (
          <Slider
            key={name}
            label={labelFor(name)}
            unit="m"
            min={0}
            max={Math.max(...model.outriggers.extensionStepsM)}
            step={model.outriggers.extensionStepsM[1] - model.outriggers.extensionStepsM[0]}
            value={val}
            onChange={(v) => setOutrigger(name, v)}
          />
        ))}
      </Section>

      <p className="text-[10px] text-muted leading-relaxed border-t border-line pt-3">
        Prototipo: i calcoli usano un modello semplificato. Validare sempre contro
        la tabella di carico ufficiale BGLift prima dell'uso in cantiere.
      </p>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[11px] uppercase tracking-[0.15em] text-accent font-extrabold">
        {title}
      </h2>
      {children}
    </section>
  )
}

function labelFor(name) {
  return {
    frontLeft: 'Anteriore SX',
    frontRight: 'Anteriore DX',
    rearLeft: 'Posteriore SX',
    rearRight: 'Posteriore DX',
  }[name] ?? name
}
