import type { ArchiveTravel } from "../../domain/roadbook";

type TravelLibraryProps = {
  travels: ArchiveTravel[];
  recordsOnly?: boolean;
  onOpenTravel: (travelId: string, mode: "roadbook" | "records") => void;
  onExportTravel?: (travel: ArchiveTravel) => void;
  onImportTravel?: (file: File) => void;
};

export function TravelLibrary({ travels, recordsOnly = false, onOpenTravel, onExportTravel, onImportTravel }: TravelLibraryProps) {
  const visibleTravels = recordsOnly ? travels.filter(travel => travel.records.length > 0) : travels;

  return (
    <section aria-labelledby="travel-library-title">
      <header className="library-heading">
        <div><p className="eyebrow">个人旅行</p><h1 id="travel-library-title">{recordsOnly ? "旅行记录" : "我的旅行"}</h1></div>
        {!recordsOnly && onImportTravel && <label className="import-travel-button">导入旅行方案<input accept="application/json,.json" aria-label="导入旅行方案" onChange={event => {
          const [file] = Array.from(event.target.files ?? []);
          if (file) onImportTravel(file);
          event.target.value = "";
        }} type="file" /></label>}
      </header>
      {visibleTravels.length === 0 ? (
        <p>还没有旅行记录。</p>
      ) : (
        <div className="travel-grid">
          {visibleTravels.map(travel => (
            <article className="travel-card" key={travel.id}>
              <p>{travel.destination ?? "自由行"}</p>
              <h2>{travel.title}</h2>
              <p>{travel.dates ?? `${travel.roadbook.startDate} 至 ${travel.roadbook.endDate}`}</p>
              <p>{travel.roadbook.days.length} 天 · {travel.roadbook.activities.length} 个活动</p>
              <div className="travel-card-actions"><button type="button" onClick={() => onOpenTravel(travel.id, recordsOnly ? "records" : "roadbook")}>
                {recordsOnly ? "查看旅行记录" : "查看旅行"}
              </button>{!recordsOnly && onExportTravel && <button aria-label={`导出 ${travel.title}`} className="travel-export-button" onClick={() => onExportTravel(travel)} type="button">导出</button>}</div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
