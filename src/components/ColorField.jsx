import { useState } from 'react'
import { Check } from 'lucide-react'

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

/** #abc -> #aabbcc, so the rgb readout and swatch comparison stay simple. */
const expand = (hex) =>
  hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase()
    : hex.toLowerCase()

const toRgb = (hex) => {
  const h = expand(hex)
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
}

export default function ColorField({ value, presets = [], onChange }) {
  const [text, setText] = useState(value)
  const [lastValue, setLastValue] = useState(value)

  /** Typed text -> canonical #rrggbb, or null if it isn't a colour yet. */
  const normalize = (raw) => {
    const v = raw.trim()
    const withHash = v.startsWith('#') ? v : `#${v}`
    return HEX.test(withHash) ? expand(withHash) : null
  }

  // Re-sync the text box when the colour changes from OUTSIDE (swatch, native
  // picker, reset). Adjusting during render rather than in an effect avoids an
  // extra render pass. The normalize() guard is what stops it from rewriting
  // half-typed input: "#00b" already means the value we just committed, so it
  // is left alone instead of being expanded to "#0000bb" mid-keystroke.
  if (value !== lastValue) {
    setLastValue(value)
    if (normalize(text) !== value) setText(value)
  }

  // Commit as soon as the text is a valid colour so the preview tracks typing
  // and the parent never holds a stale value.
  const handleText = (raw) => {
    setText(raw)
    const hex = normalize(raw)
    if (hex) onChange(hex)
  }

  const commit = (raw) => {
    const hex = normalize(raw)
    if (hex) { onChange(hex); setText(hex) }
    else setText(value) // invalid — snap back rather than store junk
  }

  const [r, g, b] = toRgb(HEX.test(value) ? value : '#000000')

  return (
    <div className="colorfield">
      {presets.length > 0 && (
        <div className="colorfield__swatches">
          {presets.map((c) => (
            <button
              key={c}
              type="button"
              className={`swatch${expand(value) === expand(c) ? ' is-active' : ''}`}
              style={{ background: c }}
              onClick={() => onChange(expand(c))}
              title={c}
              aria-label={`Use ${c}`}
            >
              {expand(value) === expand(c) && <Check size={13} strokeWidth={3.5} />}
            </button>
          ))}
        </div>
      )}

      <div className="colorfield__custom">
        <input
          type="color"
          className="colorfield__picker"
          value={HEX.test(value) ? expand(value) : '#000000'}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          aria-label="Pick a custom colour"
        />
        <input
          type="text"
          className="input colorfield__hex"
          value={text}
          onChange={(e) => handleText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(e.currentTarget.value) }
            if (e.key === 'Escape') setText(value)
          }}
          spellCheck={false}
          aria-label="Hex colour"
        />
        <span className="colorfield__rgb">rgb({r}, {g}, {b})</span>
      </div>
    </div>
  )
}
