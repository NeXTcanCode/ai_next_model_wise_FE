import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Download,
  MessageSquare,
  TrendingUp,
  Zap,
} from "lucide-react";
import { api } from "../lib/api";

const ranges = [7, 15, 30];
const number = (value) => Number(value) || 0;
const tokensFromUsage = (usage) => ({
  input: number(usage?.prompt_tokens ?? usage?.input_tokens),
  output: number(usage?.completion_tokens ?? usage?.output_tokens),
});
const sum = (items) =>
  items.reduce(
    (total, item) => ({
      input: total.input + number(item.inputTokens),
      output: total.output + number(item.outputTokens),
    }),
    { input: 0, output: 0 }
  );
const dayKey = (date) => new Date(date).toISOString().slice(0, 10);
const formatDay = (day) =>
  new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
import { useLocation, useNavigate } from "react-router-dom";
export default function NextAIUsageHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const isNextAIHistory = location.pathname === "/next_ai/history";
  const [days, setDays] = useState(7);
  const [events, setEvents] = useState([]);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api(`/api/v1/usage/history?days=${Math.min(60, days * 2)}`).catch(() => ({
        events: [],
      })),
      api("/api/v1/chats").catch(() => ({ chats: [] })),
    ])
      .then(([usage, chatData]) => {
        setEvents(usage.events || []);
        setChats(chatData.chats || []);
      })
      .finally(() => setLoading(false));
  }, [days]);
  const cutoff = Date.now() - days * 86400000;
  const periodEvents = useMemo(
    () =>
      events.filter((event) => new Date(event.createdAt).getTime() >= cutoff),
    [events, cutoff]
  );
  const totals = useMemo(() => sum(periodEvents), [periodEvents]);
  const totalTokens = totals.input + totals.output;
  const daily = useMemo(
    () =>
      Object.entries(
        periodEvents.reduce((result, event) => {
          const key = dayKey(event.createdAt);
          result[key] =
            (result[key] || 0) +
            number(event.inputTokens) +
            number(event.outputTokens);
          return result;
        }, {})
      ).sort(([a], [b]) => a.localeCompare(b)),
    [periodEvents]
  );
  const weekly = useMemo(() => {
    const groups = {};
    daily.forEach(([day, value]) => {
      const date = new Date(`${day}T00:00:00`);
      const week = new Date(date);
      week.setDate(date.getDate() - date.getDay());
      const key = dayKey(week);
      groups[key] = (groups[key] || 0) + value;
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [daily]);
  const previousTotals = useMemo(() => {
    const cutoff = Date.now() - days * 86400000;
    return sum(
      events.filter((event) => {
        const time = new Date(event.createdAt).getTime();
        return time < cutoff;
      })
    );
  }, [events, days]);
  const conversations = useMemo(
    () =>
      chats
        .map((chat) => {
          const usage = sum(
            (chat.messages || []).map((message) =>
              tokensFromUsage(message.usage)
            )
          );
          return { ...chat, ...usage, total: usage.input + usage.output };
        })
        .filter((chat) => chat.total > 0)
        .sort((a, b) => b.total - a.total),
    [chats]
  );
  const peak = daily.reduce(
    (best, item) => (item[1] > (best?.[1] || 0) ? item : best),
    null
  );
  const maxDaily = Math.max(1, ...daily.map(([, value]) => value));
  const change = totalTokens - (previousTotals.input + previousTotals.output);
  const changePercent =
    previousTotals.input + previousTotals.output
      ? Math.round(
          (change / (previousTotals.input + previousTotals.output)) * 100
        )
      : null;
  const exportCsv = () => {
    const rows = [
      [
        "conversation",
        "messages",
        "input_tokens",
        "output_tokens",
        "total_tokens",
        "last_active",
      ],
      ...conversations.map((chat) => [
        chat.title,
        chat.messages?.length || 0,
        chat.input,
        chat.output,
        chat.total,
        chat.updatedAt,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `next-ai-usage-${days}d.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className="page-panel next-ai-history">
      <div className="page-intro">
        <div>
          {isNextAIHistory && (
            <button
              type="button"
              className="next-ai-history__back"
              onClick={() => navigate("/next_ai")}
            >
              ← Back to NeXT AI
            </button>
          )}
          <span className="eyebrow">NEXT AI / USAGE</span>
          <h2>Usage history</h2>
          <p>Understand your NeXT AI usage over time.</p>
        </div>
        <div className="history-controls">
          {ranges.map((value) => (
            <button
              type="button"
              className={days === value ? "active" : ""}
              onClick={() => setDays(value)}
              key={value}
            >
              Last {value}d
            </button>
          ))}
          <button
            type="button"
            className="next-ai-history__export"
            onClick={exportCsv}
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>
      {loading ? (
        <p className="next-ai-history__empty">Loading usage…</p>
      ) : (
        <>
          <div className="next-ai-history__cards">
            <Metric
              icon={<MessageSquare />}
              label="MESSAGES"
              value={periodEvents.length.toLocaleString()}
            />
            <Metric
              icon={<BarChart3 />}
              label="TOTAL TOKENS"
              value={totalTokens.toLocaleString()}
            />
            <Metric
              icon={<TrendingUp />}
              label="DAILY AVERAGE"
              value={Math.round(
                totalTokens / Math.max(days, 1)
              ).toLocaleString()}
            />
            <Metric
              icon={<Zap />}
              label="PEAK DAY"
              value={peak ? `${peak[1].toLocaleString()} tokens` : "—"}
            />
          </div>
          <div className="next-ai-history__grid">
            <div className="next-ai-history__chart">
              <div className="next-ai-history__section-heading">
                <div>
                  <span className="eyebrow">DAILY VIEW</span>
                  <h3>Usage trend</h3>
                </div>
                {peak && <small>Peak: {formatDay(peak[0])}</small>}
              </div>
              {daily.length ? (
                <div className="next-ai-history__bars">
                  {daily.map(([day, value]) => (
                    <div className="next-ai-history__day" key={day}>
                      <b>{value.toLocaleString()}</b>
                      <i
                        style={{
                          height: `${Math.max(8, (value / maxDaily) * 100)}%`,
                        }}
                      />
                      <span>{formatDay(day)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No NeXT AI usage in this period.</p>
              )}
            </div>
            <div className="next-ai-history__trend">
              <span className="eyebrow">WEEKLY SUMMARY</span>
              <h3>Usage trends</h3>
              {weekly.length ? (
                weekly.map(([week, value], index) => (
                  <div className="next-ai-history__week" key={week}>
                    <span>Week {index + 1}</span>
                    <b>{value.toLocaleString()} tokens</b>
                    {index > 0 && (
                      <small>
                        {weekly[index - 1][1]
                          ? `${
                              value >= weekly[index - 1][1] ? "+" : ""
                            }${Math.round(
                              ((value - weekly[index - 1][1]) /
                                weekly[index - 1][1]) *
                                100
                            )}%`
                          : ""}
                      </small>
                    )}
                  </div>
                ))
              ) : (
                <p>No weekly data yet.</p>
              )}
              <p className="next-ai-history__insight">
                {peak
                  ? `Your usage peaked on ${formatDay(peak[0])}${
                      weekly.length > 1
                        ? " and is trending across the selected period"
                        : ""
                    }.`
                  : "Your usage insights will appear after your first response."}
              </p>
            </div>
          </div>
          <div className="next-ai-history__comparison">
            <div>
              <span className="eyebrow">PERIOD COMPARISON</span>
              <h3>Current vs previous {days} days</h3>
            </div>
            <strong>
              {change >= 0 ? "+" : ""}
              {change.toLocaleString()} tokens{" "}
              {changePercent !== null &&
                `(${changePercent >= 0 ? "+" : ""}${changePercent}%)`}
            </strong>
            <p>
              Current: {totalTokens.toLocaleString()} · Previous:{" "}
              {Math.max(
                0,
                previousTotals.input + previousTotals.output
              ).toLocaleString()}{" "}
              tokens
            </p>
          </div>
          <div className="next-ai-history__conversations">
            <div className="next-ai-history__section-heading">
              <div>
                <span className="eyebrow">RECENT CONVERSATIONS</span>
                <h3>Per-conversation usage</h3>
              </div>
            </div>
            {conversations.length ? (
              <div className="next-ai-history__table">
                {conversations.map((chat) => (
                  <div className="next-ai-history__conversation" key={chat.id}>
                    <MessageSquare size={16} />
                    <span>
                      <b>{chat.title}</b>
                      <small>
                        {chat.messages?.length || 0} messages ·{" "}
                        {chat.input.toLocaleString()} input ·{" "}
                        {chat.output.toLocaleString()} output
                      </small>
                    </span>
                    <strong>{chat.total.toLocaleString()} tokens</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p>No conversation usage in this period.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
function Metric({ icon, label, value }) {
  return (
    <div>
      <span>{icon}</span>
      <small>{label}</small>
      <b>{value}</b>
    </div>
  );
}
