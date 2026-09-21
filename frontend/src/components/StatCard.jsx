const colorStyles = {
  green: {
    card: 'border-emerald-100 bg-gradient-to-br from-emerald-50 to-white',
    icon: 'bg-emerald-100 text-emerald-600',
    value: 'text-emerald-800',
    glow: 'bg-emerald-400',
  },
  red: {
    card: 'border-red-100 bg-gradient-to-br from-red-50 to-white',
    icon: 'bg-red-100 text-red-600',
    value: 'text-red-800',
    glow: 'bg-red-400',
  },
  blue: {
    card: 'border-sky-100 bg-gradient-to-br from-sky-50 to-white',
    icon: 'bg-sky-100 text-sky-600',
    value: 'text-sky-800',
    glow: 'bg-sky-400',
  },
  yellow: {
    card: 'border-amber-100 bg-gradient-to-br from-amber-50 to-white',
    icon: 'bg-amber-100 text-amber-600',
    value: 'text-amber-800',
    glow: 'bg-amber-400',
  },
}

export default function StatCard({ title, value, subtitle, icon, color = 'green' }) {
  const s = colorStyles[color] || colorStyles.green

  return (
    <div className={`card card-hover relative overflow-hidden p-5 ${s.card}`}>
      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.12] ${s.glow}`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className={`mt-1.5 text-2xl font-extrabold tracking-tight ${s.value}`}>{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>
        {icon && (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${s.icon}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
