import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StayCard } from "../../src/components/roadbook/StayCard";
import { createDemoArchive } from "../../src/domain/migration";

describe("StayCard", () => {
  it("lists stay choices and lets the user select the current accommodation", async () => {
    const user = userEvent.setup();
    const trip = createDemoArchive().travels[0].roadbook;
    trip.days[0].stays = [
      { id: "stay-1", type: "stay", name: "酒店 A", isPrimary: true },
      { id: "stay-2", type: "stay", name: "酒店 B", isPrimary: false }
    ];
    const onSetPrimary = vi.fn();

    render(<StayCard day={trip.days[0]} onCreate={() => undefined} onOpen={() => undefined} onSetPrimary={onSetPrimary} />);

    expect(screen.getByText("酒店 A")).not.toBeNull();
    expect(screen.getByText("酒店 B")).not.toBeNull();
    await user.click(screen.getByRole("radio", { name: "当前住宿 酒店 B" }));

    expect(onSetPrimary).toHaveBeenCalledWith("day-1", "stay-2");
    expect((screen.getByRole("button", { name: "拖动住宿 酒店 A" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "拖动住宿 酒店 B" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("lets users add a stay or edit the primary stay", async () => {
    const user = userEvent.setup();
    const trip = createDemoArchive().travels[0].roadbook;
    const onCreate = vi.fn();
    const onOpen = vi.fn();

    render(<StayCard day={trip.days[0]} onCreate={onCreate} onOpen={onOpen} />);
    await user.click(screen.getByRole("button", { name: "添加住宿" }));

    expect(onCreate).toHaveBeenCalledOnce();
  });
});
