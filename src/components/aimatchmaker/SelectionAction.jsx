import React, { useState } from "react";

export default function SelectionAction({ selection, onAdd, onAsk }) {
  const [question, setQuestion] = useState("");
  if (!selection) return null;
  const submit = (event) => { event.preventDefault(); if (question.trim()) { onAsk(question.trim()); setQuestion(""); } };
  return <div className="ai_match_maker__selection-box" style={{ left: selection.left, top: selection.top }} onMouseDown={(event) => event.preventDefault()}>
    <form onSubmit={submit}>
      <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about this…" aria-label="Ask about selected text" autoFocus />
      <button type="submit" disabled={!question.trim()}>Ask</button>
    </form>
    <button type="button" className="ai_match_maker__add-to-chat" onClick={onAdd}>Add to chat</button>
  </div>;
}
