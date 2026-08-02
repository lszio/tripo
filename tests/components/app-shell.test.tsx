import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RoadbookApp } from "../../src/RoadbookApp";
import type { ApiArchiveStorage } from "../../src/data/api-archive-storage";
import { STORAGE_KEY } from "../../src/data/archive-storage";
import { createDemoArchive } from "../../src/domain/migration";

function createArchiveStorage(archive = createDemoArchive()): ApiArchiveStorage {
  return {
    loadArchive: vi.fn().mockResolvedValue(archive),
    saveTravel: vi.fn().mockImplementation(async travel => travel),
    importLocalArchiveOnce: vi.fn().mockResolvedValue({ imported: false, archive })
  };
}

describe("RoadbookApp", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("renders the preserved travel and records entry points", () => {
    render(<RoadbookApp initialArchive={createDemoArchive()} archiveStorage={createArchiveStorage()} />);

    expect(screen.getByRole("link", { name: "我的旅行" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "旅行记录" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "访客：旅行者" })).not.toBeNull();
  });

  it("shows a loading state before the remote archive is available", () => {
    const archiveStorage: ApiArchiveStorage = {
      loadArchive: () => new Promise(() => {}),
      saveTravel: async travel => travel,
      importLocalArchiveOnce: async archive => ({ imported: false, archive })
    };

    render(<RoadbookApp archiveStorage={archiveStorage} />);

    expect(screen.getByRole("status").textContent).toContain("正在加载旅行数据");
  });

  it("renders remote travels after loading completes", async () => {
    render(<RoadbookApp archiveStorage={createArchiveStorage()} />);

    expect(await screen.findByRole("heading", { name: "奥地利湖区 10 日游" })).not.toBeNull();
  });

  it("shows a retryable error when the remote archive cannot load", async () => {
    const archiveStorage = createArchiveStorage();
    archiveStorage.loadArchive = vi.fn().mockRejectedValue(new Error("需要先登录"));

    render(<RoadbookApp archiveStorage={archiveStorage} />);

    expect((await screen.findByRole("alert")).textContent).toContain("需要先登录");
    expect(screen.getByRole("button", { name: "重试加载" })).not.toBeNull();
  });

  it("removes the local archive after import and its remote refresh succeed", async () => {
    const localArchive = createDemoArchive();
    const archiveStorage = createArchiveStorage({ schemaVersion: 2, travels: [] });
    archiveStorage.loadArchive = vi.fn()
      .mockResolvedValueOnce({ schemaVersion: 2, travels: [] })
      .mockResolvedValueOnce(localArchive);
    archiveStorage.importLocalArchiveOnce = vi.fn().mockResolvedValue({ imported: true, archive: localArchive });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localArchive));

    render(<RoadbookApp archiveStorage={archiveStorage} />);

    expect(await screen.findByRole("heading", { name: "奥地利湖区 10 日游" })).not.toBeNull();
    expect(archiveStorage.importLocalArchiveOnce).toHaveBeenCalledWith(localArchive);
    expect(archiveStorage.loadArchive).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("retains a failed local import for a later successful retry", async () => {
    const localArchive = createDemoArchive();
    const archiveStorage = createArchiveStorage({ schemaVersion: 2, travels: [] });
    archiveStorage.loadArchive = vi.fn()
      .mockResolvedValueOnce({ schemaVersion: 2, travels: [] })
      .mockResolvedValueOnce({ schemaVersion: 2, travels: [] })
      .mockResolvedValueOnce(localArchive);
    archiveStorage.importLocalArchiveOnce = vi.fn()
      .mockRejectedValueOnce(new Error("数据服务暂不可用，请稍后重试"))
      .mockResolvedValueOnce({ imported: true, archive: localArchive });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localArchive));

    const firstRender = render(<RoadbookApp archiveStorage={archiveStorage} />);
    await waitFor(() => expect(archiveStorage.importLocalArchiveOnce).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    firstRender.unmount();

    render(<RoadbookApp archiveStorage={archiveStorage} />);

    expect(await screen.findByRole("heading", { name: "奥地利湖区 10 日游" })).not.toBeNull();
    expect(archiveStorage.importLocalArchiveOnce).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("retains the local archive when the post-import remote refresh fails", async () => {
    const localArchive = createDemoArchive();
    const archiveStorage = createArchiveStorage({ schemaVersion: 2, travels: [] });
    archiveStorage.loadArchive = vi.fn()
      .mockResolvedValueOnce({ schemaVersion: 2, travels: [] })
      .mockRejectedValueOnce(new Error("数据服务暂不可用，请稍后重试"));
    archiveStorage.importLocalArchiveOnce = vi.fn().mockResolvedValue({ imported: true, archive: localArchive });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localArchive));

    render(<RoadbookApp archiveStorage={archiveStorage} />);

    await waitFor(() => expect(archiveStorage.loadArchive).toHaveBeenCalledTimes(2));
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it("retries a failed remote load and renders the recovered archive", async () => {
    const user = userEvent.setup();
    const archiveStorage = createArchiveStorage();
    archiveStorage.loadArchive = vi.fn()
      .mockRejectedValueOnce(new Error("数据服务暂不可用，请稍后重试"))
      .mockResolvedValueOnce(createDemoArchive());

    render(<RoadbookApp archiveStorage={archiveStorage} />);

    await user.click(await screen.findByRole("button", { name: "重试加载" }));

    expect(await screen.findByRole("heading", { name: "奥地利湖区 10 日游" })).not.toBeNull();
    expect(archiveStorage.loadArchive).toHaveBeenCalledTimes(2);
  });

  it("persists a local guest nickname", async () => {
    const user = userEvent.setup();
    render(<RoadbookApp initialArchive={createDemoArchive()} />);

    await user.click(screen.getByRole("button", { name: "访客：旅行者" }));
    await user.clear(screen.getByLabelText("访客昵称"));
    await user.type(screen.getByLabelText("访客昵称"), "小林");
    await user.click(screen.getByRole("button", { name: "保存访客资料" }));

    expect(screen.getByRole("button", { name: "访客：小林" })).not.toBeNull();
  });

  it("persists a trip rename from the roadbook settings", async () => {
    const user = userEvent.setup();
    render(<RoadbookApp initialArchive={createDemoArchive()} />);

    await user.click(screen.getByRole("button", { name: "查看旅行" }));
    await user.click(screen.getByRole("button", { name: "编辑旅行" }));
    await user.clear(screen.getByLabelText("旅行名称"));
    await user.type(screen.getByLabelText("旅行名称"), "维也纳周末");
    await user.click(screen.getByRole("button", { name: "保存旅行设置" }));
    await user.click(screen.getByRole("link", { name: "我的旅行" }));

    expect(screen.getByRole("heading", { name: "维也纳周末" })).not.toBeNull();
  });

  it("keeps the selected day after deleting a schedule", async () => {
    const user = userEvent.setup();
    const archive = createDemoArchive();
    archive.travels[0].roadbook.endDate = "2026-10-02";
    archive.travels[0].roadbook.days.push({ id: "day-2", date: "2026-10-02", order: 1, stays: [] });
    archive.travels[0].roadbook.schedule.push({ id: "schedule-day-2", type: "activity", activityId: "activity-hallstatt", dayId: "day-2", startSlot: 18, durationSlots: 1, isTimeLocked: false });
    render(<RoadbookApp initialArchive={archive} />);

    await user.click(screen.getByRole("button", { name: "查看旅行" }));
    await user.click(screen.getByRole("button", { name: "10/2周五" }));
    await user.click(screen.getByRole("button", { name: "删除本次排期" }));
    await user.click(screen.getByRole("button", { name: "确认删除" }));

    expect(screen.getByRole("button", { name: "10/2周五" }).getAttribute("aria-pressed")).toBe("true");
  });
});
