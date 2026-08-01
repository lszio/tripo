import { useState } from "react";
import { TravelLibrary } from "./components/library/TravelLibrary";
import { GuestMenu } from "./components/library/GuestMenu";
import { RecordWorkspace } from "./components/records/RecordWorkspace";
import { RoadbookWorkspace } from "./components/roadbook/RoadbookWorkspace";
import { loadArchive, saveArchive } from "./data/archive-storage";
import { loadLocalGuest, saveLocalGuest } from "./data/local-guest";
import { parseImportedTravel, serializeTravel } from "./domain/trip-transfer";
import type { Archive, ArchiveTravel } from "./domain/roadbook";

type AppRoute = "travels" | "records" | "workspace";

type RoadbookAppProps = {
  initialArchive?: Archive;
};

function readTravelFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("无法读取旅行方案文件"));
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("无法读取旅行方案文件"));
    reader.readAsText(file);
  });
}

export function RoadbookApp({ initialArchive }: RoadbookAppProps) {
  const [archive, setArchive] = useState(() => initialArchive ?? loadArchive().archive);
  const [guest, setGuest] = useState(() => loadLocalGuest());
  const [route, setRoute] = useState<AppRoute>("travels");
  const [workspaceMode, setWorkspaceMode] = useState<"roadbook" | "records">("roadbook");
  const [selectedTravelId, setSelectedTravelId] = useState(archive.selectedTravelId ?? archive.travels[0]?.id);
  const [transferNotice, setTransferNotice] = useState("");
  const selectedTravel = archive.travels.find(travel => travel.id === selectedTravelId);

  function openTravel(travelId: string, mode: "roadbook" | "records") {
    setSelectedTravelId(travelId);
    setWorkspaceMode(mode);
    setRoute("workspace");
  }

  function navigate(nextRoute: "travels" | "records") {
    setRoute(nextRoute);
  }

  function commitRoadbook(tripId: string, roadbook: Archive["travels"][number]["roadbook"]) {
    setArchive(current => {
      const next = {
        ...current,
        travels: current.travels.map(travel => travel.id === tripId ? {
          ...travel,
          title: roadbook.name,
          dates: `${roadbook.startDate} 至 ${roadbook.endDate}`,
          roadbook
        } : travel)
      };
      saveArchive(next);
      return next;
    });
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
      const imported = parseImportedTravel(await readTravelFile(file), new Set(archive.travels.map(travel => travel.id)));
      setArchive(current => {
        const next = { ...current, travels: [...current.travels, imported], selectedTravelId: imported.id };
        saveArchive(next);
        return next;
      });
      setSelectedTravelId(imported.id);
      setRoute("travels");
      setTransferNotice(`已导入“${imported.title}”`);
    } catch (error) {
      setTransferNotice(error instanceof Error ? error.message : "导入旅行方案失败");
    }
  }

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
        {route === "travels" && <TravelLibrary onExportTravel={exportTravel} onImportTravel={importTravel} travels={archive.travels} onOpenTravel={openTravel} />}
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
