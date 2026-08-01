import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NodeDetailDrawer } from "../../src/components/roadbook/NodeDetailDrawer";
import { createDemoArchive } from "../../src/domain/migration";

describe("NodeDetailDrawer", () => {
  it("does not save an activity draft when editing is cancelled", async () => {
    const user = userEvent.setup();
    const activity = createDemoArchive().travels[0].roadbook.activities[0];
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(<NodeDetailDrawer activity={activity} onSave={onSave} onClose={onClose} />);
    await user.clear(screen.getByLabelText("活动名称"));
    await user.type(screen.getByLabelText("活动名称"), "新名称");
    await user.click(screen.getByRole("button", { name: "取消" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
    expect(activity.name).toBe("哈尔施塔特");
  });

  it("saves optional activity fields as part of the mother card", async () => {
    const user = userEvent.setup();
    const activity = createDemoArchive().travels[0].roadbook.activities[0];
    const onSave = vi.fn();

    render(<NodeDetailDrawer activity={activity} onClose={() => undefined} onSave={onSave} />);
    await user.type(screen.getByLabelText("图片链接"), "https://example.com/photo.jpg");
    await user.type(screen.getByLabelText("标签"), "景点, 湖区");
    await user.type(screen.getByLabelText("价格"), "120");
    await user.type(screen.getByLabelText("外部链接"), "https://example.com/booking");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      image: "https://example.com/photo.jpg",
      tags: ["景点", "湖区"],
      defaultPrice: expect.objectContaining({ amount: 120 }),
      url: "https://example.com/booking"
    }));
  });

  it("provides a crop preview and persists the chosen image framing", async () => {
    const user = userEvent.setup();
    const activity = { ...createDemoArchive().travels[0].roadbook.activities[0], image: "https://example.com/photo.jpg" };
    const onSave = vi.fn();

    render(<NodeDetailDrawer activity={activity} onClose={() => undefined} onSave={onSave} />);
    expect(screen.getByLabelText("背景裁剪预览")).not.toBeNull();
    fireEvent.change(screen.getByLabelText("图片缩放"), { target: { value: "1.4" } });
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      imageCrop: expect.objectContaining({ zoom: 1.4 })
    }));
  });
});
