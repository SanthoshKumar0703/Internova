import { useEffect, useState } from "react";
import {
  AlertTriangle, BellRing, CalendarPlus, Check, Clock, Pencil, Plus,
  Sparkles, Video, X,
} from "lucide-react";
import { Badge, EmptyState, Input, ProgressRing, TextArea, useToast } from "./ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { dueIn } from "./dashbits";
import { downloadICS, gcalUrl } from "../lib/calendar";

export const fmtDT = (s?: string) => {
  if (!s) return "—";
  const d = new Date(s.length <= 10 ? s + "T00:00:00" : s);
  if (isNaN(+d)) return s;
  return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · ${d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`;
};

const nowLocal = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
};

const sessTone: Record<string, string> = { proposed: "amber", confirmed: "blue", completed: "green", cancelled: "slate" };
const scoreColor = (v: number) => (v >= 80 ? "#10b981" : v >= 60 ? "#f59e0b" : "#f43f5e");

const toCal = (s: any) => ({
  title: `InterNova: ${s.title}`,
  date: (s.date || "").slice(0, 10),
  details: `${fmtDT(s.date)} · ${s.durationMin || 30} min${s.meetLink ? ` · Join: ${s.meetLink}` : ""}${s.description ? `\n${s.description}` : ""}`,
  location: s.meetLink || "",
});


export function SessionsPanel({ allocationId, role }: { allocationId: string; role: "student" | "mentor" | "company" }) {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ title: "", date: "", durationMin: 30, meetLink: "", description: "" });
  const [completing, setCompleting] = useState("");
  const [notes, setNotes] = useState("");
  const [actions, setActions] = useState<{ text: string; done: boolean }[]>([]);
  const [newAction, setNewAction] = useState("");
  const [editing, setEditing] = useState("");
  const [ef, setEf] = useState({ date: "" });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const load = async () => {
    try { setItems(await api.sessions(allocationId)); }
    catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [allocationId]);

  const upcoming = items.filter((s) => ["proposed", "confirmed"].includes(s.status) && (s.date || "") >= nowLocal());
  const history = items.filter((s) => !upcoming.includes(s)).reverse();

  const submit = async () => {
    const when = f.date.length === 16 ? f.date + ":00" : f.date;
    if (!f.title.trim() || when.length < 16) return toast("error", "Add a title and pick a date & time.");
    setBusy(true);
    try {
      await api.createSession({
        allocationId, title: f.title.trim(), description: f.description.trim(),
        date: when, durationMin: Number(f.durationMin) || 30, meetLink: f.meetLink.trim(),
      });
      toast("success", role === "student" ? "Proposed! Your mentor will confirm the slot." : "Session scheduled — the intern has been notified.");
      setF({ title: "", date: "", durationMin: 30, meetLink: "", description: "" });
      setShowForm(false);
      load();
    } catch (e: any) { toast("error", e.detail || "Could not save."); }
    finally { setBusy(false); }
  };

  const act = async (id: string, patch: any, msg: string) => {
    try { await api.patchSession(id, patch); toast("success", msg); load(); }
    catch (e: any) { toast("error", e.detail || "Could not update."); }
  };

  const startComplete = (s: any) => {
    setCompleting(s._id);
    setNotes(s.notes || "");
    setActions((s.actionItems || []).map((a: any) => ({ text: a.text, done: !!a.done })));
    setNewAction("");
  };
  const saveComplete = async (id: string) => {
    await act(id, { status: "completed", notes, actionItems: actions.filter((a) => a.text.trim()) }, "Session completed — notes saved.");
    setCompleting("");
  };

  const card = (s: any) => {
    const mine = s.proposedBy === user?._id;
    const other = role === "student" ? s.mentor?.name : role === "mentor" ? s.student?.name : `${s.student?.name} × ${s.mentor?.name}`;
    const isUp = upcoming.includes(s);
    return (
      <div key={s._id} className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
        <div className="flex flex-wrap items-start gap-3">
          <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${s.status === "completed" ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : s.status === "cancelled" ? "bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-cream-dim/70" : "bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300"}`}>
            <Video size={18} />
          </span>
          <div className="flex-1 min-w-[200px]">
            <p className="font-extrabold text-slate-900 dark:text-cream">{s.title}</p>
            <p className="text-xs text-slate-500 dark:text-cream-dim mt-0.5 flex items-center gap-1.5 flex-wrap">
              <Clock size={12} /> {fmtDT(s.date)} · {s.durationMin || 30} min · with {other || "—"}
            </p>
            {s.description && <p className="text-sm text-slate-500 dark:text-cream-dim mt-1.5">{s.description}</p>}
          </div>
          <Badge tone={sessTone[s.status] || "slate"}>{s.status}</Badge>
        </div>

        {s.notes && (
          <div className="mt-3 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-400/20 px-3.5 py-2.5 text-sm">
            <b className="text-violet-700 dark:text-violet-300">Session notes:</b> <span className="text-slate-600 dark:text-cream-dim">{s.notes}</span>
          </div>
        )}
        {(s.actionItems || []).length > 0 && (
          <div className="mt-3 space-y-1.5">
            {(s.actionItems || []).map((a: any, i: number) => (
              <p key={i} className={`text-sm flex items-center gap-2 ${a.done ? "text-slate-400 dark:text-cream-dim/70 line-through" : "text-slate-700 dark:text-cream-dim"}`}>
                {a.done ? <Check size={14} className="text-emerald-500 shrink-0" /> : <span className="w-3.5 h-3.5 rounded border-2 border-slate-300 dark:border-white/40 shrink-0 ml-px" />}
                {a.text}
              </p>
            ))}
          </div>
        )}

        {editing === s._id ? (
          <div className="mt-3 grid sm:grid-cols-[220px_1fr_auto] gap-2">
            <Input tone="light" type="datetime-local" value={ef.date} onChange={(e: any) => setEf((p) => ({ ...p, date: e.target.value }))} />
            <span className="flex gap-2">
              <button onClick={() => { act(s._id, { date: ef.date.length === 16 ? ef.date + ":00" : ef.date }, "Session updated."); setEditing(""); }} className="btn-hero px-4 py-2 bg-primary text-white text-sm font-cabin">Save</button>
              <button onClick={() => setEditing("")} className="btn-hero px-4 py-2 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-cream-dim text-sm font-cabin">Cancel</button>
            </span>
          </div>
        ) : completing === s._id ? (
          <div className="mt-3 space-y-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4">
            <TextArea tone="light" label="Session notes" placeholder="What was covered? Key decisions…" value={notes} onChange={(e: any) => setNotes(e.target.value)} />
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-cream-dim mb-1.5">Action items</p>
              <div className="space-y-1.5">
                {actions.map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button onClick={() => setActions((p) => p.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}
                      className={`w-5 h-5 rounded-md grid place-items-center border-2 shrink-0 ${a.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-white/40"}`}>
                      {a.done && <Check size={12} />}
                    </button>
                    <span className={`flex-1 text-sm ${a.done ? "line-through text-slate-400" : "text-slate-700 dark:text-cream-dim"}`}>{a.text}</span>
                    <button onClick={() => setActions((p) => p.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-500"><X size={14} /></button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input value={newAction} onChange={(e) => setNewAction(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newAction.trim()) { setActions((p) => [...p, { text: newAction.trim(), done: false }]); setNewAction(""); } }}
                    placeholder="Add action item, Enter to add…" className="field-light flex-1 px-3 py-2 text-sm" />
                  <button onClick={() => { if (newAction.trim()) { setActions((p) => [...p, { text: newAction.trim(), done: false }]); setNewAction(""); } }} className="btn-hero px-4 py-2 bg-slate-200 dark:bg-white/15 text-slate-700 dark:text-cream-dim text-sm font-cabin">Add</button>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => saveComplete(s._id)} className="btn-hero px-5 py-2 bg-emerald-500 text-white text-sm font-cabin">Save & Complete</button>
              <button onClick={() => setCompleting("")} className="btn-hero px-4 py-2 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-cream-dim text-sm font-cabin">Back</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 mt-3.5">
            {s.meetLink && s.status === "confirmed" && (
              <a href={s.meetLink} target="_blank" rel="noreferrer" className="btn-hero inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white text-sm font-cabin"><Video size={14} /> Join now</a>
            )}
            {isUp && (
              <a href={gcalUrl(toCal(s))} target="_blank" rel="noreferrer" title="Add to Google Calendar"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-violet-600 dark:text-violet-300 bg-violet-100 dark:bg-violet-500/15 hover:bg-violet-200 transition">
                <CalendarPlus size={14} /> Google Cal
              </a>
            )}
            {role === "student" && s.status === "proposed" && mine && (
              <button onClick={() => act(s._id, { status: "cancelled" }, "Proposal withdrawn.")} className="btn-hero px-4 py-2 bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 text-sm font-cabin">Withdraw</button>
            )}
            {role === "mentor" && s.status === "proposed" && (
              <>
                <button onClick={() => act(s._id, { status: "confirmed" }, "Session confirmed — the intern has been notified.")} className="btn-hero inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white text-sm font-cabin"><Check size={14} /> Confirm</button>
                <button onClick={() => act(s._id, { status: "cancelled" }, "Session declined.")} className="btn-hero px-4 py-2 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-cream-dim text-sm font-cabin">Decline</button>
              </>
            )}
            {role === "mentor" && s.status === "confirmed" && (
              <>
                <button onClick={() => startComplete(s)} className="btn-hero inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-cabin"><Check size={14} /> Complete with notes</button>
                <button onClick={() => { setEditing(s._id); setEf({ date: (s.date || "").slice(0, 16) }); }} className="btn-hero inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-cream-dim text-sm font-cabin"><Pencil size={13} /> Reschedule</button>
                <button onClick={() => act(s._id, { status: "cancelled" }, "Session cancelled.")} className="btn-hero px-4 py-2 bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 text-sm font-cabin">Cancel</button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <p className="text-sm text-slate-400 dark:text-cream-dim/70">Loading sessions…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="font-extrabold text-slate-900 dark:text-cream flex items-center gap-2">
          <Video size={17} className="text-primary" />
          {role === "company" ? "Mentor sessions" : role === "student" ? "Sessions with your mentor" : "Mentoring sessions"}
          <span className="text-xs font-bold text-slate-400 dark:text-cream-dim/70 tabular">({upcoming.length} upcoming)</span>
        </p>
        <div className="flex gap-2">
          {upcoming.length > 0 && (
            <button onClick={() => downloadICS("internova-sessions", upcoming.map(toCal))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-violet-600 dark:text-violet-300 bg-violet-100 dark:bg-violet-500/15 hover:bg-violet-200 transition">
              <CalendarPlus size={14} /> Export .ics
            </button>
          )}
          {role !== "company" && (
            <button onClick={() => setShowForm((v) => !v)} className="btn-hero inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-cabin">
              <Plus size={15} /> {role === "student" ? "Propose Session" : "Schedule Session"}
            </button>
          )}
        </div>
      </div>

      {showForm && role !== "company" && (
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5 grid md:grid-cols-2 gap-3.5">
          <div className="md:col-span-2"><Input tone="light" label="Title" placeholder={role === "student" ? "e.g. Doubt clearing — charts sprint" : "e.g. Weekly 1:1 — sprint review"} value={f.title} onChange={(e: any) => set("title", e.target.value)} /></div>
          <Input tone="light" label="Date & time" type="datetime-local" value={f.date} onChange={(e: any) => set("date", e.target.value)} />
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-cream-dim mb-1.5">Duration</p>
            <select value={f.durationMin} onChange={(e) => set("durationMin", Number(e.target.value))} className="field-light w-full px-3 py-2.5 text-sm">
              {[15, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} minutes</option>)}
            </select>
          </div>
          <div className="md:col-span-2 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-400/20 px-3.5 py-2.5 text-sm text-violet-700 dark:text-violet-300">
            A private Jitsi room will be generated automatically for this session.
          </div>
          <div className="md:col-span-2"><TextArea tone="light" label="Agenda (optional)" placeholder="What will you cover?" value={f.description} onChange={(e: any) => set("description", e.target.value)} /></div>
          <div className="md:col-span-2 flex gap-2">
            <button onClick={submit} disabled={busy} className="btn-hero px-6 py-2.5 bg-primary text-white text-sm font-cabin disabled:opacity-60">
              {busy ? "Saving…" : role === "student" ? "Send Proposal" : "Schedule & Notify"}
            </button>
            {role === "student" && <p className="text-xs text-slate-400 dark:text-cream-dim/70 self-center">Your mentor confirms the slot — you'll get an email + notification.</p>}
          </div>
        </div>
      )}

      {upcoming.length === 0 && history.length === 0 && (
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl">
          <EmptyState icon={<Video size={22} />} title="No sessions yet"
            body={role === "student" ? "Propose a time to meet your mentor — doubts, reviews, career chats." : role === "mentor" ? "Schedule 1:1s to keep every intern unblocked and growing." : "Sessions between mentors and interns will appear here."} />
        </div>
      )}
      {upcoming.length > 0 && <div className="space-y-3">{upcoming.map(card)}</div>}
      {history.length > 0 && (
        <>
          <p className="text-xs font-bold text-slate-500 dark:text-cream-dim uppercase tracking-wide pt-1">Past sessions</p>
          <div className="space-y-3">{history.map(card)}</div>
        </>
      )}
    </div>
  );
}

export function UpcomingStrip({ onOpen }: { onOpen: () => void }) {
  const { user } = useAuth();
  const [items, setItems] = useState<any[] | null>(null);
  useEffect(() => { api.upcomingSessions(14).then(setItems).catch(() => setItems([])); }, []);
  if (!items || items.length === 0) return null;
  const s = items[0];
  const withWhom = user?.role === "student" ? s.mentor?.name : user?.role === "mentor" ? s.student?.name : `${s.student?.name} × ${s.mentor?.name}`;
  return (
    <div className="rounded-2xl p-[1.5px] bg-gradient-to-br from-primary via-magenta to-primary">
      <div className="bg-white dark:bg-card rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300 grid place-items-center shrink-0"><Video size={18} /></span>
        <div className="flex-1 min-w-[180px]">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-cream-dim/70">
            Next session{(() => { const d = dueIn((s.date || "").slice(0, 10)); return d ? ` · ${d}` : ""; })()}
          </p>
          <p className="font-extrabold text-slate-900 dark:text-cream">{s.title}</p>
          <p className="text-xs text-slate-500 dark:text-cream-dim">{fmtDT(s.date)} · {s.durationMin || 30} min · with {withWhom}</p>
        </div>
        {s.meetLink && s.status === "confirmed" && (
          <a href={s.meetLink} target="_blank" rel="noreferrer" className="btn-hero px-4 py-2 bg-emerald-500 text-white text-sm font-cabin">Join</a>
        )}
        <button onClick={onOpen} className="btn-hero px-4 py-2 bg-[#14141a] dark:bg-cream text-white dark:text-[#14141a] text-sm font-cabin">
          View all{items.length > 1 ? ` (${items.length})` : ""}
        </button>
      </div>
    </div>
  );
}


export function InsightsSection({ onPick }: { onPick: (allocationId: string) => void }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { api.insightsOverview().then(setRows).catch(() => setRows([])); }, []);
  if (!rows || rows.length === 0) return null;
  const atRisk = rows.filter((r) => r.score < 70).length;
  return (
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="font-extrabold text-slate-900 dark:text-cream flex items-center gap-2">
            <Sparkles size={16} className="text-primary" /> Weekly health
          </p>
          <p className="text-xs text-slate-500 dark:text-cream-dim mt-0.5">Auto-generated from attendance, updates, tasks & sessions — lowest score first.</p>
        </div>
        {atRisk > 0 && <Badge tone="red">{atRisk} need{atRisk === 1 ? "s" : ""} attention</Badge>}
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
        {rows.map((r) => (
          <button key={r.allocationId} onClick={() => onPick(r.allocationId)} className="text-left rounded-2xl border border-slate-200 dark:border-white/10 p-4 card-hover flex gap-3.5">
            <ProgressRing value={r.score} size={66} stroke={8} color={scoreColor(r.score)} track="#e9e4f2">
              <span className="text-base font-extrabold text-slate-900 dark:text-cream tabular">{r.score}</span>
            </ProgressRing>
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-sm text-slate-900 dark:text-cream truncate">{r.internName}</span>
              <span className="block text-[11px] text-slate-500 dark:text-cream-dim truncate">{r.role} · {r.companyName}</span>
              <span className="block text-[11px] text-slate-500 dark:text-cream-dim tabular mt-1">
                {r.hours7}h · {r.attendance7?.pct}% att · {r.tasksDone7} tasks · {r.updates7} updates
              </span>
              {(r.risks || [])[0] ? (
                <span className="flex items-start gap-1 text-[11px] text-rose-600 dark:text-rose-300 mt-1.5 leading-snug">
                  <AlertTriangle size={12} className="mt-px shrink-0" /> {(r.risks || [])[0]}
                </span>
              ) : (r.highlights || [])[0] ? (
                <span className="flex items-start gap-1 text-[11px] text-emerald-600 dark:text-emerald-300 mt-1.5 leading-snug">
                  <Sparkles size={12} className="mt-px shrink-0" /> {(r.highlights || [])[0]}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function AdminRemindersCard() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<number | null>(null);
  const send = async () => {
    setBusy(true);
    try {
      const r = await api.sessionReminders();
      setLast(r.reminded);
      toast("success", r.reminded ? `Reminders sent for ${r.reminded} session${r.reminded === 1 ? "" : "s"}.` : "Nothing due — no confirmed session starts within 24h.");
    } catch { toast("error", "Could not send reminders."); }
    finally { setBusy(false); }
  };
  return (
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5 mb-5 max-w-3xl flex flex-wrap items-center gap-4">
      <span className="w-11 h-11 rounded-xl bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300 grid place-items-center shrink-0"><BellRing size={19} /></span>
      <div className="flex-1 min-w-[200px]">
        <p className="font-extrabold text-slate-900 dark:text-cream">Session reminders</p>
        <p className="text-xs text-slate-500 dark:text-cream-dim mt-0.5">
          Email + in-app nudges to student & mentor for confirmed sessions starting within 24h. Already-nudged sessions are skipped.
          {last !== null && ` Last run: ${last} sent.`}
        </p>
      </div>
      <button onClick={send} disabled={busy} className="btn-hero px-5 py-2.5 bg-primary text-white text-sm font-cabin disabled:opacity-60">
        {busy ? "Sending…" : "Send reminders"}
      </button>
    </div>
  );
}
