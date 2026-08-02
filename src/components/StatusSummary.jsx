import React from "react";

export default function StatusSummary({ tokens, cost }) {
  return (
    <div className="status-summary">
      <span className="status-dot" />
      <div>
        <b>{tokens ? `${tokens.toLocaleString()} input tokens` : "Prompt usage"}</b>
        <small>{cost != null ? `Estimated cost: $${cost.toFixed(6)}` : "Add a prompt to estimate cost"}</small>
      </div>
    </div>
  );
}
