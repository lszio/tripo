import type { Location } from "../../domain/roadbook";

export function openStreetMapUrl(location?: Location) {
  if (location?.latitude !== undefined && location.longitude !== undefined) {
    return `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`;
  }
  return location?.name ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(location.name)}` : undefined;
}

export function OpenStreetMapLink({ location, label = "在 OpenStreetMap 中查看" }: { location?: Location; label?: string }) {
  const href = openStreetMapUrl(location);
  if (!href) return null;
  return <a className="openstreetmap-link" href={href} rel="noreferrer" target="_blank">{label}</a>;
}
