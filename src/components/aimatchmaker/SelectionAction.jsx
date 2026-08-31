import React from "react";

export default function SelectionAction({ selection, onAdd }) {
  if (!selection) return null;
  return <button type="button" className="ai_match_maker__add-to-chat" style={{ left: selection.left, top: selection.top }} onMouseDown={(event) => event.preventDefault()} onClick={onAdd}>Add to chat</button>;
}
