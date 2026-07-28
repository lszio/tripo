import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RoadbookApp } from "../../src/RoadbookApp";
import { createDemoArchive } from "../../src/domain/migration";

describe("RoadbookApp", () => {
  it("renders the preserved travel and records entry points", () => {
    render(<RoadbookApp />);

    expect(screen.getByRole("link", { name: "我的旅行" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "旅行记录" })).not.toBeNull();
  });

  it("persists a trip rename from the roadbook settings", async () => {
    const user = userEvent.setup();
    render(<RoadbookApp initialArchive={createDemoArchive()} />);

    await user.click(screen.getByRole("button", { name: "查看旅行" }));
    await user.click(screen.getByRole("button", { name: "编辑旅行" }));
    await user.clear(screen.getByLabelText("旅行名称"));
    await user.type(screen.getByLabelText("旅行名称"), "维也纳周末");
    await user.click(screen.getByRole("button", { name: "保存旅行设置" }));
    await user.click(screen.getByRole("link", { name: "我的旅行" }));

    expect(screen.getByRole("heading", { name: "维也纳周末" })).not.toBeNull();
  });

  it("keeps the selected day after deleting a schedule", async () => {
    const user = userEvent.setup();
    const archive = createDemoArchive();
    archive.travels[0].roadbook.endDate = "2026-10-02";
    archive.travels[0].roadbook.days.push({ id: "day-2", date: "2026-10-02", order: 1, stays: [] });
    archive.travels[0].roadbook.schedule.push({ id: "schedule-day-2", type: "activity", activityId: "activity-hallstatt", dayId: "day-2", startSlot: 18, durationSlots: 1, isTimeLocked: false });
    render(<RoadbookApp initialArchive={archive} />);

    await user.click(screen.getByRole("button", { name: "查看旅行" }));
    await user.click(screen.getByRole("button", { name: "10/2周五" }));
    await user.click(screen.getByRole("button", { name: "删除本次排期" }));
    await user.click(screen.getByRole("button", { name: "确认删除" }));

    expect(screen.getByRole("button", { name: "10/2周五" }).getAttribute("aria-pressed")).toBe("true");
  });
});
