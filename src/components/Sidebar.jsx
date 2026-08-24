import React from "react";
import {
  Bot,
  History,
  Home,
  LogOut,
  Settings2,
  Trophy,
  Sparkles,
  X,
} from "lucide-react";

export default function Sidebar({
  user,
  menu,
  setMenu,
  view,
  setView,
  usage,
  onLogout,
}) {
  const items = [
    ["recommend", Home, "Recommend"],
    ["history", History, "History"],
    ["models", Settings2, "My models"],
    ["ranking", Trophy, "Ranking"],
    ["bot", Bot, "NeXT AI"],
  ];

  return (
    <aside className={menu ? "sidebar open" : "sidebar"}>
      <div className="brand">
        <span className="brand-mark">
          <Sparkles size={17} />
        </span>
        <span>modelwise</span>
        <button
          className="sidebar-close"
          onClick={() => setMenu(false)}
          aria-label="Close sidebar"
        >
          <X size={17} />
        </button>
      </div>
      <div className="workspace">
        <span className="avatar">
          {(user.name || "U").slice(0, 2).toUpperCase()}
        </span>
        <span>
          <b>{user.name}</b>
        </span>
        {/* <ChevronDown size={15} /> */}
      </div>
      <nav>
        {items.map(([key, Icon, label]) => (
          <Nav
            key={key}
            icon={<Icon size={17} />}
            label={label}
            active={view === key}
            onClick={() => {
              setView(key);
              setMenu(false);
            }}
          />
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div
          className={`usage ${
            usage.percent >= 90
              ? "usage-critical"
              : usage.percent >= 70
              ? "usage-warning"
              : ""
          }`}
        >
          <div>
            <span>Weekly usage</span>
            <b>{usage.percent || 0}% used</b>
          </div>
          <div className="progress">
            <i
              style={{
                width: `${Math.min(100, usage.percent || 0)}%`,
              }}
            />
          </div>
          <small>
            {usage.resetAt
              ? `Resets in ${Math.min(
                  7,
                  Math.max(
                    0,
                    Math.ceil((new Date(usage.resetAt) - Date.now()) / 86400000)
                  )
                )} days `
              : "No usage yet"}
          </small>
          {/* <details className="usage-limits">
            <summary>Fair usage limits</summary>
            <ol>
              <li>Up to 2 messages per minute</li>
              <li>Up to 15 messages per day</li>
              <li>Up to 50 messages per week</li>
              <li>Longer prompts and responses use more of your allowance</li>
            </ol>
          </details> */}
        </div>
        <button className="nav-item" onClick={onLogout}>
          <LogOut size={17} /> Sign out
        </button>
      </div>
    </aside>
  );
}

function Nav({ icon, label, active, onClick }) {
  return (
    <button
      className={active ? "nav-item active" : "nav-item"}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
