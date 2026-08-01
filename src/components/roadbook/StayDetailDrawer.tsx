import { useState } from "react";
import type { Location, Price, StayNode } from "../../domain/roadbook";
import { OpenStreetMapLink } from "./OpenStreetMapLink";
import { LocationPicker } from "./LocationPicker";
import { ModalLayer } from "./ModalLayer";

type StayDraft = {
  name: string;
  location?: Location;
  checkIn: string;
  checkOut: string;
  priceAmount: string;
  priceCurrency: string;
  priceUnit: Price["unit"];
  note: string;
};

function toDraft(stay: StayNode): StayDraft {
  return { name: stay.name, location: stay.location, checkIn: stay.checkIn ?? "", checkOut: stay.checkOut ?? "", priceAmount: stay.price?.amount.toString() ?? "", priceCurrency: stay.price?.currency ?? "CNY", priceUnit: stay.price?.unit ?? "night", note: stay.note ?? "" };
}

export function StayDetailDrawer({ stay, onClose, onSave }: { stay: StayNode; onClose: () => void; onSave: (stay: StayNode) => void }) {
  const [draft, setDraft] = useState(() => toDraft(stay));
  const update = (key: keyof StayDraft, value: string | boolean) => setDraft(current => ({ ...current, [key]: value }));
  const priceAmount = Number(draft.priceAmount);
  const price = draft.priceAmount.trim() && Number.isFinite(priceAmount) ? { amount: priceAmount, currency: draft.priceCurrency.trim() || "CNY", unit: draft.priceUnit } : undefined;
  return (
    <ModalLayer variant="drawer"><aside aria-label="住宿详情" className="detail-drawer" role="dialog">
      <header><h2>住宿详情</h2><button aria-label="关闭住宿详情" onClick={onClose} type="button">×</button></header>
      <label>住宿名称<input aria-label="住宿名称" onChange={event => update("name", event.target.value)} value={draft.name} /></label>
      <LocationPicker label="住宿地点" onChange={location => setDraft(current => ({ ...current, location }))} value={draft.location} />
      <OpenStreetMapLink label="在 OpenStreetMap 中查看" location={draft.location} />
      <div className="drawer-field-row"><label>入住日期<input aria-label="入住日期" onChange={event => update("checkIn", event.target.value)} type="date" value={draft.checkIn} /></label><label>退房日期<input aria-label="退房日期" onChange={event => update("checkOut", event.target.value)} type="date" value={draft.checkOut} /></label></div>
      <div className="drawer-field-row"><label>价格<input aria-label="住宿价格" inputMode="decimal" onChange={event => update("priceAmount", event.target.value)} value={draft.priceAmount} /></label><label>价格币种<input aria-label="住宿价格币种" onChange={event => update("priceCurrency", event.target.value)} value={draft.priceCurrency} /></label></div>
      <label>计价方式<select aria-label="住宿计价方式" onChange={event => update("priceUnit", event.target.value as Price["unit"])} value={draft.priceUnit}><option value="total">总价</option><option value="person">每人</option><option value="night">每晚</option></select></label>
      <label>备注<textarea aria-label="住宿备注" onChange={event => update("note", event.target.value)} value={draft.note} /></label>
      <footer><button onClick={onClose} type="button">取消</button><button disabled={!draft.name.trim()} onClick={() => onSave({ ...stay, name: draft.name.trim(), location: draft.location, checkIn: draft.checkIn || undefined, checkOut: draft.checkOut || undefined, price, note: draft.note.trim() || undefined })} type="button">保存</button></footer>
    </aside></ModalLayer>
  );
}
