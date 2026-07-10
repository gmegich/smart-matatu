const EARTH_RADIUS_KM = 6371
const DEFAULT_SPEED_KMH = Number(process.env.MATATU_AVG_SPEED_KMH) || 25

function toRad(deg) {
  return (deg * Math.PI) / 180
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function etaMinutes(distanceKm, speedKmh = DEFAULT_SPEED_KMH) {
  if (!distanceKm || distanceKm <= 0) return 0
  return (distanceKm / speedKmh) * 60
}

module.exports = { haversineKm, etaMinutes, DEFAULT_SPEED_KMH }
