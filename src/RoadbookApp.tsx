import { useState } from "react";
import { TravelLibrary } from "./components/library/TravelLibrary";
import { RecordWorkspace } from "./components/records/RecordWorkspace";
import { RoadbookWorkspace } from "./components/roadbook/RoadbookWorkspace";
import { loadArchive, saveArchive } from "./data/archive-storage";
import type { Archive } from "./domain/roadbook";

type AppRoute = "travels" | "records" | "workspace";

type RoadbookAppProps = {
  initialArchive?: Archive;
};

export function RoadbookApp({ initialArchive }: RoadbookAppProps) {
  const [archive, setArchive] = useState(() => initialArchive ?? loadArchive().archive);
  const [route, setRoute] = useState<AppRoute>("travels");
  const [workspaceMode, setWorkspaceMode] = useState<"roadbook" | "records">("roadbook");
  const [selectedTravelId, setSelectedTravelId] = useState(archive.selectedTravelId ?? archive.travels[0]?.id);
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

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="app-brand" href="#travels">自由行路书</a>
        <nav aria-label="主导航">
          <a href="#travels" onClick={event => { event.preventDefault(); navigate("travels"); }}>我的旅行</a>
          <a href="#records" onClick={event => { event.preventDefault(); navigate("records"); }}>旅行记录</a>
        </nav>
      </header>
      <main className="app-main">
        {route === "travels" && <TravelLibrary travels={archive.travels} onOpenTravel={openTravel} />}
        {route === "records" && <TravelLibrary travels={archive.travels} recordsOnly onOpenTravel={openTravel} />}
        {route === "workspace" && selectedTravel && (
          workspaceMode === "records"
            ? <RecordWorkspace travel={selectedTravel} />
            : <RoadbookWorkspace trip={selectedTravel.roadbook} onCommit={roadbook => commitRoadbook(selectedTravel.id, roadbook)} />
        )}
      </main>
    </div>
  );
}
