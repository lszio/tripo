import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useId, useRef, useState } from "react";
import type { Location } from "../../domain/roadbook";
import { searchLocations } from "../../domain/location-search";

type LocatedLocation = Location & { latitude: number; longitude: number };

type LocationPickerProps = {
  label: string;
  value?: Location;
  onChange: (location?: Location) => void;
};

type MapPoint = { latitude: number; longitude: number };

const transparentTile = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function hasCoordinates(location?: Location): location is LocatedLocation {
  return location?.latitude !== undefined && location.longitude !== undefined;
}

function InlineLocationMapPicker({ initialLocation, initialName, onCancel, onConfirm }: {
  initialLocation?: Location;
  initialName: string;
  onCancel: () => void;
  onConfirm: (location: LocatedLocation) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [point, setPoint] = useState<MapPoint | undefined>(() => hasCoordinates(initialLocation) ? { latitude: initialLocation.latitude, longitude: initialLocation.longitude } : undefined);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || container.getClientRects().length === 0) return;

    const initialPoint = hasCoordinates(initialLocation) ? L.latLng(initialLocation.latitude, initialLocation.longitude) : undefined;
    const map = L.map(container, { scrollWheelZoom: true, zoomControl: true }).setView(initialPoint ?? [20, 0], initialPoint ? 13 : 2);
    let marker: L.Marker | undefined;

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      referrerPolicy: "strict-origin-when-cross-origin",
      errorTileUrl: transparentTile,
      attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors"
    }).on("tileerror", event => {
      (event.tile as HTMLImageElement).src = transparentTile;
    }).addTo(map);

    const selectPoint = (latLng: L.LatLng) => {
      setPoint({ latitude: latLng.lat, longitude: latLng.lng });
      if (marker) {
        marker.setLatLng(latLng);
        return;
      }
      marker = L.marker(latLng, { draggable: true }).addTo(map);
      marker.on("dragend", event => selectPoint((event.target as L.Marker).getLatLng()));
    };

    if (initialPoint) selectPoint(initialPoint);
    map.on("click", event => selectPoint(event.latlng));
    return () => { map.remove(); };
  }, [initialLocation]);

  const coordinates = point ? `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}` : "点击地图设置位置";
  const locationName = initialName.trim() || "地图选点";

  return (
    <section aria-label="地点地图选点" className="location-map-picker">
      <header>
        <div><strong>地图选点</strong><span>点击地图或拖动标记定位</span></div>
        <button aria-label="关闭地图选点" onClick={onCancel} type="button">×</button>
      </header>
      <div className="location-map-picker-canvas" ref={containerRef} />
      <footer>
        <output>{coordinates}</output>
        <button disabled={!point} onClick={() => point && onConfirm({ name: locationName, ...point })} type="button">确认位置</button>
      </footer>
    </section>
  );
}

export function LocationPicker({ label, value, onChange }: LocationPickerProps) {
  const inputId = useId();
  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<LocatedLocation[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const [isSearchVisible, setIsSearchVisible] = useState(!value);
  const [isMapPickerVisible, setIsMapPickerVisible] = useState(false);

  useEffect(() => {
    setQuery(value?.name ?? "");
    setIsSearchVisible(!value);
  }, [value?.latitude, value?.longitude, value?.name]);

  const search = async () => {
    if (!query.trim()) {
      setResults([]);
      setStatus("idle");
      return;
    }

    setStatus("loading");
    try {
      const locations = (await searchLocations(query)).filter(hasCoordinates);
      setResults(locations);
      setStatus(locations.length ? "idle" : "empty");
    } catch {
      setResults([]);
      setStatus("error");
    }
  };

  const showMapPicker = () => {
    setResults([]);
    setStatus("idle");
    setIsMapPickerVisible(true);
  };

  const commitMapLocation = (location: LocatedLocation) => {
    onChange(location);
    setQuery(location.name);
    setResults([]);
    setStatus("idle");
    setIsSearchVisible(false);
    setIsMapPickerVisible(false);
  };

  return (
    <div className="location-picker">
      {value && !isSearchVisible ? <>
        <span className="location-picker-label">{label}</span>
        <div className="location-picker-selected">
          <span>{value.name}</span>
          <div>
            <button onClick={() => setIsSearchVisible(true)} type="button">更换地点</button>
            <button onClick={showMapPicker} type="button">地图选点</button>
            <button aria-label="清除地点" onClick={() => { onChange(undefined); setQuery(""); setResults([]); setStatus("idle"); }} type="button">×</button>
          </div>
        </div>
      </> : <>
        <label htmlFor={inputId}>{label}</label>
        <form onSubmit={event => { event.preventDefault(); void search(); }}>
          <input id={inputId} onChange={event => setQuery(event.target.value)} placeholder="搜索城市、景点或地址" value={query} />
          <button disabled={status === "loading" || !query.trim()} type="submit">{status === "loading" ? "搜索中…" : "搜索地点"}</button>
        </form>
        <button className="location-map-picker-trigger" onClick={showMapPicker} type="button">地图选点</button>
      </>}
      {isMapPickerVisible && <InlineLocationMapPicker initialLocation={value} initialName={value?.name ?? query} onCancel={() => setIsMapPickerVisible(false)} onConfirm={commitMapLocation} />}
      {results.length > 0 && <div aria-label="地点搜索结果" className="location-picker-results" role="listbox">{results.map(location => <button key={`${location.name}-${location.latitude}-${location.longitude}`} onClick={() => { onChange(location); setQuery(location.name); setResults([]); setStatus("idle"); }} role="option" type="button"><strong>{location.name}</strong><span>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</span></button>)}</div>}
      {status === "empty" && <p className="location-picker-message" role="status">未找到匹配地点，请换个关键词再试。</p>}
      {status === "error" && <p className="location-picker-message" role="alert">地点搜索暂时不可用，请稍后重试。</p>}
      <small className="location-picker-attribution">地点搜索与地图服务：OpenStreetMap</small>
    </div>
  );
}
