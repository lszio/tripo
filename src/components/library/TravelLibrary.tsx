import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ArchiveTravel } from "../../domain/roadbook";

type TravelLibraryProps = {
  travels: ArchiveTravel[];
  recordsOnly?: boolean;
  onOpenTravel: (travelId: string, mode: "roadbook" | "records") => void;
  onExportTravel?: (travel: ArchiveTravel) => void;
  onImportTravel?: (file: File) => void;
  onCreateTravel?: (input: { title: string; destination: string; startDate: string; endDate: string }) => void;
};

export function TravelLibrary({ travels, recordsOnly = false, onOpenTravel, onExportTravel, onImportTravel, onCreateTravel }: TravelLibraryProps) {
  const visibleTravels = recordsOnly ? travels.filter(travel => travel.records.length > 0) : travels;
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState({ title: "", destination: "", startDate: "", endDate: "" });
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating) titleInputRef.current?.focus();
  }, [isCreating]);

  function closeCreateForm() {
    setDraft({ title: "", destination: "", startDate: "", endDate: "" });
    setIsCreating(false);
  }

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.startDate || !draft.endDate) return;
    onCreateTravel?.({ ...draft, title: draft.title.trim(), destination: draft.destination.trim() });
    closeCreateForm();
  }

  return (
    <section aria-labelledby="travel-library-title">
      <header className="library-heading">
        <div><p className="eyebrow">个人旅行</p><h1 id="travel-library-title">{recordsOnly ? "旅行记录" : "我的旅行"}</h1></div>
        {!recordsOnly && <div className="travel-library-actions">{onCreateTravel && <button aria-expanded={isCreating} aria-controls="new-travel-form" type="button" onClick={() => setIsCreating(true)}>新建旅行</button>}{onImportTravel && <label className="import-travel-button">导入旅行方案<input accept="application/json,.json" aria-label="导入旅行方案" onChange={event => {
          const [file] = Array.from(event.target.files ?? []);
          if (file) onImportTravel(file);
          event.target.value = "";
        }} type="file" /></label>}</div>}
      </header>
      {isCreating && <form className="new-travel-form" id="new-travel-form" onKeyDown={event => { if (event.key === "Escape") closeCreateForm(); }} onSubmit={submitCreate}>
        <div className="new-travel-form-heading"><div><p className="eyebrow">从日期开始</p><h2>创建旅行</h2></div><button aria-label="关闭创建旅行表单" onClick={closeCreateForm} type="button">×</button></div>
        <label>旅行名称<input aria-label="旅行名称" onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} placeholder="例如：京都秋日漫游" ref={titleInputRef} required value={draft.title} /></label>
        <label>目的地 <span>可选</span><input aria-label="目的地" onChange={event => setDraft(current => ({ ...current, destination: event.target.value }))} placeholder="例如：日本 · 京都" value={draft.destination} /></label>
        <div className="new-travel-date-fields"><label>开始日期<input aria-label="开始日期" onChange={event => setDraft(current => ({ ...current, startDate: event.target.value, endDate: current.endDate && current.endDate < event.target.value ? event.target.value : current.endDate }))} required type="date" value={draft.startDate} /></label>
          <label>结束日期<input aria-label="结束日期" min={draft.startDate || undefined} onChange={event => setDraft(current => ({ ...current, endDate: event.target.value }))} required type="date" value={draft.endDate} /></label></div>
        <div className="new-travel-form-actions"><button type="button" onClick={closeCreateForm}>取消</button><button type="submit">创建旅行</button></div>
      </form>}
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
