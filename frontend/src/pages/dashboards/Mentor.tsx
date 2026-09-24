import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Award, BarChart3, Bell, CalendarCheck, Check, Clock, Flag, Home, Inbox, LayoutGrid,
  MessageSquare, Star, TrendingUp, Users, Video, XCircle,
} from "lucide-react";
import DashShell from "../../components/DashShell";
import {
  Avatar, Badge, EmptyState, Input, Modal, ProgressBar, ProgressRing,
  Select, Spinner, Stat, TextArea, useToast,
} from "../../components/ui";
import { api, safe } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { mockMentorOverview } from "../../lib/mock";
import { MessagesPanel, NotifsPanel, dueIn, fmt } from "../../components/dashbits";
import { InsightsSection, SessionsPanel, UpcomingStrip } from "../../components/sessions";
import MReports from "./mentor/Reports";

export default function Mentor() {
  const { user } = useAuth();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") || "overview";
  const [ov, setOv] = useState<any>(mockMentorOverview);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState("");

  const load = async () => {
    const r = await safe(() => api.overview(), mockMentorOverview);
    const data = { ...r.data, allocations: r.data.allocations || r.data.interns || [] };
    setOv(data);
    if (!sel && data.allocations[0]) setSel(data.allocations[0]._id);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const setTab = (t: string) => { setSp(t === "overview" ? {} : { tab: t }); window.scrollTo(0, 0); };

  const pending = (ov.reviewQueue?.updates?.length || 0) + (ov.reviewQueue?.tasks?.length || 0);
  const titles: Record<string, [string, string]> = {
    overview: [`Welcome back, ${user?.name?.split(" ")[0] || "Mentor"}`, "Your interns, this week."],
    interns: ["My Interns", "Progress, tasks, attendance and feedback per intern."],
    reviews: ["Review Queue", "Daily updates and tasks awaiting your verdict."],
    reports: ["Reports", "Cohort analytics and trends."],
    messages: ["Messages", "Conversations with your interns."],
    notifications: ["Notifications", "Everything that needs you."],
  };
  const nav = [
    { id: "overview", label: "Overview", icon: <Home size={20} /> },
    { id: "interns", label: "My Interns", icon: <Users size={20} /> },
    { id: "reviews", label: "Review Queue", icon: <Inbox size={20} />, badge: pending || undefined },
    { id: "reports", label: "Reports", icon: <BarChart3 size={20} /> },
    { id: "messages", label: "Messages", icon: <MessageSquare size={20} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={20} /> },
  ];
  const [title, subtitle] = titles[tab] || titles.overview;

  return (
    <DashShell roleLabel="Mentor" nav={nav} active={tab} onNav={setTab} title={title} subtitle={subtitle} thin>
      {loading ? <div className="grid place-items-center py-24"><Spinner light /></div> : (
        <>
          {tab === "overview" && <MOverview ov={ov} go={setTab} pick={(id: string) => { setSel(id); setTab("interns"); }} openSessions={() => { setSp({ tab: "interns", sub: "sessions" }); window.scrollTo(0, 0); }} />}
          {tab === "interns" && <Interns key={sp.get("sub") || "hub"} ov={ov} sel={sel} setSel={setSel} reload={load} sub0={sp.get("sub") || "updates"} />}
          {tab === "reviews" && <Reviews ov={ov} reload={load} pick={(id: string) => { setSel(id); setTab("interns"); }} />}
          {tab === "reports" && <MReports />}
          {tab === "messages" && <MessagesPanel empty="Intern conversations will appear here once students are allocated to you." />}
          {tab === "notifications" && <NotifsPanel />}
        </>
      )}
    </DashShell>
  );
}

function MOverview({ ov, go, pick, openSessions }: any) {
  const allocs = ov.allocations || [];
  const ups = ov.reviewQueue?.updates || [];
  const tks = ov.reviewQueue?.tasks || [];
  const top = [...allocs].sort((a: any, b: any) => (a.summary?.progress ?? 0) - (b.summary?.progress ?? 0)).slice(0, 3);
  const avgAtt = allocs.length ? Math.round(allocs.reduce((s: number, a: any) => s + (a.summary?.attendancePct || 0), 0) / allocs.length) : 0;
  const avgProg = allocs.length ? Math.round(allocs.reduce((s: number, a: any) => s + (a.summary?.progress || 0), 0) / allocs.length) : 0;

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<Users size={19} />} label="Active interns" value={allocs.length} tone="purple" />
        <Stat icon={<Inbox size={19} />} label="Pending reviews" value={ups.length + tks.length} sub={`${ups.length} updates · ${tks.length} tasks`} tone="amber" />
        <Stat icon={<CalendarCheck size={19} />} label="Avg attendance" value={`${avgAtt}%`} tone="green" />
        <Stat icon={<TrendingUp size={19} />} label="Avg progress" value={`${avgProg}%`} tone="blue" />
      </div>
      <InsightsSection onPick={pick} />
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 dark:text-cream-dim uppercase tracking-wide">Needs attention</p>
            <button onClick={() => go("reviews")} className="text-xs font-bold text-violet-600 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-200">Open queue</button>
          </div>
          <div className="mt-3 space-y-2.5">
            {top.map((a: any) => (
              <button key={a._id} onClick={() => pick(a._id)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-left transition">
                <Avatar name={a.student?.name} avatar={a.student?.avatar} color={a.student?.color} size={38} />
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-sm text-slate-900 dark:text-cream truncate">{a.student?.name}</span>
                  <span className="block text-xs text-slate-500 dark:text-cream-dim truncate">{a.internship?.title}</span>
                </span>
                <span className="w-24"><ProgressBar value={a.summary?.progress || 0} /></span>
                <span className="text-xs font-bold text-slate-500 dark:text-cream-dim tabular w-9">{a.summary?.progress || 0}%</span>
              </button>
            ))}
            {top.length === 0 && <p className="text-sm text-slate-400 dark:text-cream-dim/70">No interns yet.</p>}
          </div>
        </div>
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
          <p className="text-xs font-bold text-slate-500 dark:text-cream-dim uppercase tracking-wide">Review inbox</p>
          <div className="mt-3 space-y-2.5">
            {ups.slice(0, 3).map((u: any) => (
              <div key={u._id} className="flex items-center gap-2.5 text-sm rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 px-3 py-2.5">
                <Clock size={14} className="text-violet-500 shrink-0" />
                <p className="flex-1 truncate"><b>{u.studentName}</b> logged {fmt(u.date)} <span className="text-slate-400 dark:text-cream-dim/70">· {u.completed?.slice(0, 60)}</span></p>
              </div>
            ))}
            {tks.slice(0, 3).map((t: any) => (
              <div key={t._id} className="flex items-center gap-2.5 text-sm rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 px-3 py-2.5">
                <LayoutGrid size={14} className="text-sky-500 shrink-0" />
                <p className="flex-1 truncate"><b>{t.studentName}</b> submitted <b>{t.title}</b></p>
              </div>
            ))}
            {ups.length + tks.length === 0 && <p className="text-sm text-slate-400 dark:text-cream-dim/70">Inbox zero. Lovely.</p>}
            {ups.length + tks.length > 0 && (
              <button onClick={() => go("reviews")} className="btn-hero w-full py-2.5 bg-[#14141a] dark:bg-cream text-white dark:text-[#14141a] text-sm font-cabin">Review now</button>
            )}
          </div>
        </div>
      </div>
      <UpcomingStrip onOpen={openSessions} />
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-slate-500 dark:text-cream-dim uppercase tracking-wide">All interns</p>
          <button onClick={() => go("interns")} className="text-xs font-bold text-violet-600 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-200">Manage</button>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {allocs.map((a: any) => (
            <button key={a._id} onClick={() => pick(a._id)} className="text-left rounded-2xl border border-slate-200 dark:border-white/10 p-4 card-hover">
              <div className="flex items-center gap-2.5">
                <Avatar name={a.student?.name} avatar={a.student?.avatar} color={a.student?.color} size={40} />
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-900 dark:text-cream truncate">{a.student?.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-cream-dim truncate">{a.internship?.companyName}</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-cream-dim mb-1"><span>Progress</span><span className="tabular">{a.summary?.progress}%</span></div>
                <ProgressBar value={a.summary?.progress || 0} />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-cream-dim/70 mt-2 tabular">Attendance {a.summary?.attendancePct}% · {a.internship?.title}</p>
            </button>
          ))}
          {allocs.length === 0 && <p className="text-sm text-slate-400 dark:text-cream-dim/70">No interns allocated yet.</p>}
        </div>
      </div>
    </div>
  );
}

function Interns({ ov, sel, setSel, reload, sub0 }: any) {
  const allocs = ov.allocations || [];
  const [detail, setDetail] = useState<any>(null);
  const [sub, setSub] = useState(sub0 || "updates");

  const cur = allocs.find((a: any) => a._id === sel) || allocs[0];
  useEffect(() => {
    if (!cur) return;
    api.allocation(cur._id).then(setDetail).catch(() => setDetail(null));
  }, [cur?._id]);

  if (!cur)
    return <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl"><EmptyState icon={<Users size={22} />} title="No interns" body="Students allocated to you will appear here." /></div>;

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {allocs.map((a: any) => (
          <button key={a._id} onClick={() => setSel(a._id)}
            className={`flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full border text-sm font-bold transition ${cur._id === a._id ? "bg-[#14141a] dark:bg-cream text-white dark:text-[#14141a] border-[#14141a]" : "bg-white dark:bg-card border-slate-200 dark:border-white/10 text-slate-700 dark:text-cream-dim"}`}>
            <Avatar name={a.student?.name} avatar={a.student?.avatar} color={a.student?.color} size={30} />
            {a.student?.name}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={cur.student?.name} avatar={cur.student?.avatar} color={cur.student?.color} size={54} />
          <div className="flex-1 min-w-[200px]">
            <p className="font-extrabold text-lg text-slate-900 dark:text-cream">{cur.student?.name}</p>
            <p className="text-sm text-slate-500 dark:text-cream-dim">{cur.internship?.title} · {cur.internship?.companyName}</p>
            <p className="text-xs text-slate-400 dark:text-cream-dim/70">{cur.student?.email} {cur.student?.phone && `· ${cur.student.phone}`}</p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-center">
              <ProgressRing value={cur.summary?.progress || 0} size={86}>
                <span className="text-sm font-extrabold text-slate-900 dark:text-cream tabular">{cur.summary?.progress || 0}%</span>
              </ProgressRing>
              <p className="text-[10px] font-bold text-slate-500 dark:text-cream-dim mt-1 uppercase">Progress</p>
            </div>
            <div className="text-center">
              <ProgressRing value={cur.summary?.attendancePct || 0} size={86} color="#10b981" track="#e6f7ef">
                <span className="text-sm font-extrabold text-slate-900 dark:text-cream tabular">{cur.summary?.attendancePct || 0}%</span>
              </ProgressRing>
              <p className="text-[10px] font-bold text-slate-500 dark:text-cream-dim mt-1 uppercase">Attend.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { id: "updates", label: "Daily Work", icon: <Clock size={14} /> },
          { id: "tasks", label: "Tasks", icon: <LayoutGrid size={14} /> },
          { id: "attendance", label: "Attendance", icon: <CalendarCheck size={14} /> },
          { id: "milestones", label: "Milestones", icon: <Flag size={14} /> },
          { id: "feedback", label: "Feedback", icon: <Star size={14} /> },
          { id: "sessions", label: "Sessions", icon: <Video size={14} /> },
        ].map((t) => (
          <button key={t.id} onClick={() => setSub(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition ${sub === t.id ? "bg-[#14141a] dark:bg-cream text-white dark:text-[#14141a]" : "bg-white dark:bg-card border border-slate-200 dark:border-white/10 text-slate-600 dark:text-cream-dim"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {sub === "updates" && <ReviewUpdates items={detail?.updates || []} reload={() => { api.allocation(cur._id).then(setDetail).catch(() => {}); reload(); }} />}
      {sub === "tasks" && <ReviewTasks items={(detail?.tasks || []).filter((t: any) => t.status === "review")} aid={cur._id} reload={() => { api.allocation(cur._id).then(setDetail).catch(() => {}); reload(); }} />}
      {sub === "attendance" && <AttTable rows={detail?.attendance || []} />}
      {sub === "milestones" && <MilestonesEditor aid={cur._id} items={detail?.milestones || []} reload={() => { api.allocation(cur._id).then(setDetail).catch(() => {}); reload(); }} />}
      {sub === "feedback" && <FeedbackForm aid={cur._id} items={detail?.feedback || []} reload={() => { api.allocation(cur._id).then(setDetail).catch(() => {}); reload(); }} />}
      {sub === "sessions" && <SessionsPanel allocationId={cur._id} role="mentor" />}
    </div>
  );
}

export function ReviewUpdates({ items, reload }: any) {
  const toast = useToast();
  const [comment, setComment] = useState<Record<string, string>>({});
  const [localItems, setLocalItems] = useState<any[]>(items);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  useEffect(() => { setLocalItems(items); }, [items]);
  if (!localItems.length) return <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl"><EmptyState icon={<Clock size={22} />} title="All caught up" body="No daily updates waiting for review." /></div>;
  const act = async (id: string, ok: boolean) => {
    const previous = localItems.find((item) => item._id === id);
    const nextStatus = ok ? "approved" : "returned";
    setBusy((p) => ({ ...p, [id]: true }));
    setLocalItems((current) => current.map((item) => item._id === id
      ? { ...item, reviewStatus: nextStatus, mentorComment: comment[id] || "" }
      : item));
    toast("info", ok ? "Update marked completed." : "Update marked for rework.");
    try {
      await api.reviewUpdate(id, { reviewStatus: ok ? "approved" : "returned", mentorComment: comment[id] || "" });
      reload();
    } catch {
      if (previous) setLocalItems((current) => current.map((item) => item._id === id ? previous : item));
      toast("error", "Could not review — is the server running?");
    } finally { setBusy((p) => ({ ...p, [id]: false })); }
  };
  return (
    <div className="space-y-3">
      {localItems.map((u: any) => (
        <div key={u._id} className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-extrabold text-slate-900 dark:text-cream">{u.studentName || ""} <span className="text-sm font-medium text-slate-400 dark:text-cream-dim/70 tabular">· {fmt(u.date)}{u.hours ? ` · ${u.hours}h` : ""}</span></p>
            <Badge tone={u.reviewStatus === "approved" ? "green" : u.reviewStatus === "returned" ? "red" : "amber"}>
              {u.reviewStatus === "approved" ? "Completed" : u.reviewStatus === "returned" ? "Returned" : "Needs review"}
            </Badge>
          </div>
          <div className="mt-2.5 space-y-1.5 text-sm">
            <p><b className="text-slate-700 dark:text-cream-dim">Worked on:</b> <span className="text-slate-600 dark:text-cream-dim">{u.workedOn}</span></p>
            <p><b className="text-slate-700 dark:text-cream-dim">Completed:</b> <span className="text-slate-600 dark:text-cream-dim">{u.completed}</span></p>
            {u.learned && <p><b className="text-slate-700 dark:text-cream-dim">Learned:</b> <span className="text-slate-600 dark:text-cream-dim">{u.learned}</span></p>}
            {u.blockers && <p><b className="text-slate-700 dark:text-cream-dim">Blockers:</b> <span className="text-slate-600 dark:text-cream-dim">{u.blockers}</span></p>}
          </div>
          {(!u.reviewStatus || u.reviewStatus === "pending") && <div className="flex gap-2 mt-3">
            <input value={comment[u._id] || ""} onChange={(e) => setComment((p) => ({ ...p, [u._id]: e.target.value }))}
              placeholder="Feedback comment (optional)…" className="field-light flex-1 px-3.5 py-2.5 text-sm" />
            <button disabled={busy[u._id]} onClick={() => act(u._id, true)} className="btn-hero px-4 py-2.5 bg-emerald-500 text-white text-sm font-cabin inline-flex items-center gap-1.5 disabled:opacity-60"><Check size={15} /> Approve</button>
            <button disabled={busy[u._id]} onClick={() => act(u._id, false)} className="btn-hero px-4 py-2.5 bg-rose-500 text-white text-sm font-cabin inline-flex items-center gap-1.5 disabled:opacity-60"><XCircle size={15} /> Return</button>
          </div>}
          {u.mentorComment && <p className="mt-3 text-sm text-slate-500 dark:text-cream-dim"><b>Mentor feedback:</b> {u.mentorComment}</p>}
        </div>
      ))}
    </div>
  );
}

export function ReviewTasks({ items, aid, reload }: any) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  if (!items.length && !aid) return <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl"><EmptyState icon={<LayoutGrid size={22} />} title="Nothing in review" body="Tasks your interns submit will land here." /></div>;
  const act = async (t: any, ok: boolean) => {
    try {
      await api.patchTask(t._id, { status: ok ? "completed" : "in_progress" });
      toast("success", ok ? "Task approved." : "Task sent back for rework.");
      reload();
    } catch { toast("error", "Could not review — is the server running?"); }
  };
  const add = async () => {
    if (!title.trim()) return;
    try { await api.createTask(aid, { title: title.trim(), description: description.trim(), assignedBy: "mentor" }); setTitle(""); setDescription(""); reload(); toast("success", "Task assigned."); }
    catch { toast("error", "Could not assign — is the server running?"); }
  };
  return (
    <div className="space-y-3">
      {aid && (
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-2">
          <div className="flex gap-2 items-end">
            <Input tone="light" label="Task name" placeholder="e.g. Build the API endpoint" value={title} onChange={(e: any) => setTitle(e.target.value)} />
            <button onClick={add} className="btn-hero px-5 py-2.5 bg-[#14141a] dark:bg-cream text-white dark:text-[#14141a] text-sm font-cabin whitespace-nowrap">Assign</button>
          </div>
          <TextArea tone="light" label="Task details" placeholder="Describe the expected work, deliverables, or acceptance criteria…" value={description} onChange={(e: any) => setDescription(e.target.value)} />
        </div>
      )}
      {items.map((t: any) => (
        <div key={t._id} className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px]">
            <p className="font-extrabold text-slate-900 dark:text-cream">{t.title}</p>
            <p className="text-xs text-slate-500 dark:text-cream-dim mt-0.5">{t.studentName || ""} {t.dueDate && `· Due ${fmt(t.dueDate)}`}</p>
            {t.description && <p className="text-sm text-slate-500 dark:text-cream-dim mt-1">{t.description}</p>}
          </div>
          {t.status === "completed" ? <Badge tone="green"><Check size={13} className="inline mr-1" /> Completed</Badge> : (
            <>
              <Badge tone={t.status === "review" ? "amber" : "slate"}>{t.status.replace("_", " ")}</Badge>
              {t.status === "review" && <button onClick={() => act(t, true)} className="btn-hero px-4 py-2 bg-emerald-500 text-white text-sm font-cabin inline-flex items-center gap-1.5"><Check size={15} /> Approve</button>}
              {t.status === "review" && <button onClick={() => act(t, false)} className="btn-hero px-4 py-2 bg-rose-500 text-white text-sm font-cabin inline-flex items-center gap-1.5"><XCircle size={15} /> Rework</button>}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function AttTable({ rows }: any) {
  const sorted = [...(rows || [])].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 31);
  if (!sorted.length) return <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl"><EmptyState icon={<CalendarCheck size={22} />} title="No attendance yet" body="Attendance logs will appear here." /></div>;
  const tone: Record<string, string> = { present: "green", absent: "red", leave: "amber", holiday: "slate" };
  return (
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl divide-y divide-slate-100 dark:divide-white/5 max-w-2xl">
      {sorted.map((r: any, i: number) => (
        <div key={i} className="flex items-center justify-between px-5 py-3">
          <span className="text-sm font-bold text-slate-800 dark:text-cream tabular">{fmt(r.date)}</span>
          <Badge tone={tone[r.status] || "slate"}>{r.status}</Badge>
        </div>
      ))}
    </div>
  );
}

function MilestonesEditor({ aid, items, reload }: any) {
  const toast = useToast();
  const [f, setF] = useState({ title: "", description: "", dueDate: "" });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const add = async () => {
    if (!f.title.trim()) return toast("error", "Give the milestone a title.");
    try { await api.createMilestone(aid, f); setF({ title: "", description: "", dueDate: "" }); reload(); toast("success", "Milestone created."); }
    catch { toast("error", "Could not create — is the server running?"); }
  };
  const bump = async (m: any, d: number) => {
    const percent = Math.min(100, Math.max(0, (m.percent || 0) + d));
    try { await api.patchMilestone(m._id, { percent }); reload(); }
    catch { toast("error", "Could not update."); }
  };
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-3.5 h-fit">
        <p className="font-extrabold text-slate-900 dark:text-cream">New milestone</p>
        <Input tone="light" label="Title" value={f.title} onChange={(e: any) => set("title", e.target.value)} />
        <TextArea tone="light" label="Description" value={f.description} onChange={(e: any) => set("description", e.target.value)} />
        <Input tone="light" label="Due date" type="date" value={f.dueDate} onChange={(e: any) => set("dueDate", e.target.value)} />
        <button onClick={add} className="btn-hero w-full py-2.5 bg-primary text-white text-sm font-cabin">Create Milestone</button>
      </div>
      <div className="space-y-3">
        {items.map((m: any) => (
          <div key={m._id} className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-extrabold text-slate-900 dark:text-cream">{m.title}</p>
              <Badge tone={m.status === "completed" ? "green" : m.status === "in_progress" ? "purple" : "slate"}>{m.status.replace("_", " ")}</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-cream-dim mt-0.5">{m.description} · Due {fmt(m.dueDate)}</p>
            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => bump(m, -25)} className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 font-bold hover:bg-slate-200 dark:hover:bg-white/15">−</button>
              <div className="flex-1"><ProgressBar value={m.percent} /></div>
              <span className="text-xs font-bold text-slate-500 dark:text-cream-dim tabular w-9">{m.percent}%</span>
              <button onClick={() => bump(m, 25)} className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 font-bold hover:bg-slate-200 dark:hover:bg-white/15">+</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl"><EmptyState icon={<Flag size={22} />} title="No milestones" body="Define the first milestone for this intern." /></div>}
      </div>
    </div>
  );
}

function FeedbackForm({ aid, items, reload }: any) {
  const toast = useToast();
  const [f, setF] = useState({ technical: 4, communication: 4, punctuality: 4, comments: "" });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  const submit = async () => {
    try {
      await api.mentorFeedback(aid, f);
      setF({ technical: 4, communication: 4, punctuality: 4, comments: "" });
      reload();
      toast("success", "Feedback submitted.");
    } catch { toast("error", "Could not submit — is the server running?"); }
  };
  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-5 items-start">
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4">
        <p className="font-extrabold text-slate-900 dark:text-cream">Fortnightly feedback</p>
        {(["technical", "communication", "punctuality"] as const).map((k) => (
          <div key={k} className="flex items-center gap-3">
            <span className="w-32 text-sm font-bold text-slate-600 dark:text-cream-dim capitalize">{k}</span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => set(k, n)}>
                  <Star size={22} className={n <= (f as any)[k] ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-white/40"} />
                </button>
              ))}
            </div>
          </div>
        ))}
        <TextArea tone="light" label="Comments" value={f.comments} onChange={(e: any) => set("comments", e.target.value)} />
        <button onClick={submit} className="btn-hero w-full py-2.5 bg-primary text-white text-sm font-cabin">Submit Feedback</button>
      </div>
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
        <p className="font-extrabold text-slate-900 dark:text-cream mb-3">Past feedback ({items.length})</p>
        <div className="space-y-3">
          {items.map((item: any) => (
            <div key={item._id} className="rounded-xl border border-slate-200 dark:border-white/10 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-900 dark:text-cream">{item.fromName || "Mentor feedback"}</p>
                <span className="text-xs text-slate-500 dark:text-cream-dim">{fmt(item.createdAt)}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-600 dark:text-cream-dim">
                <span>Technical: <b>{item.technical || 0}/5</b></span>
                <span>Communication: <b>{item.communication || 0}/5</b></span>
                <span>Punctuality: <b>{item.punctuality || 0}/5</b></span>
              </div>
              {item.message && <p className="text-sm text-slate-600 dark:text-cream-dim mt-2">{item.message}</p>}
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-slate-400 dark:text-cream-dim/70">No feedback has been sent yet.</p>}
        </div>
      </div>
    </div>
  );
}

function Reviews({ ov, reload, pick }: any) {
  const ups = ov.reviewQueue?.updates || [];
  const allUpdates = ov.updateHistory || ups;
  const tks = ov.reviewQueue?.tasks || [];
  const allTasks = ov.taskHistory || tks;
  return (
    <div className="grid lg:grid-cols-2 gap-5 items-start">
      <div>
        <p className="font-extrabold text-slate-900 dark:text-cream mb-3 flex items-center gap-2"><Clock size={16} /> Daily updates ({allUpdates.length}) <span className="text-xs font-medium text-slate-500 dark:text-cream-dim">{ups.length} awaiting review</span></p>
        <ReviewUpdates items={allUpdates} reload={reload} />
        {allUpdates.length > 0 && <button onClick={() => pick(allUpdates[0].allocationId)} className="text-xs font-bold text-violet-600 dark:text-violet-300 mt-2">Open intern →</button>}
      </div>
      <div>
        <p className="font-extrabold text-slate-900 dark:text-cream mb-3 flex items-center gap-2"><LayoutGrid size={16} /> Tasks ({allTasks.length}) <span className="text-xs font-medium text-slate-500 dark:text-cream-dim">{tks.length} awaiting review</span></p>
        <ReviewTasks items={allTasks} aid={tks[0]?.allocationId || allTasks[0]?.allocationId} reload={reload} />
      </div>
    </div>
  );
}
