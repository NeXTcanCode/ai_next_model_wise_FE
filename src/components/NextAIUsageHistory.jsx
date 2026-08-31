import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, Coins, MessageSquare, Settings2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { api } from "../lib/api";
import { loadExchangeRates, setCurrency } from "../store";

export default function NextAIUsageHistory() {
  const dispatch = useDispatch();
  const currency = useSelector((state) => state.currency.selected);
  const rates = useSelector((state) => state.currency.rates);
  const [days, setDays] = useState(7);
  const [events, setEvents] = useState([]);
  const [inputRate, setInputRate] = useState("0");
  const [outputRate, setOutputRate] = useState("0");
  useEffect(() => { dispatch(loadExchangeRates()); }, [dispatch]);
  useEffect(() => { api(`/api/v1/usage/history?days=${days}`).then((data) => setEvents(data.events || [])).catch(() => setEvents([])); }, [days]);
  const totals = useMemo(() => events.reduce((result, event) => ({ input: result.input + event.inputTokens, output: result.output + event.outputTokens, units: result.units + event.weightedUnits }), { input: 0, output: 0, units: 0 }), [events]);
  // User-entered rates are provider prices in USD per one million tokens.
  const costUsd = (totals.input * Number(inputRate || 0) + totals.output * Number(outputRate || 0)) / 1000000;
  const converted = costUsd * (currency === "USD" ? 1 : rates?.[currency] || 0);
  const daily = Object.entries(events.reduce((all, event) => { const day = new Date(event.createdAt).toLocaleDateString(); all[day] = (all[day] || 0) + event.weightedUnits; return all; }, {})).sort((a, b) => new Date(a[0]) - new Date(b[0]));
  const formatMoney = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 6 });
  return <section className="page-panel next-ai-history"><div className="page-intro"><div><span className="eyebrow">NEXT AI / USAGE</span><h2>Usage history</h2><p>Track NeXT AI tokens, messages, and estimated spend.</p></div><div className="history-controls"><select value={days} onChange={(event) => setDays(event.target.value)}><option value="7">Last 7 days</option><option value="15">Last 15 days</option><option value="30">Last 30 days</option></select><select value={currency} onChange={(event) => dispatch(setCurrency(event.target.value))}>{["USD", "INR", "EUR", "JPY", "CNY"].map((item) => <option key={item}>{item}</option>)}</select></div></div><div className="next-ai-history__cards"><div><MessageSquare size={18} /><small>MESSAGES</small><b>{events.length}</b></div><div><BarChart3 size={18} /><small>TOTAL TOKENS</small><b>{(totals.input + totals.output).toLocaleString()}</b></div><div><Coins size={18} /><small>ESTIMATED SPEND</small><b>{formatMoney.format(converted)}</b></div></div><div className="next-ai-history__pricing"><Settings2 size={17} /><div><b>Cost settings</b><span>Set your own price per 1M tokens. Current values are used for this estimate.</span></div><label>Input / 1M <input type="number" min="0" step="any" value={inputRate} onChange={(event) => setInputRate(event.target.value)} /></label><label>Output / 1M <input type="number" min="0" step="any" value={outputRate} onChange={(event) => setOutputRate(event.target.value)} /></label></div><div className="next-ai-history__chart"><h3>Usage by day</h3>{daily.length ? daily.map(([day, units]) => <div className="next-ai-history__bar" key={day}><span>{day}</span><div><i style={{ width: `${Math.max(4, (units / Math.max(...daily.map((item) => item[1]))) * 100)}%` }} /></div><b>{units.toLocaleString()}</b></div>) : <p>No NeXT AI usage in this period.</p>}</div></section>;
}
