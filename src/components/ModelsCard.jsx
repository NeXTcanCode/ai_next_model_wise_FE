import React from "react";
import { Plus } from "lucide-react";

export default function ModelsCard({ models, onAddModel, onManage }) {
  return <div className="models-card"><div className="card-title"><div><span className="step">02</span><div><h3>Your models</h3><p>We’ll choose from these options</p></div></div><button className="text-button" onClick={onManage}>Manage</button></div><div className="model-list">{models.map((m, i) => <div className="model-row" key={m}><span className={`model-icon m${i % 3}`}>{m[0]}</span><span>{m}</span><span className="enabled"><i /> Enabled</span></div>)}</div><button className="add-model" onClick={onAddModel}><Plus size={15} /> Add another model</button></div>;
}
