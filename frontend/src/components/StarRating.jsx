import { useState } from 'react'

export const STAR_MEANINGS = {
  1: {
    sw: 'Mbaya sana — usalama au huduma duni',
    en: 'Very poor — unsafe or very bad service',
  },
  2: {
    sw: 'Mbaya — matatizo mengi wakati wa safari',
    en: 'Poor — many problems during the trip',
  },
  3: {
    sw: 'Wastani — safari ya kawaida',
    en: 'Okay — average trip, nothing special',
  },
  4: {
    sw: 'Nzuri — nimeridhika na safari',
    en: 'Good — satisfied with the trip',
  },
  5: {
    sw: 'Bora kabisa — dereva na safari bora',
    en: 'Excellent — great driver and smooth trip',
  },
}

export default function StarRating({
  value,
  onChange,
  disabled = false,
  size = 'lg',
  label = 'Ukadiriaji wa Safari / Overall Rating',
  required = true,
}) {
  const [hover, setHover] = useState(null)
  const scores = [1, 2, 3, 4, 5]
  const active = hover ?? value
  const sizeClass =
    size === 'lg' ? 'text-4xl' : size === 'sm' ? 'text-xl' : 'text-3xl'

  return (
    <div className="w-full">
      {label && (
        <p className="mb-3 text-sm font-bold text-slate-800">
          {label}
          {required && !disabled && <span className="text-red-500"> *</span>}
        </p>
      )}

      <div
        className="flex items-center gap-1"
        role="group"
        aria-label="Rate trip 1 to 5 stars"
        onMouseLeave={() => !disabled && setHover(null)}
      >
        {scores.map((score) => {
          const filled = active != null && score <= active
          return (
            <button
              key={score}
              type="button"
              disabled={disabled}
              onClick={() => onChange?.(score)}
              onMouseEnter={() => !disabled && setHover(score)}
              className={`leading-none transition-transform ${
                disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110'
              } ${sizeClass} ${
                filled ? 'text-amber-400' : 'text-gray-300'
              }`}
              aria-label={`${score} star${score === 1 ? '' : 's'}: ${STAR_MEANINGS[score].en}`}
              aria-pressed={value === score}
            >
              ★
            </button>
          )
        })}
      </div>

      {!disabled && (value == null || value === undefined) && !hover && (
        <p className="mt-2 text-sm text-gray-400">Gusa nyota ukadirie / Tap a star to rate</p>
      )}

      {!disabled && hover != null && (
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-medium text-amber-700">{hover} ★</span> — {STAR_MEANINGS[hover].sw}
          <span className="text-gray-400"> / {STAR_MEANINGS[hover].en}</span>
        </p>
      )}

      {!disabled && value >= 1 && value <= 5 && !hover && (
        <p className="mt-2 text-sm text-gray-700">
          <span className="font-semibold text-amber-700">{value} ★</span> — {STAR_MEANINGS[value].sw}
          <span className="text-gray-400"> / {STAR_MEANINGS[value].en}</span>
        </p>
      )}

      {disabled && value >= 1 && value <= 5 && (
        <p className="mt-2 text-sm text-gray-600">
          {STAR_MEANINGS[value].sw} / {STAR_MEANINGS[value].en}
        </p>
      )}
    </div>
  )
}
