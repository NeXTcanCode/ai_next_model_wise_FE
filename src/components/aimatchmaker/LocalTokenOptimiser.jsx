import React, { useMemo, useState } from "react";
import { Gauge, Sparkles, X } from "lucide-react";
import { encodingForModel } from "js-tiktoken";
import { api } from "../../lib/api";

const encoder = encodingForModel("gpt-4o");
const countTokens = (text) => encoder.encode(String(text || "")).length;
const optimizeText = (text) =>
  String(text || "")
    .split(/(```[\s\S]*?```)/g)
    .map((part) =>
      part.startsWith("```")
        ? part
        : part
            .replace(/[ \t]+/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .replace(/\b(please|kindly)\s+/gi, "")
            .replace(/\bI would like you to\b/gi, "")
            .replace(/\bCan you please\b/gi, "Please")
            .trim()
    )
    .join("");

export default function LocalTokenOptimiser({ message, setMessage }) {
  const [open, setOpen] = useState(false);
  const [optimized, setOptimized] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const originalCount = useMemo(() => countTokens(message), [message]);
  const optimizedCount = optimized ? countTokens(optimized) : 0;
  const savings = optimized
    ? Math.max(0, Math.round((1 - optimizedCount / originalCount) * 100))
    : 0;
  const runOptimization = async () => {
    setOptimizing(true); setErrorMessage(""); setOptimized(""); setOpen(true);
    try { const data = await api("/api/v1/prompts/optimize", { method: "POST", body: JSON.stringify({ prompt: message }) }); setOptimized(data.optimizedPrompt || message); }
    catch (error) { setErrorMessage(error.message || "Optimization failed."); }
    finally { setOptimizing(false); }
  };
  const hasMessage = Boolean(message.trim());
  return (
    <div className={`local-token-optimiser${hasMessage ? "" : " is-empty"}`}>
      <button
        type="button"
        className="local-token-optimiser__trigger"
        onClick={runOptimization}
        tabIndex={hasMessage ? 0 : -1}
        title="Count locally and optimize with Groq"
      >
        <Gauge size={14} /> {originalCount.toLocaleString()} tokens{" "}
        <Sparkles size={13} /> Optimize
      </button>
      <div
        className={`local-token-optimiser__panel${
          open && hasMessage ? " is-open" : ""
        }`}
        aria-hidden={!open || !hasMessage}
      >
        <button
          type="button"
          className="local-token-optimiser__close"
          onClick={() => setOpen(false)}
          aria-label="Close optimizer"
        >
          <X size={14} />
        </button>
          <b>Optimize with Groq</b>
          <small>Your prompt will be sent securely for optimization.</small>
          {optimizing && <small>Optimizing prompt…</small>}
          {errorMessage && <small className="local-token-optimiser__error">{errorMessage}</small>}
        <div className="local-token-optimiser__stats">
          <span>
            Original<strong>{originalCount.toLocaleString()}</strong>
          </span>
          <span>
            Optimized<strong>{optimizedCount.toLocaleString()}</strong>
          </span>
          <span>
            Saved<strong>{savings}%</strong>
          </span>
        </div>
        <textarea value={optimized} onChange={(event) => setOptimized(event.target.value)} aria-label="Optimized prompt" readOnly={optimizing} />
        <div>
          <button type="button" onClick={() => setOpen(false)}>
            Keep Original
          </button>
          <button
            type="button"
            className=""
            onClick={() => {
              setMessage(optimized);
              setOpen(false);
            }}
              disabled={optimizing || !optimized.trim() || optimized === message}
          >
            Use optimized
          </button>
        </div>
      </div>
    </div>
  );
}
