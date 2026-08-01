import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Activity } from "../../domain/roadbook";
import { imageCropStyle } from "./ImageCropEditor";

type MaterialLibraryProps = {
  activities: Activity[];
  onPreviewActivity: (activityId: string) => void;
  onCreateActivity: () => void;
  onDeleteActivity: (activityId: string) => void;
};

function SortableMaterial({ activity, onPreviewActivity, onDeleteActivity }: { activity: Activity; onPreviewActivity: (activityId: string) => void; onDeleteActivity: (activityId: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: `material-${activity.id}`, data: { kind: "material", activityId: activity.id } });
  const price = activity.defaultPrice ? `${activity.defaultPrice.currency} ${activity.defaultPrice.amount}` : undefined;
  return (
    <div className="material-card" ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes}>
      <div aria-hidden="true" className="material-card-media" style={activity.image ? { backgroundImage: `url("${activity.image}")`, ...imageCropStyle(activity.imageCrop) } : undefined}>
        {!activity.image && <span>{activity.name.slice(0, 1)}</span>}
      </div>
      <button aria-label={activity.name} onDoubleClick={() => onPreviewActivity(activity.id)} type="button">
        <span className="material-card-copy"><strong>{activity.name}</strong><span>{activity.location?.name ?? "未设置位置"}</span></span>
        {price && <span className="material-card-price">{price}</span>}
      </button>
      <button aria-label={`删除素材 ${activity.name}`} className="material-delete-button" onClick={() => onDeleteActivity(activity.id)} type="button">×</button>
      <button aria-label={`排序 ${activity.name}`} className="material-drag-handle" type="button" {...listeners}>⠿</button>
    </div>
  );
}

export function MaterialLibrary({ activities, onPreviewActivity, onCreateActivity, onDeleteActivity }: MaterialLibraryProps) {
  return (
    <aside className="material-library" aria-label="行程素材库">
      <div className="panel-heading"><h2>行程素材库</h2><button onClick={onCreateActivity} type="button">添加素材</button></div>
      <p>拖动右侧手柄排序；活动可重复安排到不同日期。</p>
      <SortableContext items={activities.map(activity => `material-${activity.id}`)} strategy={verticalListSortingStrategy}>
        <ul>{activities.map(activity => <li key={activity.id}><SortableMaterial activity={activity} onDeleteActivity={onDeleteActivity} onPreviewActivity={onPreviewActivity} /></li>)}</ul>
      </SortableContext>
    </aside>
  );
}
