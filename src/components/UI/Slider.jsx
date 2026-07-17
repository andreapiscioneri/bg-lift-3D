import { useState, useEffect, useRef } from 'react'

/**
 * Slider touch-friendly.
 * compact=true → etichette più piccole, thumb leggermente ridotto,
 * meno spazio verticale (per la griglia 2×2 degli stabilizzatori).
 * positions=[…] → slider a posizioni fisse (fori meccanici): il cursore
 * scatta solo sui valori elencati e sotto la barra compaiono tutte le tacche.
 */
export default function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  disabled = false,
  compact = false,
  defaultValue,
  positions,
}) {
  // Modalità a posizioni fisse: si lavora in "spazio indice" (0..n-1) e si
  // riconverte al valore meccanico; il testo digitato scatta al foro più vicino.
  const fixed = Array.isArray(positions) && positions.length > 1
  const nearestIndex = (v) =>
    positions.reduce((best, p, i) =>
      Math.abs(p - v) < Math.abs(positions[best] - v) ? i : best, 0)
  const snap = (v) => positions[nearestIndex(v)]

  const decimals = fixed
    ? (positions.some((p) => p % 1 !== 0) ? 1 : 0)
    : (step < 1 ? 1 : 0)
  const epsilon = fixed ? 1e-6 : step / 2
  const isModified = defaultValue !== undefined && Math.abs(value - defaultValue) > epsilon
  const formatted =
    typeof value === 'number' ? value.toFixed(decimals) : String(value)

  // Il testo digitato vive in uno stato locale, scollegato dal valore
  // "committato" finché l'utente sta scrivendo — altrimenti ogni carattere
  // digitato triggererebbe un onChange che ri-renderizza il campo con il
  // valore arrotondato/clampato, spezzando la digitazione (es. "-1.5" non
  // riusciva mai a comparire perché il primo "-" veniva subito sovrascritto).
  const [text, setText] = useState(formatted)
  const isFocused = useRef(false)

  useEffect(() => {
    if (!isFocused.current) setText(formatted)
  }, [formatted])

  const commit = () => {
    const parsed = parseFloat(text.replace(',', '.'))
    if (Number.isNaN(parsed)) {
      setText(formatted)
      return
    }
    const committed = fixed
      ? snap(parsed)
      : Math.min(max, Math.max(min, parsed))
    onChange(committed)
    setText(committed.toFixed(decimals))
  }

  return (
    <label className="block select-none w-full">
      {/* Azzera — sopra il valore (stessa colonna a destra), testo allineato a sinistra */}
      {isModified && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onChange(defaultValue) }}
            className="text-[9px] font-semibold text-accent hover:underline text-left"
          >
            Azzera
          </button>
        </div>
      )}

      {/* Label + valore editabile */}
      <div className={`flex items-baseline justify-between gap-2 ${compact ? 'mb-1' : 'mb-1.5'}`}>
        <span className={`font-semibold text-black ${compact ? 'text-xs' : 'text-sm'} truncate mr-2`}>
          {label}
        </span>
        <span className="flex items-baseline flex-shrink-0">
          <input
            type="text"
            inputMode="decimal"
            value={text}
            disabled={disabled}
            onChange={(e) => setText(e.target.value)}
            onFocus={(e) => { isFocused.current = true; e.target.select() }}
            onBlur={() => { isFocused.current = false; commit() }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }}
            className={[
              'font-mono font-bold text-accent bg-transparent text-right border-b border-dashed border-accent/40',
              'focus:outline-none focus:border-accent focus:border-solid',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              compact ? 'text-xs w-11' : 'text-sm w-14',
            ].join(' ')}
          />
          {unit && <span className="text-muted ml-0.5 font-medium text-xs">{unit}</span>}
        </span>
      </div>

      {/* Track + thumb — in modalità posizioni fisse il range lavora
          sull'indice del foro, così il cursore scatta tra le tacche */}
      <input
        type="range"
        min={fixed ? 0 : min}
        max={fixed ? positions.length - 1 : max}
        step={fixed ? 1 : step}
        value={fixed ? nearestIndex(value) : value}
        disabled={disabled}
        onChange={(e) => {
          const v = parseFloat(e.target.value)
          onChange(fixed ? positions[v] : v)
        }}
        className={[
          'w-full appearance-none rounded-full bg-line accent-accent cursor-pointer',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          // Thumb webkit
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:bg-accent',
          '[&::-webkit-slider-thumb]:border-2',
          '[&::-webkit-slider-thumb]:border-white',
          '[&::-webkit-slider-thumb]:shadow-md',
          '[&::-webkit-slider-thumb]:cursor-pointer',
          '[&::-webkit-slider-thumb]:transition-transform',
          '[&::-webkit-slider-thumb]:active:scale-110',
          // Thumb moz
          '[&::-moz-range-thumb]:rounded-full',
          '[&::-moz-range-thumb]:bg-accent',
          '[&::-moz-range-thumb]:border-2',
          '[&::-moz-range-thumb]:border-white',
          '[&::-moz-range-thumb]:shadow-md',
          '[&::-moz-range-thumb]:cursor-pointer',
        ].join(' ')}
        style={{
          height: compact ? 10 : 12,
          // Thumb size via CSS custom property non supportata da Tailwind arbitrario in tutti i browser
          // Usiamo uno stile inline per il thumb
          '--thumb-size': compact ? '22px' : '26px',
        }}
      />

      {/* Min / Max — o tutte le tacche in modalità posizioni fisse */}
      <div className="flex justify-between mt-0.5">
        {(fixed ? positions : [min, max]).map((p, i) => (
          <span
            key={i}
            className={`font-mono ${fixed && Math.abs(p - value) < 1e-6 ? 'text-accent font-bold' : 'text-muted'} ${compact ? 'text-[9px]' : 'text-[10px]'}`}
          >
            {p}{unit}
          </span>
        ))}
      </div>
    </label>
  )
}
