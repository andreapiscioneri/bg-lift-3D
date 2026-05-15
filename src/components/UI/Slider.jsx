/**
 * Slider touch-friendly riutilizzabile.
 * Mostra etichetta, valore corrente e min/max.
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
}) {
  return (
    <label className="block select-none">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-semibold text-black">{label}</span>
        <span className="font-mono text-sm text-accent font-bold">
          {typeof value === 'number' ? value.toFixed(step < 1 ? 1 : 0) : value}
          {unit && <span className="text-muted ml-1 font-medium">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-3 appearance-none rounded-full bg-line accent-accent
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:h-6
                   [&::-webkit-slider-thumb]:w-6
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-accent
                   [&::-webkit-slider-thumb]:border-2
                   [&::-webkit-slider-thumb]:border-white
                   [&::-webkit-slider-thumb]:shadow-md
                   [&::-webkit-slider-thumb]:cursor-pointer
                   disabled:opacity-50"
      />
      <div className="flex justify-between text-[10px] text-muted mt-0.5 font-mono">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </label>
  )
}
