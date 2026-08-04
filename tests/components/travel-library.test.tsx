import { render, screen, within } from "@testing-library/react";
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

  it("creates and persists an empty travel from the library", async () => {
    const user = userEvent.setup();
    const savedTravels: Array<{ title: string; destination?: string; roadbook: { days: unknown[] } }> = [];
    render(<RoadbookApp archiveStorage={{
      loadArchive: async () => createDemoArchive(),
      saveTravel: async travel => {
        savedTravels.push(travel);
        return travel;
      },
      importLocalArchiveOnce: async archive => ({ imported: false, archive })
    }} initialArchive={createDemoArchive()} />);

    await user.click(screen.getByRole("button", { name: "新建旅行" }));
    await user.type(screen.getByLabelText("旅行名称"), "京都漫游");
    await user.type(screen.getByLabelText("目的地"), "京都");
    await user.type(screen.getByLabelText("开始日期"), "2026-10-01");
    await user.type(screen.getByLabelText("结束日期"), "2026-10-03");
    await user.click(screen.getByRole("button", { name: "创建旅行" }));

    expect(savedTravels).toHaveLength(1);
    expect(savedTravels[0]).toMatchObject({ title: "京都漫游", destination: "京都", roadbook: { days: [{ date: "2026-10-01" }, { date: "2026-10-02" }, { date: "2026-10-03" }] } });
    expect(screen.getByRole("heading", { name: "京都漫游" })).not.toBeNull();

    await user.click(within(screen.getByRole("heading", { name: "京都漫游" }).closest("article")!).getByRole("button", { name: "查看旅行" }));

    expect(screen.getByRole("heading", { name: "京都漫游" })).not.toBeNull();
    expect(within(screen.getByRole("navigation", { name: "行程天数" })).getAllByRole("button", { name: /^10\/\d周/ })).toHaveLength(3);
    expect(screen.getByRole("region", { name: "时间轴" })).not.toBeNull();
  });

  it("imports an exported travel file and appends it to the library", async () => {
    const user = userEvent.setup();
    const archive = createDemoArchive();
    const file = new File([serializeTravel(archive.travels[0])], "austria.go-travel.json", { type: "application/json" });
    render(<RoadbookApp archiveStorage={{
      loadArchive: async () => archive,
      saveTravel: async travel => travel,
      importLocalArchiveOnce: async localArchive => ({ imported: false, archive: localArchive })
    }} initialArchive={archive} />);

    await user.upload(screen.getByLabelText("导入旅行方案"), file);

    expect((await screen.findByRole("status")).textContent).toContain("已导入");
    expect(screen.getAllByRole("heading", { name: "奥地利湖区 10 日游" })).toHaveLength(2);
  });
});
