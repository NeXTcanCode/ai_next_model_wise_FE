import React from "react";

export default function ModelRanking({ models = [] }) {
  return <div className="models-card"><div className="card-title"><div><span className="step">03</span><div><h3>Model ranking</h3><p>Active shortlist by fit and cost</p></div></div></div><div className="model-list">{models.map((model, i) => <div className="model-row" key={model.id || model.displayName || i}><span className={`model-icon m${i % 3}`}>{String(i + 1)}</span><span>{model.displayName || model.name || String(model)}</span><span className="enabled"><i /> Rank</span></div>)}</div></div>;
}
