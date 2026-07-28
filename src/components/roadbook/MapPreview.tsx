import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import { getDayMapNodes, getMapSegments, getTripMapRoute, type MapNode, type MapRouteSegment } from "../../domain/map-routes";
import type { Location, Trip } from "../../domain/roadbook";
import { OpenStreetMapLink } from "./OpenStreetMapLink";

type MapPreviewProps = {
  trip: Trip;
  dayId: string;
  onOpenMap?: () => void;
  layout?: "preview" | "workspace";
  mode?: "day" | "route";
};

type LocatedNode = MapNode & { location: Location & { latitude: number; longitude: number } };

const transparentTile = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function hasCoordinates(node: MapNode): node is LocatedNode {
  return node.location?.latitude !== undefined && node.location.longitude !== undefined;
}

export function OpenStreetMapCanvas({ nodes, segments, layout = "preview" }: { nodes: MapNode[]; segments: MapRouteSegment[]; layout?: "preview" | "workspace" }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const located = useMemo(() => nodes.filter(hasCoordinates), [nodes]);

  useEffect(() => {
    if (!containerRef.current || located.length === 0) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: layout === "workspace", zoomControl: true });
    const points = located.map(node => L.latLng(node.location.latitude, node.location.longitude));
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      referrerPolicy: "strict-origin-when-cross-origin",
      errorTileUrl: transparentTile,
      attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors"
    }).on("tileerror", event => {
      (event.tile as HTMLImageElement).src = transparentTile;
    }).addTo(map);

    const markerIcon = (node: LocatedNode) => L.divIcon({ className: "leaflet-route-marker", html: `<span style=\"background:${node.color}\">${node.index}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] });
    located.forEach(node => {
      const content = document.createElement("strong");
      content.textContent = `${node.index}. ${node.name}`;
      L.marker(L.latLng(node.location.latitude, node.location.longitude), { icon: markerIcon(node), title: node.name, alt: node.name }).addTo(map).bindPopup(content);
    });
    segments.forEach(segment => L.polyline([
      L.latLng(segment.from.location.latitude, segment.from.location.longitude),
      L.latLng(segment.to.location.latitude, segment.to.location.longitude)
    ], { color: segment.color, opacity: .84, weight: 4 }).addTo(map));
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [28, 28] });
    else map.setView(points[0], 14);
    return () => { map.remove(); };
  }, [located, segments, layout]);

  if (located.length === 0) return <div className="map-setup-notice"><strong>等待时间轴地点</strong><span>将活动或入住安排到时间轴，并填写地点坐标后，会在地图中显示节点。</span></div>;
  return <div aria-label="OpenStreetMap 地图" className={`openstreetmap-canvas is-${layout}`} ref={containerRef} />;
}

export function MapPreview({ trip, dayId, onOpenMap, layout = "preview", mode = "day" }: MapPreviewProps) {
  const route = mode === "route" ? getTripMapRoute(trip) : undefined;
  const nodes = route?.nodes ?? getDayMapNodes(trip, dayId);
  const segments = route?.segments ?? getMapSegments(nodes);
  const missing = nodes.filter(node => !hasCoordinates(node));
  const title = mode === "route" ? "每日路线" : "OpenStreetMap";
  const subtitle = mode === "route" ? "全行程时间轴节点" : "当日时间轴节点";

  return (
    <section aria-label="地图预览" className={`map-preview is-${layout} is-${mode}`}>
      <header><div><h2>{title}</h2><span>{subtitle}</span></div>{onOpenMap && <button onClick={onOpenMap} type="button">进入地图工作区</button>}</header>
      <OpenStreetMapCanvas layout={layout} nodes={nodes} segments={segments} />
      {mode === "route" && route && <div aria-label="每日路线图例" className="map-day-legend">{route.days.map((day, index) => <span key={day.id}><i style={{ background: day.color }} />Day {index + 1} · {day.date}</span>)}</div>}
      <div className="map-node-list">
        {nodes.map(node => <p key={node.id}><b style={{ background: node.color }}>{node.index}</b><strong>{node.name}</strong>{node.location ? <OpenStreetMapLink location={node.location} /> : <span>未设置位置</span>}</p>)}
      </div>
      {missing.length > 0 && <p className="map-helper">时间轴中仍有 {missing.length} 个节点未设置坐标。</p>}
      {nodes.length === 0 && <p>当前时间轴没有地点节点</p>}
    </section>
  );
}
