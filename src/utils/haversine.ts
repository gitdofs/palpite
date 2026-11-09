// Funções puras para cálculo matemático do jogo, mantendo a lógica separada da UI.
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function scoreFromDistance(distanceKm: number): number {
  const maxPoints = 5000;
  const decayFactor = Math.exp(-(distanceKm / 2500));
  return Math.max(0, Math.round(maxPoints * decayFactor));
}
