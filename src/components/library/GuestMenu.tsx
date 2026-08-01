import { useState } from "react";
import type { LocalGuest } from "../../data/local-guest";
import { ModalLayer } from "../roadbook/ModalLayer";

type GuestMenuProps = {
  guest: LocalGuest;
  onSave: (name: string) => void;
};

export function GuestMenu({ guest, onSave }: GuestMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(guest.name);

  function open() {
    setName(guest.name);
    setIsOpen(true);
  }

  function save() {
    const nextName = name.trim();
    if (!nextName) return;
    onSave(nextName);
    setIsOpen(false);
  }

  return <>
    <button aria-label={`访客：${guest.name}`} className="guest-trigger" onClick={open} type="button">访客 · {guest.name}</button>
    {isOpen && <ModalLayer variant="drawer">
      <aside aria-label="访客资料" className="detail-drawer guest-drawer" role="dialog">
        <header><div><p className="eyebrow">本地访客</p><h2>访客资料</h2></div><button aria-label="关闭访客资料" onClick={() => setIsOpen(false)} type="button">×</button></header>
        <p>资料仅保存在当前浏览器中，不会上传或同步到其他设备。</p>
        <label>访客昵称<input aria-label="访客昵称" maxLength={24} onChange={event => setName(event.target.value)} value={name} /></label>
        <footer><button onClick={() => setIsOpen(false)} type="button">取消</button><button disabled={!name.trim()} onClick={save} type="button">保存访客资料</button></footer>
      </aside>
    </ModalLayer>}
  </>;
}
