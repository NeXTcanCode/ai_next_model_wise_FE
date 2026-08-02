import React from "react";
import { Plus, Trash2 } from "lucide-react";

export default function Models({ models, addModel, removeModel, onAddModel }) {
  return (
    <section className="page-panel">
      <div className="page-intro"><p>Keep the models you reach for in one place. Recommendations will only use enabled models.</p><button className="primary small" onClick={onAddModel}><Plus size={16} /> Add model</button></div>
      {models.map((m, i) => <div className="managed-row" key={m}><span className={`model-icon m${i % 3}`}>{m[0]}</span><div><b>{m}</b></div><span className="enabled"><i /> Enabled</span><button className="delete" onClick={() => removeModel(m)}><Trash2 size={16} /></button></div>)}
    </section>
  );
}
