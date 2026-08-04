import React from "react";
import { CheckCircle2 } from "lucide-react";

const humanize = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function ResultCard({ result }) {
  const assessment = result.assessment || {};
  const assessmentItems = [
    ["Task", assessment.taskType || assessment.taskDomain],
    ["Complexity", assessment.complexity],
    ["Reasoning", assessment.reasoningRequirement],
    ["Goal", assessment.goalClarity],
  ].filter(([, value]) => value);

  return (
    <div className="result-card">
      <span className="result-kicker">RECOMMENDATION</span>
      <h3>{result.model}</h3>
      <p>
        {result.summary ||
          "Strong fit for the reasoning depth and context in your task."}
      </p>

      {assessmentItems.length > 0 && (
        <div className="assessment-grid" aria-label="Task assessment">
          {assessmentItems.map(([label, value]) => (
            <div key={label}>
              <small>{label}</small>
              <b>{humanize(value)}</b>
            </div>
          ))}
        </div>
      )}

      {result.reasons?.length > 0 && (
        <div className="result-reasons">
          <span className="result-section-label">WHY THIS MODEL</span>
          <ul>
            {result.reasons.map((reason, index) => (
              <li key={`${reason}-${index}`}>
                <CheckCircle2 size={13} aria-hidden />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.alternative && (
        <div className="alternative-model">
          <span>
            <small>RUNNER-UP</small>
            <b>{result.alternative.name}</b>
          </span>
          {result.estimatedSavingsUsd != null &&
            result.estimatedSavingsUsd > 0 && (
              <small>${result.estimatedSavingsUsd.toFixed(6)} saved</small>
            )}
        </div>
      )}

      <div className="prompt-cost">
        <span>
          {result.inputTokens != null
            ? `${result.inputTokens.toLocaleString()} input tokens`
            : "Token estimate unavailable"}
        </span>
        <b>
          {result.inputCost != null
            ? `$${result.inputCost.toFixed(6)}`
            : "Price unavailable"}
        </b>
      </div>
      <div className="confidence">
        <span>Confidence</span>
        <b>
          {result.confidence != null ? `${result.confidence}%` : "Unavailable"}
        </b>
      </div>
    </div>
  );
}
