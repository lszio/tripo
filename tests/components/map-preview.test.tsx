import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MapPreview } from "../../src/components/roadbook/MapPreview";
import { createDemoArchive } from "../../src/domain/migration";

describe("MapPreview", () => {
  it("shows markers for located nodes and an explicit missing-location state", () => {
    const trip = createDemoArchive().travels[0].roadbook;
    trip.activities[0].location = { name: "哈尔施塔特湖", latitude: 47.56, longitude: 13.65 };
    trip.days[0].stays = [{ id: "stay-option", type: "stay", name: "未排期酒店", isPrimary: true, location: { name: "候选酒店", latitude: 47.57, longitude: 13.66 } }];
    trip.schedule.push({ id: "unknown", type: "activity", activityId: "missing", dayId: "day-1", startSlot: 22, durationSlots: 1, isTimeLocked: false });

    render(<MapPreview trip={trip} dayId="day-1" />);

    expect(screen.getByText("哈尔施塔特湖")).not.toBeNull();
    expect(screen.getByText("未设置位置")).not.toBeNull();
    expect(screen.queryByText("候选酒店")).toBeNull();
  });

  it("renders an interactive map canvas without requiring a browser API key", () => {
    const trip = createDemoArchive().travels[0].roadbook;
    trip.activities[0].location = { name: "哈尔施塔特湖", latitude: 47.56, longitude: 13.65 };

    render(<MapPreview trip={trip} dayId="day-1" />);

    expect(screen.getByRole("heading", { name: "OpenStreetMap" })).not.toBeNull();
    expect(screen.getByLabelText("OpenStreetMap 地图")).not.toBeNull();
  });

  it("opens the dedicated map workspace from the preview", async () => {
    const user = userEvent.setup();
    const onOpenMap = vi.fn();
    const trip = createDemoArchive().travels[0].roadbook;

    render(<MapPreview onOpenMap={onOpenMap} trip={trip} dayId="day-1" />);
    await user.click(screen.getByRole("button", { name: "进入地图工作区" }));

    expect(onOpenMap).toHaveBeenCalledOnce();
  });
});
