import React, { useEffect, useState } from "react";
import { History } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { api } from "../lib/api";
import { loadExchangeRates, setCurrency } from "../store";

export default function HistoryView() {
  const dispatch = useDispatch();
  const selectedCurrency = useSelector((state) => state.currency.selected);
  const exchangeRates = useSelector((state) => state.currency.rates);
  const [days, setDays] = useState(30);
  const [selectedModel, setSelectedModel] = useState("all");
  const [items, setItems] = useState([]);
  useEffect(() => { api("/api/v1/recommendations?limit=100").then((data) => setItems(data.items || [])).catch(() => {}); }, []);
  useEffect(() => {
    dispatch(loadExchangeRates());
  }, [dispatch]);
  const cutoff = Date.now() - days * 86400000;
  const recent = items.filter((item) => new Date(item.createdAt).getTime() >= cutoff);
  const modelOptions = [...new Set(recent.map((item) => item.result?.recommendedModelName || item.recommendedModel || "Unknown"))].sort();
  const filtered = selectedModel === "all" ? recent : recent.filter((item) => (item.result?.recommendedModelName || item.recommendedModel || "Unknown") === selectedModel);
  const counts = filtered.reduce((all, item) => { const name = item.result?.recommendedModelName || item.recommendedModel || "Unknown"; all[name] = (all[name] || 0) + 1; return all; }, {});
  const chart = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const tokens = filtered.reduce((total, item) => total + (item.result?.estimatedInputTokens || 0), 0);
  const costUsd = filtered.reduce((total, item) => total + (item.result?.estimatedInputCostUsd || 0), 0);
  const cost = costUsd;
  const currencies = ["USD", "INR", "GBP", "EUR", "JPY", "CNY"];
  const currencyOptions = currencies.map((currency) => ({ value: currency, label: currency }));
  const formatCost = (currency) => new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(cost * (currency === "USD" ? 1 : exchangeRates?.[currency] || 0));
  return (
      <section className="page-panel history-page container-fluid">
      <div className="page-intro row align-items-center g-3"><p className="col-lg">Track recommendations, tokens, and prompt cost in your preferred currency.</p><div className="history-controls col-lg-auto d-flex flex-wrap gap-2"><HistoryDropdown value={selectedCurrency} options={currencyOptions} onChange={(currency) => dispatch(setCurrency(currency))} /><HistoryDropdown value={`Last ${days} days`} options={[7, 15, 30].map((value) => ({ value, label: `Last ${value} days` }))} onChange={setDays} /><HistoryDropdown value={selectedModel === "all" ? "All models" : selectedModel} options={[{ value: "all", label: "All models" }, ...modelOptions.map((value) => ({ value, label: value }))]} onChange={setSelectedModel} /></div></div>
      <div className="history-stats row g-3"><div className="col-md-4"><div className="h-100"><small>RECOMMENDATIONS</small><b>{filtered.length}</b></div></div><div className="col-md-4"><div className="h-100"><small>INPUT TOKENS</small><b>{tokens.toLocaleString()}</b></div></div><div className="col-md-4"><div className="history-cost-card h-100"><small>TOTAL INPUT COST ({selectedCurrency})</small><b>{selectedCurrency === "USD" || exchangeRates?.[selectedCurrency] ? formatCost(selectedCurrency) : "—"}</b>{selectedCurrency !== "USD" && <span className="history-cost-source">Converted from {formatCost("USD")} USD</span>}</div></div></div>
      <div className="history-chart">{chart.length ? chart.map(([name, count]) => <div className="chart-row" key={name}><span>{name}</span><div><i style={{ width: `${Math.max(8, (count / chart[0][1]) * 100)}%` }} /></div><b>{count}</b></div>) : <p className="empty-history">No recommendations in this period.</p>}</div>
    </section>
  );
}

function HistoryDropdown({ value, options, onChange }) {
  return <select className="form-select history-bootstrap-select" value={options.find((option) => option.label === value)?.value ?? value} onChange={(event) => onChange(event.target.value)} aria-label={value}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
}
