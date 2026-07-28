import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createDemoArchive } from "../../src/domain/migration";
import { RoadbookApp } from "../../src/RoadbookApp";

describe("TravelLibrary", () => {
  it("opens the selected trip in the roadbook workspace", async () => {
    const user = userEvent.setup();
    render(<RoadbookApp initialArchive={createDemoArchive()} />);

    await user.click(screen.getByRole("button", { name: "查看旅行" }));

    expect(screen.getByRole("heading", { name: "奥地利湖区 10 日游" })).not.toBeNull();
    expect(screen.getByRole("region", { name: "时间轴" })).not.toBeNull();
  });
});
