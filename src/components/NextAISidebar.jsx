import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, MessageSquare, Plus, Sparkles, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const recent = (chat) => Date.now() - new Date(chat.updatedAt).getTime() <= 7 * 86400000;

export default function NextAISidebar({ activeChatId, onSelectChat, onNewChat, onBack }) {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const refresh = () => api("/api/v1/chats").then((data) => setChats(data.chats || [])).catch(() => setChats([])).finally(() => setLoading(false));
  useEffect(() => { refresh(); const handler = () => refresh(); window.addEventListener("next-ai:chats-changed", handler); return () => window.removeEventListener("next-ai:chats-changed", handler); }, []);
  const groups = useMemo(() => ({ recent: chats.filter(recent), older: chats.filter((chat) => !recent(chat)) }), [chats]);
  const remove = async (event, id) => { event.stopPropagation(); await api(`/api/v1/chats/${id}`, { method: "DELETE" }).catch(() => {}); if (id === activeChatId) onNewChat(); refresh(); };
  return <aside className="next-ai-sidebar"><button type="button" className="next-ai-sidebar__back" onClick={onBack}><ChevronLeft size={16} /> Back to Recommend</button><div className="next-ai-sidebar__title"><span><Sparkles size={17} /></span><b>NeXT AI</b></div><button type="button" className="next-ai-sidebar__new" onClick={onNewChat}><Plus size={16} /> New chat</button><div className="next-ai-sidebar__section"><small>SKILLS</small><button type="button" onClick={() => navigate("/skills")}><Plus size={14} /> Create skill</button></div>{loading ? <p className="next-ai-sidebar__empty">Loading chats…</p> : !chats.length ? <p className="next-ai-sidebar__empty">Your saved chats will appear here.</p> : <><ChatGroup label="RECENT" chats={groups.recent} activeChatId={activeChatId} onSelectChat={onSelectChat} onDelete={remove} /><ChatGroup label="OLDER" chats={groups.older} activeChatId={activeChatId} onSelectChat={onSelectChat} onDelete={remove} /></>}</aside>;
}
function ChatGroup({ label, chats, activeChatId, onSelectChat, onDelete }) { if (!chats.length) return null; return <div className="next-ai-sidebar__section next-ai-sidebar__chats"><small>{label}</small>{chats.map((chat) => <button type="button" className={chat.id === activeChatId ? "active" : ""} key={chat.id} onClick={() => onSelectChat(chat.id)}><MessageSquare size={14} /><span>{chat.title}</span><i onClick={(event) => onDelete(event, chat.id)} aria-label={`Delete ${chat.title}`}><Trash2 size={13} /></i></button>)}</div>; }
