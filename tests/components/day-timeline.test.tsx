import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndContext } from "@dnd-kit/core";
import { describe, expect, it, vi } from "vitest";
import { DayTimeline } from "../../src/components/roadbook/DayTimeline";
import { scheduleActivity, scheduleStay } from "../../src/components/roadbook/timeline-actions";
import { createDemoArchive } from "../../src/domain/migration";

function renderTimeline(component: React.ReactNode) {
  return render(<DndContext>{component}</DndContext>);
}

describe("DayTimeline", () => {
  it("creates a 30-minute schedule from a material activity", () => {
    const trip = createDemoArchive().travels[0].roadbook;
    const next = scheduleActivity(trip, "activity-hallstatt", "day-1", 19);

    expect(next?.schedule.at(-1)).toMatchObject({ dayId: "day-1", startSlot: 19, durationSlots: 1 });
  });

  it("creates repeatable 30-minute stay schedules for the current accommodation", () => {
    const trip = createDemoArchive().travels[0].roadbook;
    trip.days[0].stays = [
      { id: "stay-current", type: "stay", name: "当前酒店", isPrimary: true },
      { id: "stay-option", type: "stay", name: "备选酒店", isPrimary: false }
    ];

    const scheduled = scheduleStay(trip, "stay-current", "day-1", 28);

    const repeated = scheduled ? scheduleStay(scheduled, "stay-current", "day-1", 32) : null;

    expect(repeated?.schedule.filter(node => node.type === "stay")).toMatchObject([
      { stayId: "stay-current", dayId: "day-1", startSlot: 28, durationSlots: 1 },
      { stayId: "stay-current", dayId: "day-1", startSlot: 32, durationSlots: 1 }
    ]);
    expect(scheduleStay(trip, "stay-option", "day-1", 28)).toBeNull();
  });

  it("renders activity instances in start-slot order without an order field", () => {
    const trip = createDemoArchive().travels[0].roadbook;
    trip.schedule.push({ id: "later", type: "activity", activityId: "activity-hallstatt", dayId: "day-1", startSlot: 30, durationSlots: 1, isTimeLocked: false });

    renderTimeline(<DayTimeline dayId="day-1" onMove={() => undefined} onResize={() => undefined} onSchedule={() => undefined} trip={trip} />);

    expect(screen.getAllByTestId("scheduled-activity").map(card => card.getAttribute("data-schedule-id"))).toEqual(["schedule-hallstatt", "later"]);
    expect(screen.getByText("08:00")).not.toBeNull();
    expect(screen.queryByLabelText("07:30")).toBeNull();
    expect(screen.getAllByTestId("scheduled-activity")[0].getAttribute("style")).toContain("top: 72px");
    expect(screen.getByTestId("time-label-18").textContent).toBe("09:00");
  });

  it("renders a scheduled check-in card separately from activities", () => {
    const trip = createDemoArchive().travels[0].roadbook;
    trip.days[0].stays = [{ id: "stay-current", type: "stay", name: "湖景酒店", isPrimary: true }];
    trip.schedule.push({ id: "stay-schedule", type: "stay", stayId: "stay-current", dayId: "day-1", startSlot: 28, durationSlots: 2, isTimeLocked: false });

    renderTimeline(<DayTimeline dayId="day-1" onMove={() => undefined} onResize={() => undefined} onSchedule={() => undefined} trip={trip} />);

    expect(screen.getByTestId("scheduled-stay")).not.toBeNull();
    expect(screen.getByText("入住 · 湖景酒店")).not.toBeNull();
  });

  it("starts in the common planning window and can reveal the full day", async () => {
    const user = userEvent.setup();
    const trip = createDemoArchive().travels[0].roadbook;

    renderTimeline(<DayTimeline dayId="day-1" onMove={() => undefined} onResize={() => undefined} onSchedule={() => undefined} trip={trip} />);

    expect(screen.queryByLabelText("23:00")).toBeNull();
    await user.click(screen.getByRole("button", { name: "显示全天" }));
    expect(screen.getByLabelText("23:00")).not.toBeNull();
  });

  it("lays out the time range directly without an internal scroll area", () => {
    const trip = createDemoArchive().travels[0].roadbook;

    renderTimeline(<DayTimeline dayId="day-1" onMove={() => undefined} onResize={() => undefined} onSchedule={() => undefined} trip={trip} />);

    expect(screen.queryByTestId("timeline-scroll")).toBeNull();
    expect(screen.getByTestId("timeline-canvas")).not.toBeNull();
  });

  it("shows the activity location and effective budget on a timeline card", () => {
    const trip = createDemoArchive().travels[0].roadbook;
    trip.activities[0].location = { name: "哈尔施塔特湖畔" };
    trip.activities[0].defaultPrice = { amount: 120, currency: "CNY", unit: "total" };
    trip.activities[0].tags = ["景点"];
    trip.activities[0].note = "湖畔步行与拍照";
    trip.activities[0].image = "https://example.com/hallstatt.jpg";
    trip.schedule[0].durationSlots = 4;

    renderTimeline(<DayTimeline dayId="day-1" onMove={() => undefined} onResize={() => undefined} onSchedule={() => undefined} trip={trip} />);

    expect(screen.getByText("哈尔施塔特湖畔")).not.toBeNull();
    expect(screen.getByText("CNY 120")).not.toBeNull();
    expect(screen.getByText("时长")).not.toBeNull();
    expect(screen.getByText("费用")).not.toBeNull();
    expect(screen.getByText("景点")).not.toBeNull();
    expect(screen.getByText("湖畔步行与拍照")).not.toBeNull();
    expect(screen.getByTestId("scheduled-activity").getAttribute("style")).toContain("hallstatt.jpg");
  });

  it("opens schedule previews when a timeline card is double-clicked", async () => {
    const user = userEvent.setup();
    const trip = createDemoArchive().travels[0].roadbook;
    const onOpenSchedule = vi.fn();

    renderTimeline(<DayTimeline dayId="day-1" onMove={() => undefined} onOpenSchedule={onOpenSchedule} onResize={() => undefined} onSchedule={() => undefined} trip={trip} />);
    await user.dblClick(screen.getByTestId("scheduled-activity"));

    expect(onOpenSchedule).toHaveBeenCalledWith("schedule-hallstatt");
  });

  it("opens a stay preview when its timeline card is double-clicked", async () => {
    const user = userEvent.setup();
    const trip = createDemoArchive().travels[0].roadbook;
    trip.days[0].stays = [{ id: "stay-current", type: "stay", name: "湖景酒店", isPrimary: true }];
    trip.schedule.push({ id: "stay-schedule", type: "stay", stayId: "stay-current", dayId: "day-1", startSlot: 28, durationSlots: 2, isTimeLocked: false });
    const onOpenStaySchedule = vi.fn();

    renderTimeline(<DayTimeline dayId="day-1" onMove={() => undefined} onOpenStaySchedule={onOpenStaySchedule} onResize={() => undefined} onSchedule={() => undefined} trip={trip} />);
    await user.dblClick(screen.getByTestId("scheduled-stay"));

    expect(onOpenStaySchedule).toHaveBeenCalledWith("stay-schedule");
  });

  it("deletes only the scheduled instance", async () => {
    const user = userEvent.setup();
    const trip = createDemoArchive().travels[0].roadbook;
    const onDelete = vi.fn();

    renderTimeline(<DayTimeline dayId="day-1" onDeleteSchedule={onDelete} onMove={() => undefined} onResize={() => undefined} onSchedule={() => undefined} trip={trip} />);
    await user.click(screen.getByRole("button", { name: "删除本次排期" }));

    expect(onDelete).toHaveBeenCalledWith("schedule-hallstatt");
  });
});
