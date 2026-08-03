import React from "react";

export default function StatusSummary({ tokens, cost }) {
  return (
    <div className="status-summary">
      <span className="status-dot" />
      <div>
        <b>{tokens ? `${tokens.toLocaleString()} history tokens` : "Recommendation history"}</b>
        <small>{cost != null ? `Total estimated cost: $${cost.toFixed(6)}` : "No recommendations yet"}</small>
      </div>
    </div>
  );
}
