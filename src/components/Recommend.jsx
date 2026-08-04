import React from "react";
import {
  ArrowRight,
  Check,
  FileCode2,
  Image,
  Layers3,
  LoaderCircle,
  Plus,
  Sparkles,
} from "lucide-react";
import ModelsCard from "./ModelsCard";
import ResultCard from "./ResultCard";
import TipCard from "./TipCard";

const contexts = [
  "No additional context",
  "Code",
  "Document or text",
  "Image",
  "Data or table",
];

export default function Recommend(props) {
  return (
    <section className="content-grid">
      <FormPanel {...props} />
      <SideColumn {...props} />
    </section>
  );
}

export function FormPanel({
  prompt,
  setPrompt,
  context,
  setContext,
  contextDetails,
  setContextDetails,
  recommend,
  isRecommending,
}) {
  return (
    <div className="form-panel">
      <div className="panel-heading">
        <div>
          <span className="step">01</span>
          <div>
            <h2>Describe your task</h2>
            <p>Tell us what you’re working on. Be as specific as you like.</p>
          </div>
        </div>
        <span className="hint">Ctrl/⌘ + Enter</span>
      </div>
      <label className="field-label">
        YOUR PROMPT <span>Required</span>
      </label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={isRecommending}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            if (!isRecommending) recommend();
          }
        }}
        placeholder="e.g. Review this authentication flow and identify why expired tokens aren't redirecting users..."
      />
      <div className="char-count">{prompt.length} / 20,000</div>
      <label className="field-label context-label">
        CONTEXT <span>Optional</span>
      </label>
      <div className="context-options">
        {contexts.map((c) => {
          const Icon =
            c === "No additional context"
              ? Sparkles
              : c === "Code"
              ? FileCode2
              : c === "Image"
              ? Image
              : Layers3;
          return (
            <button
              key={c}
              className={context === c ? "selected" : ""}
              onClick={() => setContext(c)}
              disabled={isRecommending}
            >
              <Icon size={15} /> {c}
              {context === c && <Check size={14} />}
            </button>
          );
        })}
      </div>
      <label className="field-label context-label">
        CONTEXT DETAILS <span>Optional</span>
      </label>
      <textarea
        className="context-details"
        value={contextDetails}
        onChange={(e) => setContextDetails(e.target.value)}
        disabled={isRecommending}
        maxLength={300}
        placeholder="e.g. 3 files, 1 screenshot, about 500 lines"
      />
      <button
        className="primary"
        onClick={recommend}
        disabled={!prompt.trim() || isRecommending}
        aria-busy={isRecommending}
      >
        {isRecommending ? (
          <>
            Comparing models{" "}
            <LoaderCircle className="loading-spinner" size={17} />
          </>
        ) : (
          <>
            Recommend a model <ArrowRight size={17} />
          </>
        )}
      </button>
      <p className="privacy">
        <span>⌁</span> Your prompt is not saved.
      </p>
    </div>
  );
}

export function SideColumn({ result, models, onAddModel, onManage, onCloseResult }) {
  return (
    <div className="side-column">
      <ModelsCard models={models} onAddModel={onAddModel} onManage={onManage} />
      <TipCard />
      {result && <ResultCard result={result} onClose={onCloseResult} />}
    </div>
  );
}
