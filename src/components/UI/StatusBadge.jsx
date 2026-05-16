import { fmtKg, fmtM, fmtPct } from '../../utils/format'

const LABELS = {
  safe:     'IN SICUREZZA',
  warning:  'ATTENZIONE',
  critical: 'CRITICO — STOP',
}

const STYLES = {
  safe:     'bg-safe/8  border-safe   text-safe',
  warning:  'bg-warn/12 border-warn   text-yellow-700',
  critical: 'bg-danger/10 border-danger text-danger animate-pulse',
}

export default function StatusBadge({ safety, compact = false }) {
  if (!safety) {
    return (
      <div className="px-3 py-2 rounded-lg border border-line bg-white text-xs text-muted">
        Calcolo in corso…
      </div>
    )
  }

  const klass = STYLES[safety.status] ?? STYLES.safe
  const label = LABELS[safety.status] ?? LABELS.safe
  const tippingPct = Math.max(0, Math.min(100, Math.round(safety.tippingMargin * 100)))

  /* compact=true → versione ridotta per panel xs */
  if (compact) {
    return (
      <div className={`rounded-lg border ${klass} text-xs overflow-hidden`}>
        <div className="flex items-center justify-between gap-2 px-3 py-1.5">
          <div className="flex items-center gap-1.5 font-extrabold tracking-wide">
            <span className="inline-block h-2 w-2 rounded-full bg-current flex-shrink-0" />
            {label}
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-black">
            <span className="text-muted">{fmtM(safety.radiusM)}</span>
            <span className="font-bold">{fmtPct(safety.loadUtil)}</span>
          </div>
        </div>
        <div className="px-3 pb-2 flex flex-col gap-0.5">
          <div className="h-1.5 rounded-full bg-black/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${tippingPct}%`,
                background: safety.tippingMargin <= 0 ? '#dc2626' : safety.tippingMargin <= 0.20 ? '#b45309' : '#16a34a',
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border ${klass} text-xs overflow-hidden`}>
      {/* Header status */}
      <div className="flex items-center gap-2 font-extrabold tracking-wide px-3 py-2">
        <span className="inline-block h-2 w-2 rounded-full bg-current flex-shrink-0" />
        {label}
      </div>

      {/* Grid metriche */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[11px] text-black px-3 pb-2">
        <span className="text-muted">Raggio</span>
        <span className="text-right">{fmtM(safety.radiusM)}</span>

        <span className="text-muted">SWL</span>
        <span className="text-right">{fmtKg(safety.swl_kg)}</span>

        <span className="text-muted">Util. carico</span>
        <span className="text-right font-bold">{fmtPct(safety.loadUtil)}</span>

        <span className="text-muted">Util. pad max</span>
        <span className="text-right">{fmtPct(safety.maxPadUtil)}</span>
      </div>

      {/* Barra margine ribaltamento */}
      <div className="px-3 pb-2.5 flex flex-col gap-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted font-medium">Margine ribaltamento</span>
          <span className="font-mono font-bold">{tippingPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-black/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${tippingPct}%`,
              background:
                safety.tippingMargin <= 0    ? '#dc2626' :
                safety.tippingMargin <= 0.20 ? '#b45309' : '#16a34a',
            }}
          />
        </div>
        <p className="text-[9px] text-muted leading-tight">
          EN 13000 — ribaltamento a 0% · soglia di attenzione a 20%
        </p>
      </div>
    </div>
  )
}
