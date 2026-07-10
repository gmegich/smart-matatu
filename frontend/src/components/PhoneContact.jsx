export function formatTel(phone) {
  if (!phone) return null
  const digits = String(phone).replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('254')) return `+${digits}`
  if (digits.startsWith('0')) return `+254${digits.slice(1)}`
  if (digits.length === 9) return `+254${digits}`
  return `+${digits}`
}

export default function PhoneContact({ name, phone, label }) {
  const tel = formatTel(phone)
  if (!phone) {
    return (
      <p className="text-sm text-amber-700">
        {label || name}: hakuna nambari ya simu — ongeza kwenye wasifu.
      </p>
    )
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white p-3 text-sm">
      <div>
        <p className="font-medium text-gray-800">{label || name}</p>
        {name && label && <p className="text-gray-600">{name}</p>}
      </div>
      {tel ? (
        <a href={`tel:${tel}`} className="font-semibold text-green-700 hover:underline">
          {phone}
        </a>
      ) : (
        <span className="text-gray-700">{phone}</span>
      )}
    </div>
  )
}
