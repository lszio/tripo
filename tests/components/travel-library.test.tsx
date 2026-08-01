import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createDemoArchive } from "../../src/domain/migration";
import { RoadbookApp } from "../../src/RoadbookApp";
import { serializeTravel } from "../../src/domain/trip-transfer";

describe("TravelLibrary", () => {
  it("opens the selected trip in the roadbook workspace", async () => {
    const user = userEvent.setup();
    render(<RoadbookApp initialArchive={createDemoArchive()} />);

    await user.click(screen.getByRole("button", { name: "查看旅行" }));

    expect(screen.getByRole("heading", { name: "奥地利湖区 10 日游" })).not.toBeNull();
    expect(screen.getByRole("region", { name: "时间轴" })).not.toBeNull();
  });

  it("offers import and export controls for travel plans", () => {
    render(<RoadbookApp initialArchive={createDemoArchive()} />);

    expect(screen.getByLabelText("导入旅行方案")).not.toBeNull();
    expect(screen.getByRole("button", { name: "导出 奥地利湖区 10 日游" })).not.toBeNull();
  });

  it("imports an exported travel file and appends it to the library", async () => {
    const user = userEvent.setup();
    const archive = createDemoArchive();
    const file = new File([serializeTravel(archive.travels[0])], "austria.go-travel.json", { type: "application/json" });
    render(<RoadbookApp initialArchive={archive} />);

    await user.upload(screen.getByLabelText("导入旅行方案"), file);

    expect((await screen.findByRole("status")).textContent).toContain("已导入");
    expect(screen.getAllByRole("heading", { name: "奥地利湖区 10 日游" })).toHaveLength(2);
  });
});
