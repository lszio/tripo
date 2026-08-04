import { useEffect, useState } from "react";
import { TravelLibrary } from "./components/library/TravelLibrary";
import { GuestMenu } from "./components/library/GuestMenu";
import { RecordWorkspace } from "./components/records/RecordWorkspace";
import { RoadbookWorkspace } from "./components/roadbook/RoadbookWorkspace";
import { loadArchive as loadLocalArchive, STORAGE_KEY } from "./data/archive-storage";
import { createApiArchiveStorage, type ApiArchiveStorage } from "./data/api-archive-storage";
import { loadLocalGuest, saveLocalGuest } from "./data/local-guest";
import { parseImportedTravel, serializeTravel } from "./domain/trip-transfer";
import { getCalendarDates } from "./domain/calendar-days";
import type { Archive, ArchiveTravel } from "./domain/roadbook";

type AppRoute = "travels" | "records" | "workspace";

type RoadbookAppProps = {
  initialArchive?: Archive;
  archiveStorage?: ApiArchiveStorage;
};

const browserArchiveStorage = createApiArchiveStorage((input, init) => globalThis.fetch(input, init));

function readTravelFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("无法读取旅行方案文件"));
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("无法读取旅行方案文件"));
    reader.readAsText(file);
  });
}

function loadExistingLocalArchive() {
  if (!globalThis.localStorage.getItem(STORAGE_KEY)) return undefined;
  const result = loadLocalArchive();
  return result.recoveryError ? undefined : result.archive;
}

function createTravel(input: { title: string; destination: string; startDate: string; endDate: string }): ArchiveTravel {
  const id = `travel-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
  const days = getCalendarDates(input.startDate, input.endDate).map((date, order) => ({ id: `${id}-day-${date}`, date, order, stays: [], isActive: true }));
  return {
    id,
    title: input.title,
    destination: input.destination || undefined,
    dates: `${input.startDate} 至 ${input.endDate}`,
    status: "planned",
    records: [],
    roadbook: { id: `roadbook-${id}`, name: input.title, startDate: input.startDate, endDate: input.endDate, currency: "CNY", people: 1, days, activities: [], schedule: [] }
  };
}

export function RoadbookApp({ initialArchive, archiveStorage = browserArchiveStorage }: RoadbookAppProps) {
  const [archive, setArchive] = useState<Archive | undefined>(initialArchive);
  const [loadState, setLoadState] = useState<"loading" | "failed" | "ready">(initialArchive ? "ready" : "loading");
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [guest, setGuest] = useState(() => loadLocalGuest());
  const [route, setRoute] = useState<AppRoute>("travels");
  const [workspaceMode, setWorkspaceMode] = useState<"roadbook" | "records">("roadbook");
  const [selectedTravelId, setSelectedTravelId] = useState(initialArchive?.selectedTravelId ?? initialArchive?.travels[0]?.id);
  const [transferNotice, setTransferNotice] = useState("");
  const selectedTravel = archive?.travels.find(travel => travel.id === selectedTravelId);

  useEffect(() => {
    if (initialArchive) return;

    let active = true;
    async function loadRemoteArchive() {
      setLoadState("loading");
      setLoadError("");

      try {
        let remoteArchive = await archiveStorage.loadArchive();
        const localArchive = loadExistingLocalArchive();

        if (localArchive?.travels.length) {
          try {
            await archiveStorage.importLocalArchiveOnce(localArchive);
            const refreshedArchive = await archiveStorage.loadArchive();
            const preservedSelection = localArchive.selectedTravelId && refreshedArchive.travels.some(travel => travel.id === localArchive.selectedTravelId)
              ? localArchive.selectedTravelId
              : refreshedArchive.selectedTravelId;
            remoteArchive = { ...refreshedArchive, selectedTravelId: preservedSelection };
            globalThis.localStorage.removeItem(STORAGE_KEY);
          } catch (error) {
            if (active) setTransferNotice(error instanceof Error ? error.message : "导入本地旅行数据失败");
          }
        }

        if (!active) return;
        setArchive(remoteArchive);
        setSelectedTravelId(current => remoteArchive.travels.some(travel => travel.id === current)
          ? current
          : remoteArchive.selectedTravelId ?? remoteArchive.travels[0]?.id);
        setLoadState("ready");
      } catch (error) {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "加载旅行数据失败");
        setLoadState("failed");
      }
    }

    void loadRemoteArchive();
    return () => { active = false; };
  }, [archiveStorage, initialArchive, loadAttempt]);

  function openTravel(travelId: string, mode: "roadbook" | "records") {
    setSelectedTravelId(travelId);
    setWorkspaceMode(mode);
    setRoute("workspace");
  }

  function navigate(nextRoute: "travels" | "records") {
    setRoute(nextRoute);
  }

  async function commitRoadbook(tripId: string, roadbook: Archive["travels"][number]["roadbook"]) {
    if (!archive) return;
    const changedTravel = archive.travels.find(travel => travel.id === tripId);
    if (!changedTravel) return;

    const travel = {
      ...changedTravel,
      title: roadbook.name,
      dates: `${roadbook.startDate} 至 ${roadbook.endDate}`,
      roadbook
    };
    setArchive({ ...archive, travels: archive.travels.map(item => item.id === tripId ? travel : item) });

    try {
      await archiveStorage.saveTravel(travel);
    } catch (error) {
      setTransferNotice(error instanceof Error ? error.message : "保存旅行数据失败");
    }
  }

  function saveGuest(name: string) {
    const next = { ...guest, name };
    setGuest(next);
    saveLocalGuest(next);
  }

  function exportTravel(travel: ArchiveTravel) {
    const blob = new Blob([serializeTravel(travel)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${travel.title.replace(/[\\/:*?"<>|]/g, "-") || "旅行方案"}.go-travel.json`;
    link.click();
    URL.revokeObjectURL(url);
    setTransferNotice(`已导出“${travel.title}”`);
  }

  async function importTravel(file: File) {
    try {
      if (!archive) return;
      const imported = parseImportedTravel(await readTravelFile(file), new Set(archive.travels.map(travel => travel.id)));
      setArchive({ ...archive, travels: [...archive.travels, imported], selectedTravelId: imported.id });
      setSelectedTravelId(imported.id);
      setRoute("travels");
      try {
        await archiveStorage.saveTravel(imported);
        setTransferNotice(`已导入“${imported.title}”`);
      } catch (error) {
        setTransferNotice(error instanceof Error ? error.message : "保存旅行数据失败");
      }
    } catch (error) {
      setTransferNotice(error instanceof Error ? error.message : "导入旅行方案失败");
    }
  }

  async function createTravelFromLibrary(input: { title: string; destination: string; startDate: string; endDate: string }) {
    if (!archive) return;
    const travel = createTravel(input);
    setArchive({ ...archive, travels: [...archive.travels, travel], selectedTravelId: travel.id });
    setSelectedTravelId(travel.id);
    try {
      await archiveStorage.saveTravel(travel);
      setTransferNotice(`已创建“${travel.title}”`);
    } catch (error) {
      setTransferNotice(error instanceof Error ? error.message : "保存旅行数据失败");
    }
  }

  if (loadState === "loading") {
    return <main className="app-main" role="status">正在加载旅行数据…</main>;
  }

  if (loadState === "failed") {
    return (
      <main className="app-main">
        <p role="alert">{loadError}</p>
        <button type="button" onClick={() => setLoadAttempt(current => current + 1)}>重试加载</button>
      </main>
    );
  }

  if (!archive) return null;

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="app-brand" href="#travels">自由行路书</a>
        <nav aria-label="主导航">
          <a href="#travels" onClick={event => { event.preventDefault(); navigate("travels"); }}>我的旅行</a>
          <a href="#records" onClick={event => { event.preventDefault(); navigate("records"); }}>旅行记录</a>
        </nav>
        <GuestMenu guest={guest} onSave={saveGuest} />
      </header>
      <main className="app-main">
        {route === "travels" && <TravelLibrary onCreateTravel={createTravelFromLibrary} onExportTravel={exportTravel} onImportTravel={importTravel} travels={archive.travels} onOpenTravel={openTravel} />}
        {route === "records" && <TravelLibrary travels={archive.travels} recordsOnly onOpenTravel={openTravel} />}
        {route === "workspace" && selectedTravel && (
          workspaceMode === "records"
            ? <RecordWorkspace travel={selectedTravel} />
            : <RoadbookWorkspace trip={selectedTravel.roadbook} onCommit={roadbook => commitRoadbook(selectedTravel.id, roadbook)} />
        )}
        {transferNotice && <p aria-live="polite" className="save-notice" role="status">{transferNotice}</p>}
      </main>
    </div>
  );
}
