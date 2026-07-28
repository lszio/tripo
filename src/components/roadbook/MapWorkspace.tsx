import { useEffect, useState } from "react";
import type { Trip } from "../../domain/roadbook";
import { getActiveDays } from "../../domain/calendar-days";
import { DayNavigator } from "./DayNavigator";
import { MapPreview } from "./MapPreview";

type MapWorkspaceProps = {
  trip: Trip;
  selectedDayId: string;
  onSelectDay: (dayId: string) => void;
  onBack: () => void;
};

export function MapWorkspace({ trip, selectedDayId, onSelectDay, onBack }: MapWorkspaceProps) {
  const day = trip.days.find(item => item.id === selectedDayId);
  const [mode, setMode] = useState<"day" | "route">("route");
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onBack();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack]);

  return (
    <section aria-label="地图工作区" className="map-workspace">
      <header className="map-workspace-header">
        <div><p className="eyebrow">自由行路书</p><h1>地图工作区</h1><p>{trip.name}{day ? ` · ${day.date}` : ""}</p></div>
        <button aria-label="返回路书编辑器" onClick={onBack} type="button">返回编辑器</button>
      </header>
      <div className="map-workspace-tools"><div role="group" aria-label="地图展示模式"><button aria-pressed={mode === "route"} onClick={() => setMode("route")} type="button">每日路线总览</button><button aria-pressed={mode === "day"} onClick={() => setMode("day")} type="button">单日节点</button></div>{mode === "day" && <DayNavigator days={getActiveDays(trip)} onSelect={onSelectDay} selectedDayId={selectedDayId} />}</div>
      <div className="map-workspace-main"><MapPreview dayId={selectedDayId} layout="workspace" mode={mode} trip={trip} /></div>
    </section>
  );
}
