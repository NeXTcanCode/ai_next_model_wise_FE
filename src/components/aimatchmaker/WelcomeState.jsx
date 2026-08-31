import React from "react";
import { Sparkles } from "lucide-react";

export default function WelcomeState({ greeting, firstName, chatMode, setChatMode, setAnswerStyle }) {
  return (
    <div className="ai_match_maker__welcome">
      <div className="ai_match_maker__welcome-title"><span><Sparkles size={24} /></span><h2>{greeting}{firstName ? `, ${firstName}` : ""}</h2></div>
      <p>Ask a question, explore an idea, or build something new</p>
      <small className="ai_match_maker__privacy-note" style={{ color: "#8b8596", fontSize: "9px", display: "block" }}>
        Private by design - Incognito Mode — we don’t store your NeXT AI chats or prompts
      </small>
      <div className="ai_match_maker__mode-tabs" role="tablist" aria-label="NeXT AI mode">
        <button type="button" className={chatMode === "normal" ? "active" : ""} onClick={() => { setChatMode("normal"); setAnswerStyle("standard"); }} role="tab" aria-selected={chatMode === "normal"}>Normal mode</button>
        <button type="button" className={chatMode === "coder" ? "active" : ""} onClick={() => { setChatMode("coder"); setAnswerStyle("standard"); }} role="tab" aria-selected={chatMode === "coder"}>Coder mode</button>
      </div>
    </div>
  );
}
