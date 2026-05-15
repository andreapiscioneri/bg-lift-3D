/** Helper di formattazione condivisi tra UI 2D e HUD 3D. */

export const fmtKg = (n) =>
  n == null || Number.isNaN(n) ? '—' : `${Math.round(n).toLocaleString('it-IT')} kg`

export const fmtM = (n, decimals = 2) =>
  n == null || Number.isNaN(n) ? '—' : `${n.toFixed(decimals)} m`

export const fmtDeg = (n) =>
  n == null || Number.isNaN(n) ? '—' : `${Math.round(n)}°`

export const fmtPct = (n) =>
  n == null || Number.isNaN(n) ? '—' : `${Math.round(n * 100)} %`

/** Colore per status sicurezza — palette BGLift (default = arancio brand). */
export const statusColor = (status) => {
  switch (status) {
    case 'critical':
      return '#dc2626' // danger
    case 'warning':
      return '#facc15' // warn
    case 'safe':
    default:
      return '#EC6726' // arancio brand (in safe usiamo il brand color, non il verde)
  }
}
