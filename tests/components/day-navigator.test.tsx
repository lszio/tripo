import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DayNavigator } from "../../src/components/roadbook/DayNavigator";

describe("DayNavigator", () => {
  it("provides copy and paste controls for each date", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    const onPaste = vi.fn();
    const days = [
      { id: "day-1", date: "2026-10-01", order: 0 },
      { id: "day-2", date: "2026-10-02", order: 1 }
    ];

    render(<DayNavigator canPaste days={days} onCopyDay={onCopy} onPasteDay={onPaste} onSelect={() => undefined} selectedDayId="day-1" />);
    expect(screen.getByRole("button", { name: "复制 10/1周四" }).className).toContain("day-plan-icon");
    expect(screen.getByRole("button", { name: "粘贴到 10/2周五" }).className).toContain("day-plan-icon");
    await user.click(screen.getByRole("button", { name: "复制 10/1周四" }));
    await user.click(screen.getByRole("button", { name: "粘贴到 10/2周五" }));

    expect(onCopy).toHaveBeenCalledWith("day-1");
    expect(onPaste).toHaveBeenCalledWith("day-2");
  });
});
