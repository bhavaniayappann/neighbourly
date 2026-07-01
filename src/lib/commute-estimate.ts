/** Haversine road-distance commute estimate (no external API). */

function haversineMiles(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function estimateCommuteMinutes(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number
): number {
  const roadMiles = haversineMiles(fromLng, fromLat, toLng, toLat) * 1.3;
  const peakMph = 28;
  return Math.round((roadMiles / peakMph) * 60);
}
