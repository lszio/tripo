import type { Location } from "./roadbook";

type NominatimResult = {
  display_name?: string;
  lat?: string;
  lon?: string;
};

const cache = new Map<string, Location[]>();
let lastRequestAt = 0;

function normalizedQuery(query: string) {
  return query.trim().replace(/\s+/g, " ");
}

function wait(milliseconds: number) {
  return new Promise<void>(resolve => window.setTimeout(resolve, milliseconds));
}

async function waitForNextRequest() {
  const remaining = 1000 - (Date.now() - lastRequestAt);
  if (remaining > 0) await wait(remaining);
  lastRequestAt = Date.now();
}

function toLocation(result: NominatimResult): Location | undefined {
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  if (!result.display_name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
  return { name: result.display_name, latitude, longitude };
}

export async function searchLocations(query: string, fetcher: typeof fetch = fetch): Promise<Location[]> {
  const normalized = normalizedQuery(query);
  if (!normalized) return [];

  const cacheKey = normalized.toLocaleLowerCase();
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  await waitForNextRequest();
  const response = await fetcher(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(normalized)}`, {
    headers: { Accept: "application/json" }
  });
  if (!response.ok) throw new Error("地点搜索暂时不可用");

  const results = await response.json() as NominatimResult[];
  const locations = results.map(toLocation).filter((location): location is Location => Boolean(location));
  cache.set(cacheKey, locations);
  return locations;
}

export function clearLocationSearchCache() {
  cache.clear();
  lastRequestAt = 0;
}
