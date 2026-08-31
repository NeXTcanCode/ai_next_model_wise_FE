import React from "react";
import { Bot, Copy, Pencil, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import MessageContent from "./MessageContent";

export default function ChatMessages({ messages, feedback, onCopy, onEdit, onFeedback, onRegenerate, onRetry }) {
  return messages.map((item) => item.role === "user" ? (
    <div className="ai_match_maker__user-message-wrap" key={item.id}>
      <div className="ai_match_maker__user-message">
        {item.imageUrl && <img src={item.imageUrl} alt={item.imageName || "Uploaded image"} />}
        {item.content}
      </div>
      <div className="ai_match_maker__message-actions ai_match_maker__user-actions">
        <button type="button" onClick={() => onCopy(item.content)} aria-label="Copy prompt" title="Copy prompt"><Copy size={13} /></button>
        <button type="button" onClick={() => onEdit(item.id, item.content)} aria-label="Edit prompt" title="Edit prompt"><Pencil size={13} /></button>
      </div>
    </div>
  ) : (
    <article className={`ai_match_maker__response${item.isError ? " ai_match_maker__response--error" : ""}`} key={item.id}>
      <div className="ai_match_maker__response-identity"><span><Bot size={15} /></span><b>NeXT AI</b></div>
      <p><MessageContent content={item.content} /></p>
      {!item.isError && <div className="ai_match_maker__message-actions ai_match_maker__response-actions">
        <button type="button" onClick={() => onCopy(item.content)} aria-label="Copy response" title="Copy response"><Copy size={13} /></button>
        <button type="button" className={feedback[item.id] === true ? "selected" : ""} onClick={() => onFeedback(item.id, true)} aria-label="Helpful response" title="Helpful"><ThumbsUp size={13} /></button>
        <button type="button" className={feedback[item.id] === false ? "selected" : ""} onClick={() => onFeedback(item.id, false)} aria-label="Not helpful response" title="Not helpful"><ThumbsDown size={13} /></button>
        <button type="button" onClick={onRegenerate} aria-label="Regenerate response" title="Regenerate response"><RotateCcw size={13} /></button>
      </div>}
      {item.retryPrompt && <button type="button" className="ai_match_maker__retry" onClick={() => onRetry(item.retryPrompt, item.retryImage)}><RotateCcw size={14} /> Retry</button>}
    </article>
  ));
}
