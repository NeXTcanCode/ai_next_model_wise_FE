import React from "react";

export default function ResultCard({ result }) {
  return (
    <div className="result-card">
      <span className="result-kicker">RECOMMENDATION</span>
      <h3>{result.model}</h3>
      <p>{result.summary || "Strong fit for the reasoning depth and context in your task."}</p>
      <div className="prompt-cost">
        <span>{result.inputTokens?.toLocaleString()} input tokens</span>
        <b>{result.inputCost != null ? `$${result.inputCost.toFixed(6)}` : "Price unavailable"}</b>
      </div>
      <div className="confidence">
        <span>Confidence</span>
        <b>{result.confidence}%</b>
      </div>
    </div>
  );
}
