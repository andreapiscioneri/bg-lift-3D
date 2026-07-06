import { useState } from 'react'
import { useCraneStore } from '../../store/craneStore'
import Slider from './Slider'
import StatusBadge from './StatusBadge'
import { fmtM, fmtPct } from '../../utils/format'
import { BOOM_PART_NAMES, RAM_PART_NAME, BOOM_NATIVE_LENGTH } from '../3D/CraneScene'

// Range e step (in metri) per gli slider Pos. X/Z di ogni pezzo — stesso
// range relativo che avevano prima in unità native, solo espresso in un'unità
// fisica reale e leggibile invece dell'unità interna del motore 3D.
const PART_POS_RANGE_M = 5
const PART_POS_STEP_M = 0.05

const AXIS_LABELS = ['X', 'Y', 'Z']

// Etichette leggibili per i componenti reali dell'assieme CAD (nomi come nel file STEP).
const BOOM_PART_LABELS = {
  BR0089:         'Piastra cassone 1 (BR0089)',
  BR0007:         'Piastra cassone 2 (BR0007)',
  BR0008:         'Piastra cassone 3 (BR0008)',
  BR0009:         'Piastra cassone 4 (BR0009)',
  CR0082:         'Testa/puleggia (CR0082)',
  MR0003S_Chiuso: 'Martinetto idraulico (MR0003S)',
  GA0001:         'Perno base (GA0001)',
  BC0040:         'Boccola base (BC0040)',
  PR0038:         'Piastra attacco base (PR0038)',
}

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
  const partTransforms     = useCraneStore((s) => s.partTransforms)
  const setPartAxis        = useCraneStore((s) => s.setPartAxis)
  const resetPart          = useCraneStore((s) => s.resetPart)
  const resetPartTransforms = useCraneStore((s) => s.resetPartTransforms)

  const [expanded, setExpanded] = useState(() => new Set())
  const togglePart = (name) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })

  const xs = size === 'xs'
  const lg = size === 'lg'

  const pad  = xs ? 'p-2'   : lg ? 'p-5'   : 'p-3'
  const gap  = xs ? 'gap-3' : lg ? 'gap-5'  : 'gap-4'
  const sGap = xs ? 'gap-2' : lg ? 'gap-3'  : 'gap-2.5'
  const compact = !lg  // slider/pad compact se non desktop

  // "Lunghezza sfilo" e la Pos. Y del martinetto sono la stessa identica
  // grandezza (config.mainBoomLengthM), mostrata qui nella stessa identica
  // unità e range in entrambi i punti del pannello — la conversione in
  // unità native del modello 3D avviene solo dentro CraneScene.jsx per il
  // rendering, mai in questa UI.
  //
  // Stesso principio per Pos. X/Y/Z di ogni pezzo: il modello CAD lavora in
  // "unità native" pre-scala, ma qui mostriamo sempre metri reali — l'utente
  // non deve mai vedere un'unità di misura senza significato fisico.
  const partScale = model.mainBoom.retractedLength / BOOM_NATIVE_LENGTH

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
          label="Lunghezza sfilo"
          unit="m"
          min={model.mainBoom.retractedLength}
          max={model.mainBoom.extendedLength}
          step={0.1}
          value={config.mainBoomLengthM}
          defaultValue={model.defaultConfiguration.mainBoomLengthM}
          onChange={(v) => setConfig({ mainBoomLengthM: v })}
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

        {/* Controllo manuale del modello CAD — posizione e rotazione per ogni pezzo reale */}
        <div className="flex items-center justify-between mt-1 pt-2 border-t border-line">
          <span className="text-[10px] text-muted">Modello CAD — posizione/rotazione per componente</span>
          <button
            onClick={resetPartTransforms}
            className="text-[10px] font-semibold text-accent hover:underline flex-shrink-0"
          >
            Riassembla tutto
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          {BOOM_PART_NAMES.map((name) => (
            <PartAccordion
              key={name}
              name={name}
              label={BOOM_PART_LABELS[name] ?? name}
              isOpen={expanded.has(name)}
              onToggle={() => togglePart(name)}
              transform={partTransforms[name]}
              setAxis={setPartAxis}
              onReset={() => resetPart(name)}
              compact={compact}
              isRam={name === RAM_PART_NAME}
              mainBoom={model.mainBoom}
              mainBoomLengthM={config.mainBoomLengthM}
              defaultMainBoomLengthM={model.defaultConfiguration.mainBoomLengthM}
              setConfig={setConfig}
              partScale={partScale}
            />
          ))}
        </div>
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


// Pannello a fisarmonica per un singolo pezzo: posizione X/Y/Z (in metri
// reali — convertita da/verso le unità native del modello 3D) e rotazione
// X/Y/Z (gradi, attorno al baricentro del pezzo). Per il martinetto (isRam)
// la Pos. Y è la stessa identica grandezza di "Lunghezza sfilo" in cima al
// pannello — stessa unità (m) e stesso range: modificabile da qui, aggiorna
// anche lo slider in alto (e viceversa).
function PartAccordion({
  name, label, isOpen, onToggle, transform, setAxis, onReset, compact,
  isRam, mainBoom, mainBoomLengthM, defaultMainBoomLengthM, setConfig, partScale,
}) {
  const position = transform?.position ?? [0, 0, 0]
  const rotation = transform?.rotation ?? [0, 0, 0]
  const isModified = Boolean(transform)

  return (
    <div className="rounded-lg border border-line overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-2 bg-white hover:bg-black/[0.03] transition-colors text-left"
      >
        <span className="text-xs font-semibold text-black truncate flex items-center gap-1.5">
          {isModified && <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />}
          {label}
        </span>
        <span className="text-muted text-xs flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="px-2.5 py-2.5 border-t border-line flex flex-col gap-2.5 bg-black/[0.015]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wide text-muted font-semibold">Posizione</span>
            <button onClick={onReset} className="text-[10px] font-semibold text-accent hover:underline">
              Reset pezzo
            </button>
          </div>
          {AXIS_LABELS.map((axisLabel, axis) => {
            if (isRam && axis === 1) {
              return (
                <Slider
                  key="pos-1"
                  label="Pos. Y (= Lunghezza sfilo)"
                  unit="m"
                  min={mainBoom.retractedLength}
                  max={mainBoom.extendedLength}
                  step={0.1}
                  value={mainBoomLengthM}
                  defaultValue={defaultMainBoomLengthM}
                  onChange={(v) => setConfig({ mainBoomLengthM: v })}
                  compact={compact}
                />
              )
            }
            return (
              <Slider
                key={`pos-${axis}`}
                label={`Pos. ${axisLabel}`}
                unit="m"
                min={-PART_POS_RANGE_M}
                max={PART_POS_RANGE_M}
                step={PART_POS_STEP_M}
                value={position[axis] * partScale}
                defaultValue={0}
                onChange={(v) => setAxis(name, 'position', axis, v / partScale)}
                compact={compact}
              />
            )
          })}

          <span className="text-[9px] uppercase tracking-wide text-muted font-semibold mt-1">Rotazione</span>
          {AXIS_LABELS.map((axisLabel, axis) => (
            <Slider
              key={`rot-${axis}`}
              label={`Rot. ${axisLabel}`}
              unit="°"
              min={-180}
              max={180}
              step={1}
              value={rotation[axis]}
              defaultValue={0}
              onChange={(v) => setAxis(name, 'rotation', axis, v)}
              compact={compact}
            />
          ))}
        </div>
      )}
    </div>
  )
}

