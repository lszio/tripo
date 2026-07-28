import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BudgetPanel } from "../../src/components/roadbook/BudgetPanel";
import { createDemoArchive } from "../../src/domain/migration";

describe("BudgetPanel", () => {
  it("includes repeated activity schedules in the current-day budget", () => {
    const trip = createDemoArchive().travels[0].roadbook;
    trip.activities[0].defaultPrice = { amount: 280, currency: "CNY", unit: "total" };
    trip.schedule.push({ id: "repeat", type: "activity", activityId: "activity-hallstatt", dayId: "day-1", startSlot: 30, durationSlots: 1, isTimeLocked: false });

    render(<BudgetPanel trip={trip} dayId="day-1" />);

    expect(screen.getAllByText("¥560").length).toBeGreaterThan(0);
  });

  it("allows the displayed total currency to be changed", async () => {
    const user = userEvent.setup();
    const trip = createDemoArchive().travels[0].roadbook;
    trip.activities[0].defaultPrice = { amount: 10, currency: "EUR", unit: "total" };

    render(<BudgetPanel trip={trip} dayId="day-1" />);

    await user.selectOptions(screen.getByLabelText("预算币种"), "EUR");
    expect(screen.getAllByText(/€10/).length).toBeGreaterThan(0);
  });

  it("includes currencies used by stay cards in the budget selector", () => {
    const trip = createDemoArchive().travels[0].roadbook;
    trip.days[0].stays = [{ id: "stay-1", type: "stay", name: "酒店", price: { amount: 90, currency: "GBP", unit: "night" } }];

    render(<BudgetPanel trip={trip} dayId="day-1" />);

    expect(screen.getByRole("option", { name: "GBP" })).not.toBeNull();
  });
});
