type ActionConfirmationProps = {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ActionConfirmation({ title, message, onCancel, onConfirm }: ActionConfirmationProps) {
  return (
    <aside aria-label={title} className="confirmation-dialog" role="dialog">
      <p className="eyebrow">请确认操作</p>
      <h2>{title}</h2>
      <p>{message}</p>
      <footer><button onClick={onCancel} type="button">取消</button><button onClick={onConfirm} type="button">确认删除</button></footer>
    </aside>
  );
}
