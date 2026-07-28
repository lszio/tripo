import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocationPicker } from "../../src/components/roadbook/LocationPicker";

describe("LocationPicker", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("writes the selected result with coordinates", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ display_name: "Hallstatt, Oberösterreich, Austria", lat: "47.5622", lon: "13.6493" }]
    }));

    render(<LocationPicker label="地点" onChange={onChange} value={undefined} />);
    await user.type(screen.getByLabelText("地点"), "Hallstatt");
    await user.click(screen.getByRole("button", { name: "搜索地点" }));
    await user.click(await screen.findByRole("option", { name: "Hallstatt, Oberösterreich, Austria 47.56220, 13.64930" }));

    expect(onChange).toHaveBeenCalledWith({
      name: "Hallstatt, Oberösterreich, Austria",
      latitude: 47.5622,
      longitude: 13.6493
    });
  });

  it("keeps the query visible when no location is found", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    render(<LocationPicker label="地点" onChange={() => undefined} value={undefined} />);
    await user.type(screen.getByLabelText("地点"), "不存在的地点");
    await user.click(screen.getByRole("button", { name: "搜索地点" }));

    expect(await screen.findByText("未找到匹配地点，请换个关键词再试。")).not.toBeNull();
    expect((screen.getByLabelText("地点") as HTMLInputElement).value).toBe("不存在的地点");
  });

  it("clears the chosen location", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<LocationPicker label="地点" onChange={onChange} value={{ name: "维也纳", latitude: 48.208, longitude: 16.373 }} />);
    await user.click(screen.getByRole("button", { name: "清除地点" }));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("shows a compact selected location until the user chooses to replace it", async () => {
    const user = userEvent.setup();

    render(<LocationPicker label="地点" onChange={() => undefined} value={{ name: "Obertraun, Bezirk Gmunden, Upper Austria, Austria", latitude: 47.55, longitude: 13.69 }} />);

    expect(screen.getByRole("button", { name: "更换地点" })).not.toBeNull();
    expect(screen.queryByLabelText("地点")).toBeNull();
    await user.click(screen.getByRole("button", { name: "更换地点" }));
    expect(screen.getByLabelText("地点")).not.toBeNull();
  });

  it("opens an inline map picker for directly choosing a location", async () => {
    const user = userEvent.setup();

    render(<LocationPicker label="地点" onChange={() => undefined} value={undefined} />);
    await user.click(screen.getByRole("button", { name: "地图选点" }));

    expect(screen.getByLabelText("地点地图选点")).not.toBeNull();
    expect((screen.getByRole("button", { name: "确认位置" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
