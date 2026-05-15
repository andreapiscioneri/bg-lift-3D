/**
 * Slider touch-friendly.
 * compact=true → etichette più piccole, thumb leggermente ridotto,
 * meno spazio verticale (per la griglia 2×2 degli stabilizzatori).
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
}) {
  const formatted =
    typeof value === 'number' ? value.toFixed(step < 1 ? 1 : 0) : value

  return (
    <label className="block select-none w-full">
      {/* Label + valore */}
      <div className={`flex items-baseline justify-between ${compact ? 'mb-1' : 'mb-1.5'}`}>
        <span className={`font-semibold text-black ${compact ? 'text-xs' : 'text-sm'} truncate mr-2`}>
          {label}
        </span>
        <span className={`font-mono font-bold text-accent flex-shrink-0 ${compact ? 'text-xs' : 'text-sm'}`}>
          {formatted}
          {unit && <span className="text-muted ml-0.5 font-medium">{unit}</span>}
        </span>
      </div>

      {/* Track + thumb */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
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

      {/* Min / Max */}
      <div className="flex justify-between mt-0.5">
        <span className={`font-mono text-muted ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
          {min}{unit}
        </span>
        <span className={`font-mono text-muted ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
          {max}{unit}
        </span>
      </div>
    </label>
  )
}
