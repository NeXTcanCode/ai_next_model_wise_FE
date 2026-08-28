import React from "react";
import { normalizeRanking } from "../lib/recommendations";

const fitLabel = (score) => {
  if (score == null) return "Not scored";
  const percentage = score >= 0 && score <= 1 ? score * 100 : score;
  return `${Math.round(percentage)}% fit`;
};

const costLabel = (model) => {
  if (model.estimatedInputCostUsd != null) {
    return `$${model.estimatedInputCostUsd.toFixed(6)} input cost`;
  }
  if (model.inputPricePerMillion != null) {
    return `$${model.inputPricePerMillion.toFixed(2)}/1M input tokens`;
  }
  return "Cost unavailable";
};

export default function RankingView({ models = [] }) {
  const rankedModels = normalizeRanking(models);

  return (
    <section className="page-panel ranking-page">
      <div className="page-intro">
        <div>
          <h2>Model ranking</h2>
          <p>Compared on task fit, capability, and estimated input cost.</p>
        </div>
      </div>
      <div className="ranking-list">
        {rankedModels.length ? (
          rankedModels.map((model, index) => (
            <article
              className={
                model.isRecommended ? "ranking-row recommended" : "ranking-row"
              }
              key={`${model.id || model.displayName}-${index}`}
            >
              <span
                className="ranking-position"
                aria-label={`Rank ${model.rank}`}
              >
                {model.rank}
              </span>
              <div className="ranking-copy">
                <div className="ranking-title">
                  <b>{model.displayName}</b>
                  {model.isRecommended && <span>Recommended</span>}
                </div>
                {model.providerName && (
                  <small className="ranking-provider">
                    {model.providerName}
                  </small>
                )}
                {/* <ul className="ranking-reasons">
                  {model.reasons.length > 1 ? (
                    model.reasons.slice(1).map((reason, reasonIndex) => (
                      <li key={`${reason}-${reasonIndex}`}>{reason}</li>
                    ))
                  ) : (
                    <li>No scoring explanation was returned.</li>
                  )}
                </ul> */}
              </div>
              <div className="ranking-metrics">
                <span className="confidence-pill">{fitLabel(model.score)}</span>
                <small>{costLabel(model)}</small>
              </div>
            </article>
          ))
        ) : (
          <p className="empty-history">
            Run a recommendation to compare your active models.
          </p>
        )}
      </div>
    </section>
  );
}
