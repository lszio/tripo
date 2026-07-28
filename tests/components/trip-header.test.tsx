import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TripHeader } from "../../src/components/roadbook/TripHeader";
import { createDemoArchive } from "../../src/domain/migration";

describe("TripHeader", () => {
  it("shows the trip-wide budget and planning overview", () => {
    const trip = createDemoArchive().travels[0].roadbook;
    trip.activities[0].defaultPrice = { amount: 120, currency: "CNY", unit: "total" };

    render(<TripHeader onSave={() => undefined} trip={trip} />);

    expect(screen.getByLabelText("行程概览")).not.toBeNull();
    expect(screen.getByText("预算统计")).not.toBeNull();
    expect(screen.getByText("¥120")).not.toBeNull();
    expect(screen.getByText("行程天数")).not.toBeNull();
    expect(screen.getByText("已排期")).not.toBeNull();
  });
});
