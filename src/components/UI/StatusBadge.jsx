import { fmtKg, fmtM, fmtPct } from '../../utils/format'

const LABELS = {
  safe: 'IN SICUREZZA',
  warning: 'ATTENZIONE',
  critical: 'CRITICO — STOP',
}

// Su sfondo bianco usiamo riempimenti più solidi
const BG = {
  safe: 'bg-safe/10 border-safe text-safe',
  warning: 'bg-warn/15 border-warn text-yellow-700',
  critical: 'bg-danger/10 border-danger text-danger animate-pulse',
}

export default function StatusBadge({ safety }) {
  if (!safety) {
    return (
      <div className="px-3 py-2 rounded-lg border border-line bg-white text-xs text-muted">
        Calcolo in corso…
      </div>
    )
  }

  const klass = BG[safety.status] ?? BG.safe
  const label = LABELS[safety.status] ?? LABELS.safe

  return (
    <div className={`px-3 py-2 rounded-lg border ${klass} text-xs`}>
      <div className="flex items-center gap-2 font-extrabold tracking-wide">
        <span className="inline-block h-2 w-2 rounded-full bg-current" />
        {label}
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[11px] text-black">
        <span className="text-muted">Raggio</span>
        <span className="text-right">{fmtM(safety.radiusM)}</span>
        <span className="text-muted">SWL</span>
        <span className="text-right">{fmtKg(safety.swl_kg)}</span>
        <span className="text-muted">Util. carico</span>
        <span className="text-right">{fmtPct(safety.loadUtil)}</span>
        <span className="text-muted">Util. pad max</span>
        <span className="text-right">{fmtPct(safety.maxPadUtil)}</span>
      </div>
    </div>
  )
}
