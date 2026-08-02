import React, { useEffect, useState } from "react";
import { ChevronDown, History } from "lucide-react";
import { api } from "../lib/api";

export default function HistoryView() {
  const [days, setDays] = useState(30);
  const [selectedModel, setSelectedModel] = useState("all");
  const [items, setItems] = useState([]);
  useEffect(() => { api("/api/v1/recommendations?limit=100").then((data) => setItems(data.items || [])).catch(() => {}); }, []);
  const cutoff = Date.now() - days * 86400000;
  const recent = items.filter((item) => new Date(item.createdAt).getTime() >= cutoff);
  const modelOptions = [...new Set(recent.map((item) => item.result?.recommendedModelName || item.recommendedModel || "Unknown"))].sort();
  const filtered = selectedModel === "all" ? recent : recent.filter((item) => (item.result?.recommendedModelName || item.recommendedModel || "Unknown") === selectedModel);
  const counts = filtered.reduce((all, item) => { const name = item.result?.recommendedModelName || item.recommendedModel || "Unknown"; all[name] = (all[name] || 0) + 1; return all; }, {});
  const chart = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const tokens = filtered.reduce((total, item) => total + (item.result?.estimatedInputTokens || 0), 0);
  const costUsd = filtered.reduce((total, item) => total + (item.result?.estimatedInputCostUsd || 0), 0);
  const cost = costUsd;
  return (
    <section className="page-panel history-page">
      <div className="page-intro"><p>Track recommendations, tokens, and prompt cost in USD.</p><div className="history-controls"><HistoryDropdown value={`Last ${days} days`} options={[7, 15, 30].map((value) => ({ value, label: `Last ${value} days` }))} onChange={setDays} /><HistoryDropdown value={selectedModel === "all" ? "All models" : selectedModel} options={[{ value: "all", label: "All models" }, ...modelOptions.map((value) => ({ value, label: value }))]} onChange={setSelectedModel} /></div></div>
      <div className="history-stats"><div><small>RECOMMENDATIONS</small><b>{filtered.length}</b></div><div><small>INPUT TOKENS</small><b>{tokens.toLocaleString()}</b></div><div><small>TOTAL INPUT COST (USD)</small><b>${cost.toFixed(6)}</b></div></div>
      <div className="history-chart">{chart.length ? chart.map(([name, count]) => <div className="chart-row" key={name}><span>{name}</span><div><i style={{ width: `${Math.max(8, (count / chart[0][1]) * 100)}%` }} /></div><b>{count}</b></div>) : <p className="empty-history">No recommendations in this period.</p>}</div>
    </section>
  );
}

function HistoryDropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  return <div className="history-dropdown"><button className="history-dropdown-trigger" onClick={() => setOpen(!open)}>{value}<ChevronDown size={15} /></button>{open && <div className="history-dropdown-menu">{options.map((option) => <button key={option.value} onClick={() => { onChange(option.value); setOpen(false); }}><span className={String(value) === option.label ? "dropdown-check selected" : "dropdown-check"}>{String(value) === option.label ? "✓" : ""}</span>{option.label}</button>)}</div>}</div>;
}
