import type { ArchiveTravel } from "../../domain/roadbook";

type TravelLibraryProps = {
  travels: ArchiveTravel[];
  recordsOnly?: boolean;
  onOpenTravel: (travelId: string, mode: "roadbook" | "records") => void;
};

export function TravelLibrary({ travels, recordsOnly = false, onOpenTravel }: TravelLibraryProps) {
  const visibleTravels = recordsOnly ? travels.filter(travel => travel.records.length > 0) : travels;

  return (
    <section aria-labelledby="travel-library-title">
      <p className="eyebrow">个人旅行</p>
      <h1 id="travel-library-title">{recordsOnly ? "旅行记录" : "我的旅行"}</h1>
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
              <button type="button" onClick={() => onOpenTravel(travel.id, recordsOnly ? "records" : "roadbook")}>
                {recordsOnly ? "查看旅行记录" : "查看旅行"}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
