import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RoadbookWorkspace } from "../../src/components/roadbook/RoadbookWorkspace";
import { createDemoArchive } from "../../src/domain/migration";

describe("RoadbookWorkspace", () => {
  it("keeps an activity in the material library after it is scheduled", () => {
    const trip = createDemoArchive().travels[0].roadbook;

    render(<RoadbookWorkspace trip={trip} onCommit={() => undefined} />);

    expect(within(screen.getByLabelText("行程素材库")).getByRole("button", { name: "哈尔施塔特" })).not.toBeNull();
    expect(trip.schedule).toHaveLength(1);
  });

  it("opens the activity preview with a double-click before editing", async () => {
    const user = userEvent.setup();
    const trip = createDemoArchive().travels[0].roadbook;

    render(<RoadbookWorkspace trip={trip} onCommit={() => undefined} />);
    await user.dblClick(within(screen.getByLabelText("行程素材库")).getByRole("button", { name: "哈尔施塔特" }));

    expect(screen.getByLabelText("活动预览")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "编辑活动" }));
    expect(screen.getByRole("dialog", { name: "活动详情" })).not.toBeNull();
  });

  it("shows a stay preview before opening its editor", async () => {
    const user = userEvent.setup();
    const trip = createDemoArchive().travels[0].roadbook;
    trip.days[0].stays = [{ id: "stay-1", type: "stay", name: "湖畔酒店", isPrimary: true }];
    trip.schedule.push({ id: "stay-schedule", type: "stay", stayId: "stay-1", dayId: "day-1", startSlot: 20, durationSlots: 2, isTimeLocked: false });
    render(<RoadbookWorkspace trip={trip} onCommit={() => undefined} />);

    await user.dblClick(screen.getByTestId("scheduled-stay"));
    expect(screen.getByLabelText("住宿预览")).not.toBeNull();
    expect(screen.queryByRole("dialog", { name: "住宿详情" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "编辑住宿" }));
    expect(screen.getByRole("dialog", { name: "住宿详情" })).not.toBeNull();
  });

  it("shows a route preview before opening its editor", async () => {
    const user = userEvent.setup();
    const trip = createDemoArchive().travels[0].roadbook;
    trip.schedule.push({ id: "route-1", type: "route", dayId: "day-1", startSlot: 22, durationSlots: 2, transport: "train", routeType: "manual", status: "valid" });
    render(<RoadbookWorkspace trip={trip} onCommit={() => undefined} />);

    await user.dblClick(screen.getByTestId("route-card"));
    expect(screen.getByLabelText("交通预览")).not.toBeNull();
    expect(screen.queryByRole("dialog", { name: "交通详情" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "编辑交通" }));
    expect(screen.getByRole("dialog", { name: "交通详情" })).not.toBeNull();
  });

  it("creates a new reusable material from the library", async () => {
    const user = userEvent.setup();
    const trip = createDemoArchive().travels[0].roadbook;
    render(<RoadbookWorkspace trip={trip} onCommit={() => undefined} />);

    await user.click(within(screen.getByLabelText("行程素材库")).getByRole("button", { name: "添加素材" }));
    await user.type(screen.getByLabelText("活动名称"), "咖啡馆");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(within(screen.getByLabelText("行程素材库")).getByRole("button", { name: "咖啡馆" })).not.toBeNull();
  });

  it("asks for confirmation before deleting a scheduled activity", async () => {
    const user = userEvent.setup();
    const trip = createDemoArchive().travels[0].roadbook;
    render(<RoadbookWorkspace trip={trip} onCommit={() => undefined} />);

    await user.click(screen.getByRole("button", { name: "删除本次排期" }));

    expect(screen.getByRole("dialog", { name: "删除排期" })).not.toBeNull();
    expect(screen.getByTestId("scheduled-activity")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "确认删除" }));
    expect(screen.queryByTestId("scheduled-activity")).toBeNull();
  });

  it("asks for confirmation before deleting a material and its schedules", async () => {
    const user = userEvent.setup();
    const trip = createDemoArchive().travels[0].roadbook;
    render(<RoadbookWorkspace trip={trip} onCommit={() => undefined} />);

    await user.click(within(screen.getByLabelText("行程素材库")).getByRole("button", { name: "删除素材 哈尔施塔特" }));

    expect(screen.getByRole("dialog", { name: "删除活动素材" })).not.toBeNull();
    expect(within(screen.getByLabelText("行程素材库")).getByRole("button", { name: "哈尔施塔特" })).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "确认删除" }));
    expect(within(screen.getByLabelText("行程素材库")).queryByRole("button", { name: "哈尔施塔特" })).toBeNull();
    expect(screen.queryByTestId("scheduled-activity")).toBeNull();
  });

  it("asks for confirmation before deleting a stay", async () => {
    const user = userEvent.setup();
    const trip = createDemoArchive().travels[0].roadbook;
    trip.days[0].stays = [{ id: "stay-1", type: "stay", name: "湖畔酒店", isPrimary: true }];
    render(<RoadbookWorkspace trip={trip} onCommit={() => undefined} />);

    await user.click(screen.getByRole("button", { name: "删除住宿 湖畔酒店" }));

    expect(screen.getByRole("dialog", { name: "删除住宿" })).not.toBeNull();
    expect(screen.getByText("湖畔酒店")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "确认删除" }));
    expect(screen.queryByText("湖畔酒店")).toBeNull();
  });

  it("opens a route editor for the selected day", async () => {
    const user = userEvent.setup();
    const trip = createDemoArchive().travels[0].roadbook;
    render(<RoadbookWorkspace trip={trip} onCommit={() => undefined} />);

    await user.click(screen.getByRole("button", { name: "添加交通" }));

    expect(screen.getByRole("dialog", { name: "交通详情" })).not.toBeNull();
  });

  it("opens and returns from the dedicated map workspace", async () => {
    const user = userEvent.setup();
    const trip = createDemoArchive().travels[0].roadbook;
    trip.activities[0].location = { name: "哈尔施塔特", latitude: 47.56, longitude: 13.65 };

    render(<RoadbookWorkspace trip={trip} onCommit={() => undefined} />);
    await user.click(screen.getByRole("button", { name: "进入地图工作区" }));

    expect(screen.getByRole("heading", { name: "地图工作区" })).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "返回路书编辑器" }));
    expect(screen.getByLabelText("时间轴")).not.toBeNull();
  });

  it("closes the activity preview when the timeline background is clicked", async () => {
    const user = userEvent.setup();
    const trip = createDemoArchive().travels[0].roadbook;

    render(<RoadbookWorkspace trip={trip} onCommit={() => undefined} />);
    await user.dblClick(within(screen.getByLabelText("行程素材库")).getByRole("button", { name: "哈尔施塔特" }));
    expect(screen.getByLabelText("活动预览")).not.toBeNull();
    await user.click(screen.getByLabelText("时间轴"));

    expect(screen.queryByLabelText("活动预览")).toBeNull();
  });
});
