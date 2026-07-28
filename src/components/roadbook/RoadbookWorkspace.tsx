import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { useCallback, useEffect, useState } from "react";
import { useStore } from "zustand";
import type { RouteSchedule, StaySchedule, Trip } from "../../domain/roadbook";
import { getActiveDays } from "../../domain/calendar-days";
import { createRoadbookStore } from "../../store/roadbook-store";
import { DayNavigator } from "./DayNavigator";
import { DayTimeline } from "./DayTimeline";
import { BudgetPanel } from "./BudgetPanel";
import { ActivityPreview } from "./ActivityPreview";
import { ActionConfirmation } from "./ActionConfirmation";
import { MapPreview } from "./MapPreview";
import { MaterialLibrary } from "./MaterialLibrary";
import { NodeDetailDrawer } from "./NodeDetailDrawer";
import { StayCard } from "./StayCard";
import { StayDetailDrawer } from "./StayDetailDrawer";
import { TripHeader } from "./TripHeader";
import { RouteDetailDrawer } from "./RouteDetailDrawer";
import { MapWorkspace } from "./MapWorkspace";
import { StayPreview } from "./StayPreview";
import { RoutePreview } from "./RoutePreview";

type RoadbookWorkspaceProps = {
  trip: Trip;
  onCommit: (trip: Trip) => void;
};

type PendingDeletion =
  | { kind: "activity"; id: string; title: string; message: string }
  | { kind: "schedule"; id: string; title: string; message: string }
  | { kind: "stay-schedule"; id: string; title: string; message: string }
  | { kind: "route"; id: string; title: string; message: string }
  | { kind: "stay"; id: string; dayId: string; title: string; message: string };

export function RoadbookWorkspace({ trip, onCommit }: RoadbookWorkspaceProps) {
  const [saveNotice, setSaveNotice] = useState("");
  const [workspaceView, setWorkspaceView] = useState<"editor" | "map">("editor");
  const [previewActivityId, setPreviewActivityId] = useState<string>();
  const [previewStayScheduleId, setPreviewStayScheduleId] = useState<string>();
  const [previewRouteId, setPreviewRouteId] = useState<string>();
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion>();
  const handleCommit = useCallback((nextTrip: Trip) => {
    onCommit(nextTrip);
    setSaveNotice("已保存");
  }, [onCommit]);
  const [store] = useState(() => createRoadbookStore(trip, handleCommit));
  const state = useStore(store);
  const activeDays = getActiveDays(state.trip);

  function handleDragEnd(event: DragEndEvent) {
    const target = event.over?.data.current;
    const source = event.active.data.current;
    if (!target || !source) return;
    if (source.kind === "material" && typeof source.activityId === "string" && target.kind === "material" && typeof target.activityId === "string") return state.reorderActivities(source.activityId, target.activityId);
    if (source.kind === "material" && typeof source.activityId === "string" && typeof target.dayId === "string" && typeof target.slot === "number") return state.scheduleActivity(source.activityId, target.dayId, target.slot);
    if (typeof target.dayId !== "string" || typeof target.slot !== "number") return;
    if (source.kind === "activity" && typeof source.activityId === "string") state.scheduleActivity(source.activityId, target.dayId, target.slot);
    if (source.kind === "stay" && typeof source.stayId === "string") state.scheduleStay(source.stayId, target.dayId, target.slot);
    if (source.kind === "schedule" && typeof source.scheduleId === "string") state.moveActivitySchedule(source.scheduleId, target.dayId, target.slot);
    if (source.kind === "stay-schedule" && typeof source.scheduleId === "string") state.moveStaySchedule(source.scheduleId, target.dayId, target.slot);
    if (source.kind === "route" && typeof source.routeId === "string") state.moveRouteSchedule(source.routeId, target.dayId, target.slot);
  }

  function confirmDeletion() {
    if (!pendingDeletion) return;
    if (pendingDeletion.kind === "activity") state.deleteActivity(pendingDeletion.id);
    if (pendingDeletion.kind === "schedule") state.deleteActivitySchedule(pendingDeletion.id);
    if (pendingDeletion.kind === "stay-schedule") state.deleteStaySchedule(pendingDeletion.id);
    if (pendingDeletion.kind === "route") state.deleteRouteSchedule(pendingDeletion.id);
    if (pendingDeletion.kind === "stay") state.deleteStay(pendingDeletion.dayId, pendingDeletion.id);
    setPreviewActivityId(undefined);
    setPreviewStayScheduleId(undefined);
    setPreviewRouteId(undefined);
    setPendingDeletion(undefined);
  }

  function dismissPreviewOnEmptyClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!previewActivityId && !previewStayScheduleId && !previewRouteId) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select, [role=dialog], .activity-preview, .material-card, .scheduled-activity-card, .scheduled-stay-card, .route-card, .detail-drawer, .confirmation-dialog, .leaflet-container")) return;
    setPreviewActivityId(undefined);
    setPreviewStayScheduleId(undefined);
    setPreviewRouteId(undefined);
  }

  const previewActivity = state.trip.activities.find(activity => activity.id === previewActivityId);
  const previewStaySchedule = state.trip.schedule.find((node): node is StaySchedule => node.type === "stay" && node.id === previewStayScheduleId);
  const previewStay = previewStaySchedule ? state.trip.days.find(day => day.id === previewStaySchedule.dayId)?.stays?.find(stay => stay.id === previewStaySchedule.stayId) : undefined;
  const previewRoute = state.trip.schedule.find((node): node is RouteSchedule => node.type === "route" && node.id === previewRouteId);

  useEffect(() => {
    if (!saveNotice) return;
    const timeout = globalThis.setTimeout(() => setSaveNotice(""), 3200);
    return () => globalThis.clearTimeout(timeout);
  }, [saveNotice]);

  if (workspaceView === "map") return <MapWorkspace onBack={() => setWorkspaceView("editor")} onSelectDay={state.selectDay} selectedDayId={state.selectedDayId} trip={state.trip} />;

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <section className="roadbook-workspace">
        <TripHeader onSave={state.commitTripSettings} trip={state.trip} />
        <DayNavigator
          canPaste={Boolean(state.dayPlanClipboard)}
          copiedDayId={state.dayPlanClipboard?.sourceDayId}
          days={activeDays}
          onCopyDay={state.copyDayPlan}
          onPasteDay={state.pasteDayPlan}
          onSelect={state.selectDay}
          selectedDayId={state.selectedDayId}
        />
        <div className="roadbook-columns" onClick={dismissPreviewOnEmptyClick}>
          <MaterialLibrary activities={state.trip.activities} onCreateActivity={state.createActivityDraft} onDeleteActivity={activityId => {
            const count = state.trip.schedule.filter(node => node.type === "activity" && node.activityId === activityId).length;
            setPendingDeletion({ kind: "activity", id: activityId, title: "删除活动素材", message: count ? `该素材已被安排 ${count} 次，删除后会一并移除这些排期。` : "删除后无法恢复。" });
          }} onPreviewActivity={setPreviewActivityId} />
          <DayTimeline
            dayId={state.selectedDayId}
            onCreateRoute={() => state.createRouteDraft(state.selectedDayId)}
            onDeleteRoute={routeId => setPendingDeletion({ kind: "route", id: routeId, title: "删除交通", message: "删除后无法恢复。" })}
            onDeleteSchedule={scheduleId => setPendingDeletion({ kind: "schedule", id: scheduleId, title: "删除排期", message: "仅删除本次安排，素材库中的活动会被保留。" })}
            onDeleteStaySchedule={scheduleId => setPendingDeletion({ kind: "stay-schedule", id: scheduleId, title: "删除入住安排", message: "仅删除这次入住时间安排，今日住宿卡会被保留。" })}
            onMove={state.moveActivitySchedule}
            onOpenSchedule={scheduleId => {
              const schedule = state.trip.schedule.find(node => node.type === "activity" && node.id === scheduleId);
              if (schedule?.type === "activity") {
                setPreviewStayScheduleId(undefined);
                setPreviewRouteId(undefined);
                setPreviewActivityId(schedule.activityId);
              }
            }}
            onResize={state.resizeTimelineSchedule}
            onOpenStaySchedule={scheduleId => {
              const schedule = state.trip.schedule.find(node => node.type === "stay" && node.id === scheduleId);
              if (schedule?.type === "stay") {
                setPreviewActivityId(undefined);
                setPreviewRouteId(undefined);
                setPreviewStayScheduleId(schedule.id);
              }
            }}
            onOpenRoute={routeId => {
              setPreviewActivityId(undefined);
              setPreviewStayScheduleId(undefined);
              setPreviewRouteId(routeId);
            }}
            onSchedule={state.scheduleActivity}
            trip={state.trip}
          />
          <aside aria-label="辅助信息" className="roadbook-support">
            {previewActivity ? <ActivityPreview activity={previewActivity} onClose={() => setPreviewActivityId(undefined)} onEdit={() => { state.openActivityDraft(previewActivity.id); setPreviewActivityId(undefined); }} /> : previewStay && previewStaySchedule ? <StayPreview onClose={() => setPreviewStayScheduleId(undefined)} onEdit={() => { state.openStayDraft(previewStaySchedule.dayId, previewStaySchedule.stayId); setPreviewStayScheduleId(undefined); }} schedule={previewStaySchedule} stay={previewStay} /> : previewRoute ? <RoutePreview onClose={() => setPreviewRouteId(undefined)} onEdit={() => { state.openRouteDraft(previewRoute.id); setPreviewRouteId(undefined); }} route={previewRoute} /> : <><MapPreview dayId={state.selectedDayId} onOpenMap={() => setWorkspaceView("map")} trip={state.trip} /><StayCard day={state.trip.days.find(day => day.id === state.selectedDayId) ?? state.trip.days[0]} onCreate={() => state.createStayDraft(state.selectedDayId)} onDelete={(dayId, stayId, name) => setPendingDeletion({ kind: "stay", id: stayId, dayId, title: "删除住宿", message: `将删除“${name}”的住宿信息。` })} onOpen={stayId => state.openStayDraft(state.selectedDayId, stayId)} onSetPrimary={state.setPrimaryStay} /><BudgetPanel dayId={state.selectedDayId} trip={state.trip} /></>}
          </aside>
        </div>
        {state.timelineError && <p aria-live="polite" role="status">{state.timelineError}</p>}
        {saveNotice && <p aria-live="polite" className="save-notice" role="status">{saveNotice}</p>}
        {state.draftActivity && (
          <NodeDetailDrawer
            activity={state.draftActivity}
            onClose={state.closeDraft}
            onSave={state.commitActivity}
          />
        )}
        {state.draftStay && <StayDetailDrawer onClose={state.closeStayDraft} onSave={stay => state.commitStay(state.draftStay!.dayId, stay)} stay={state.draftStay.stay} />}
        {state.draftRoute && <RouteDetailDrawer onClose={state.closeRouteDraft} onSave={state.commitRoute} route={state.draftRoute} trip={state.trip} />}
        {pendingDeletion && <ActionConfirmation message={pendingDeletion.message} onCancel={() => setPendingDeletion(undefined)} onConfirm={confirmDeletion} title={pendingDeletion.title} />}
      </section>
    </DndContext>
  );
}
