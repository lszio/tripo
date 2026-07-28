import type { ArchiveTravel } from "../../domain/roadbook";

type RecordWorkspaceProps = {
  travel: ArchiveTravel;
};

export function RecordWorkspace({ travel }: RecordWorkspaceProps) {
  return (
    <section aria-labelledby="record-workspace-title">
      <p className="eyebrow">旅行记录</p>
      <h1 id="record-workspace-title">{travel.title}</h1>
      <p>冻结攻略保持只读，实际记录可独立调整。</p>
      <ul>
        {travel.records.map(record => (
          <li key={record.id}>
            <strong>{record.content || "未命名记录"}</strong>
            <span>{record.actualDayId}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
