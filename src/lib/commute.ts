import { estimateCommuteMinutes as estimateMinutes } from "./commute-estimate";
import { geocodePlace, type GeoPoint } from "./geocode-places";

export type { GeoPoint };

export { estimateMinutes as estimateCommuteMinutes };

export async function geocodeDestination(query: string): Promise<GeoPoint | null> {
  return geocodePlace(query);
}
