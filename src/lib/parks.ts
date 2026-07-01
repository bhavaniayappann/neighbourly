import { withCache } from "./cache";

interface OverpassElement {
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function elementCoords(el: OverpassElement): [number, number] | null {
  if (typeof el.lat === "number" && typeof el.lon === "number") {
    return [el.lon, el.lat];
  }
  if (el.center) return [el.center.lon, el.center.lat];
  return null;
}

async function queryParksNear(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<number> {
  const query = `
[out:json][timeout:10];
(
  node["leisure"="park"](around:${radiusMeters},${lat},${lng});
  way["leisure"="park"](around:${radiusMeters},${lat},${lng});
  relation["leisure"="park"](around:${radiusMeters},${lat},${lng});
);
out center tags;
`.trim();

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Neighbourly/1.0 (park lookup)",
        },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) continue;

      const json = (await res.json()) as OverpassResponse;
      const seen = new Set<string>();
      let count = 0;

      for (const el of json.elements ?? []) {
        const name = el.tags?.name?.trim();
        const coords = elementCoords(el);
        if (!coords) continue;
        const key = name?.toLowerCase() ?? `${el.type}:${el.lat ?? el.center?.lat}`;
        if (seen.has(key)) continue;
        seen.add(key);
        count += 1;
      }

      return count;
    } catch {
      continue;
    }
  }

  return 0;
}

export async function getParkCountForPoint(
  cacheKey: string,
  lat: number,
  lng: number,
  radiusMeters = 2000
): Promise<number> {
  return withCache(cacheKey, "parks", () =>
    queryParksNear(lat, lng, radiusMeters)
  );
}
