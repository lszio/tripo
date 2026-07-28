import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MapWorkspace } from "../../src/components/roadbook/MapWorkspace";
import { createDemoArchive } from "../../src/domain/migration";

describe("MapWorkspace", () => {
  it("opens with a colored daily-route overview and can switch to one day", async () => {
    const user = userEvent.setup();
    const trip = createDemoArchive().travels[0].roadbook;
    trip.endDate = "2026-10-02";
    trip.activities[0].location = { name: "第一天", latitude: 47.56, longitude: 13.65 };
    trip.days.push({ id: "day-2", date: "2026-10-02", order: 1, stays: [], isActive: true });
    trip.activities.push({ id: "activity-day-2", type: "activity", name: "第二天", location: { name: "第二天", latitude: 48.2, longitude: 16.37 } });
    trip.schedule.push({ id: "schedule-day-2", type: "activity", activityId: "activity-day-2", dayId: "day-2", startSlot: 16, durationSlots: 1, isTimeLocked: false });

    render(<MapWorkspace onBack={() => undefined} onSelectDay={() => undefined} selectedDayId="day-1" trip={trip} />);

    expect(screen.getByRole("heading", { name: "每日路线" })).not.toBeNull();
    expect(screen.getByLabelText("每日路线图例")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "单日节点" }));
    expect(screen.getByRole("heading", { name: "OpenStreetMap" })).not.toBeNull();
  });
});
