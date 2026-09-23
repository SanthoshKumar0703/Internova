import { useEffect, useRef, useState } from "react";
import { Bell, MessageSquare, Send } from "lucide-react";
import { Avatar, EmptyState, useToast } from "./ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useSocket } from "../lib/useSocket";

export const fmt = (s?: string) => {
  if (!s) return "—";
  const d = new Date(s.length <= 10 ? s + "T00:00:00" : s);
  return isNaN(+d) ? s : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
export const dueIn = (s?: string) => {
  if (!s) return "";
  const days = Math.ceil((+new Date(s + "T00:00:00") - +new Date(new Date().toDateString())) / 86400000);
  if (days < 0) return `${-days}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
};

export function MessagesPanel({ empty = "No conversations yet." }: { empty?: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const [threads, setThreads] = useState<any[]>([]);
  const [active, setActive] = useState("");
  const [text, setText] = useState("");
  const [typing, setTyping] = useState("");
  const typeTimer = useRef<any>(null);
  const activeRef = useRef("");
  activeRef.current = active;
  const { online, send: wsSend } = useSocket((e) => {
    if (e.t === "message" && e.threadId === activeRef.current) {
      setThreads((p: any[]) => p.map((t) => (t._id === e.threadId ? { ...t, messages: [...(t.messages || []), e.message] } : t)));
      setTyping("");
    } else if (e.t === "message") {
      load();
    } else if (e.t === "typing" && e.threadId === activeRef.current) {
      setTyping(e.fromName || "Someone");
      clearTimeout(typeTimer.current);
      typeTimer.current = setTimeout(() => setTyping(""), 2500);
    }
  });

  const load = async () => {
    try {
      const t = await api.threads();
      setThreads(t);
      if (!active && t.length) setActive(t[0]._id);
    } catch {}
  };
  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i); }, []);

  const cur = threads.find((t) => t._id === active);
  const send = async () => {
    if (!text.trim() || !cur) return;
    try {
      await api.sendMessage(cur._id, text.trim());
      setText("");
      load();
    } catch { toast("error", "Could not send — is the server running?"); }
  };

  if (!threads.length)
    return <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl"><EmptyState icon={<MessageSquare size={22} />} title="No conversations" body={empty} /></div>;

  return (
    <div className="grid md:grid-cols-[260px_1fr] gap-4 h-[560px]">
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-2.5 space-y-1.5 overflow-y-auto">
        {threads.map((t) => (
          <button key={t._id} onClick={() => setActive(t._id)}
            className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition ${active === t._id ? "bg-violet-100 dark:bg-violet-500/15" : "hover:bg-slate-50 dark:hover:bg-white/5"}`}>
            <span className="relative shrink-0"><Avatar name={t.other?.name} avatar={t.other?.avatar} color={t.other?.color} size={38} />
              {(t.participants || []).some((p: string) => p !== user?._id && online.includes(p)) && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-card" />}</span>
            <span className="min-w-0">
              <span className="block font-bold text-sm text-slate-900 dark:text-cream truncate">{t.other?.name}</span>
              <span className="block text-xs text-slate-500 dark:text-cream-dim truncate">{t.subject} · {t.other?.role}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 font-bold text-slate-900 dark:text-cream">{cur?.other?.name} <span className="text-xs font-medium text-slate-400 dark:text-cream-dim/70">· {cur?.subject}</span></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {(cur?.messages || []).map((m: any, i: number) => {
            const mine = m.fromId === user?._id;
            return (
              <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm ${mine ? "bg-primary text-white rounded-br-md" : "bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-cream rounded-bl-md"}`}>
                  {m.text}
                  <p className={`text-[10px] mt-1 tabular ${mine ? "text-white/70" : "text-slate-400 dark:text-cream-dim/70"}`}>{fmt(m.at)}</p>
                </div>
              </div>
            );
          })}
        </div>
        {typing !== "" && <p className="px-4 pt-2 text-xs text-slate-400 dark:text-cream-dim/70 italic">{typing} is typing…</p>}
        <div className="p-3 border-t border-slate-100 dark:border-white/5 flex gap-2">
          <input value={text} onChange={(e) => { setText(e.target.value); if (cur) wsSend({ t: "typing", threadId: cur._id }); }} onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message…" className="field-light flex-1 px-4 py-2.5 text-sm" />
          <button onClick={send} className="btn-hero px-5 py-2.5 bg-primary text-white text-sm font-cabin inline-flex items-center gap-1.5"><Send size={14} /> Send</button>
        </div>
      </div>
    </div>
  );
}

export function NotifsPanel() {
  const [items, setItems] = useState<any[]>([]);
  const load = async () => {
    try { const r = await api.notifications(); setItems(r.items || []); } catch {}
  };
  useEffect(() => { load(); }, []);
  const read = async (id?: string) => {
    try { id ? await api.readNotif(id) : await api.readAllNotifs(); load(); } catch {}
  };
  return (
    <div className="max-w-2xl space-y-3">
      <div className="flex justify-end">
        <button onClick={() => read()} className="text-sm font-bold text-violet-600 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-200">Mark all as read</button>
      </div>
      {items.map((n) => (
        <div key={n._id} className={`bg-white dark:bg-card border rounded-2xl p-4 flex gap-3 ${n.kind === "announcement" && !n.read ? "border-primary/60 shadow-[0_0_24px_-8px_rgba(123,57,252,0.5)]" : n.read ? "border-slate-200 dark:border-white/10 opacity-70" : "border-violet-200 dark:border-violet-400/30"}`}>
          <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${n.read ? "bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-cream-dim/70" : "bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300"}`}>
            <Bell size={16} />
          </span>
          <div className="flex-1">
            <p className="font-bold text-slate-900 dark:text-cream text-sm flex items-center gap-2">{n.title}{n.kind === "announcement" && <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/15 text-primary dark:text-primary-soft">Announcement</span>}</p>
            <p className="text-sm text-slate-500 dark:text-cream-dim">{n.body}</p>
            <p className="text-[11px] text-slate-400 dark:text-cream-dim/70 mt-1 tabular">{fmt(n.createdAt)}</p>
          </div>
          {!n.read && <button onClick={() => read(n._id)} className="text-xs font-bold text-violet-600 dark:text-violet-300 self-start">Mark read</button>}
        </div>
      ))}
      {items.length === 0 && <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl"><EmptyState icon={<Bell size={22} />} title="No notifications" body="Role-relevant updates will appear here." /></div>}
    </div>
  );
}
