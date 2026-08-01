import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RoadbookWorkspace } from "../../src/components/roadbook/RoadbookWorkspace";
import { createDemoArchive } from "../../src/domain/migration";

describe("trip settings", () => {
  it("renames the trip from its settings drawer", async () => {
    const user = userEvent.setup();
    const trip = createDemoArchive().travels[0].roadbook;
    render(<RoadbookWorkspace trip={trip} onCommit={() => undefined} />);

    await user.click(screen.getByRole("button", { name: "编辑旅行" }));
    expect(screen.getByTestId("drawer-layer").parentElement).toBe(document.body);
    await user.clear(screen.getByLabelText("旅行名称"));
    await user.type(screen.getByLabelText("旅行名称"), "维也纳周末");
    await user.click(screen.getByRole("button", { name: "保存旅行设置" }));

    expect(screen.getByRole("heading", { name: "维也纳周末" })).not.toBeNull();
    expect(screen.queryByRole("dialog", { name: "旅行设置" })).toBeNull();
    expect(screen.getByText("已保存")).not.toBeNull();
  });

  it("asks whether to keep out-of-range schedules when dates change", async () => {
    const user = userEvent.setup();
    const trip = { ...createDemoArchive().travels[0].roadbook, endDate: "2026-10-02" };
    render(<RoadbookWorkspace trip={trip} onCommit={() => undefined} />);

    await user.click(screen.getByRole("button", { name: "编辑旅行" }));
    await user.clear(screen.getByLabelText("开始日期"));
    await user.type(screen.getByLabelText("开始日期"), "2026-10-02");
    await user.clear(screen.getByLabelText("结束日期"));
    await user.type(screen.getByLabelText("结束日期"), "2026-10-03");
    await user.click(screen.getByRole("button", { name: "保存旅行设置" }));

    const dialog = screen.getByRole("dialog", { name: "日期范围变更" });
    expect(dialog).not.toBeNull();
    expect(screen.getByTestId("modal-layer").parentElement).toBe(document.body);
    await user.click(screen.getByRole("button", { name: "保留排期" }));
    expect(screen.getByText("未纳入当前行程")).not.toBeNull();
  });
});
