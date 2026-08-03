import React from "react";

export default function RankingView({ models = [] }) {
  return (
    <section className="page-panel">
      <div className="page-intro">
        <div>
          <h2>Model ranking</h2>
          <p>Active shortlist by fit and cost.</p>
        </div>
      </div>
      <div className="history-chart">
        {models.length ? (
          models.map((model, i) => (
            <div
              className="history-row"
              key={model.id || model.displayName || i}
            >
              <div>
                <b>
                  {model.rank || i + 1}. {model.displayName || model.name || String(model)}
                </b>
                <small>{(model.reasons || []).join(" · ") || model.providerName || ""}</small>
              </div>
              <span className="confidence-pill">
                {model.score != null
                  ? `${Number(model.score).toFixed(1)} score`
                  : model.inputPricePerMillion != null
                  ? `$${Number(model.inputPricePerMillion).toFixed(2)}/1M`
                  : "No price"}
              </span>
            </div>
          ))
        ) : (
          <p className="empty-history">No models ranked yet.</p>
        )}
      </div>
    </section>
  );
}
