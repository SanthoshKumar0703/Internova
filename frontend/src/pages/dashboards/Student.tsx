import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Award, BadgeCheck, Bell, Briefcase, Building2, CalendarCheck, CalendarPlus, Check, ChevronLeft, ChevronRight,
  Clock, FileText, Flag, FolderOpen, GraduationCap, Home, Inbox, LayoutGrid, MapPin, MessageSquare,
  Plus, Search, Send, Sparkles, TrendingUp, User as UserIcon, Video, X,
} from "lucide-react";
import DashShell from "../../components/DashShell";
import {
  APP_STATUS, Avatar, Badge, EmptyState, Input, JourneyStepper, Modal,
  ProgressBar, ProgressRing, Select, Spinner, Stat, TextArea, useToast,
} from "../../components/ui";
import { api, safe } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { mockInternships, mockStudentOverview, mockTasks } from "../../lib/mock";
import { certificatePdf, downloadBlob } from "../../lib/pdf";
import { downloadICS, gcalUrl } from "../../lib/calendar";
import SReports from "./student/Reports";
import SDocuments from "./student/Documents";
import { useSocket } from "../../lib/useSocket";
import { SessionsPanel, UpcomingStrip } from "../../components/sessions";

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (s?: string) => {
  if (!s) return "—";
  const d = new Date(s.length <= 10 ? s + "T00:00:00" : s);
  return isNaN(+d) ? s : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
const dueIn = (s?: string) => {
  if (!s) return "";
  const days = Math.ceil((+new Date(s + "T00:00:00") - +new Date(new Date().toDateString())) / 86400000);
  if (days < 0) return `${-days}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
};
const priTone: Record<string, string> = { high: "red", medium: "amber", low: "slate" };
const taskCols = [
  { id: "todo", label: "To Do" }, { id: "in_progress", label: "In Progress" },
  { id: "review", label: "Review" }, { id: "completed", label: "Completed" },
];
const nextStatus: Record<string, string> = { todo: "in_progress", in_progress: "review", review: "completed" };

function offlineAttendance(year: number, month: number) {
  const rows: any[] = [];
  const days = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= days; d++) {
    const dt = new Date(year, month, d);
    if (dt.getDay() === 0 || dt.getDay() === 6 || dt > new Date()) continue;
    const h = (d * 7 + month * 3 + year) % 10;
    rows.push({ date: `${year}-${pad(month + 1)}-${pad(d)}`, status: h < 8 ? "present" : h < 9 ? "leave" : "absent" });
  }
  return rows;
}

export default function Student() {
  const { user } = useAuth();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") || "overview";
  const [ov, setOv] = useState<any>(mockStudentOverview);
  const [loading, setLoading] = useState(true);
  const [showOnboard, setShowOnboard] = useState(sp.get("onboarding") === "1");

  const load = async () => {
    const r = await safe(() => api.overview(), mockStudentOverview);
    setOv(r.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const setTab = (t: string) => { setShowOnboard(false); setSp(t === "overview" ? {} : { tab: t }); window.scrollTo(0, 0); };

  const al = ov.allocation;
  const titles: Record<string, [string, string]> = {
    overview: [`Welcome back, ${user?.name?.split(" ")[0] || "there"}`, "Here's your internship at a glance."],
    find: ["Find Internships", "Verified roles matched to your skills."],
    applications: ["My Applications", "Track every application, live."],
    internship: ["My Internship", `${al?.internship?.title || "Your active internship"} · ${al?.internship?.companyName || ""}`],
    reports: ["Reports", "Your growth, visualised."],
    documents: ["Documents", "Resume, offer letters and files."],
    certificate: ["Certificate", "Your verified achievements."],
    profile: ["Profile", "Keep your story sharp."],
    messages: ["Messages", "Talk to your mentor and company."],
    notifications: ["Notifications", "Everything that needs you."],
  };
  const [title, subtitle] = titles[tab] || titles.overview;

  const nav = [
    { id: "overview", label: "Overview", icon: <Home size={20} /> },
    { id: "find", label: "Find Internships", icon: <Search size={20} /> },
    { id: "applications", label: "Applications", icon: <FileText size={20} />, badge: (ov.applications || []).length || undefined },
    { id: "internship", label: "My Internship", icon: <Briefcase size={20} /> },
    { id: "reports", label: "Reports", icon: <TrendingUp size={20} /> },
    { id: "documents", label: "Documents", icon: <FolderOpen size={20} /> },
    { id: "certificate", label: "Certificate", icon: <Award size={20} /> },
    { id: "profile", label: "Profile", icon: <UserIcon size={20} /> },
    { id: "messages", label: "Messages", icon: <MessageSquare size={20} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={20} /> },
  ];

  return (
    <DashShell roleLabel="Student" nav={nav} active={tab} onNav={setTab} title={title} subtitle={subtitle} thin>
      {loading ? <div className="grid place-items-center py-24"><Spinner light /></div> : (
        <>
          {showOnboard && tab === "overview" && (
            <div className="mb-5 rounded-2xl p-5 bg-gradient-to-r from-[#2a0a5e] to-[#4c1d95] text-white flex flex-col md:flex-row md:items-center gap-4 relative overflow-hidden">
              <div className="orb w-64 h-64 bg-primary/40 -top-20 right-10" />
              <span className="w-12 h-12 rounded-2xl bg-white/15 grid place-items-center shrink-0"><Sparkles size={22} /></span>
              <div className="flex-1 relative">
                <p className="font-extrabold text-lg">Complete Your Profile</p>
                <p className="text-sm text-white/75">Add your college, skills and resume to unlock applications and get matched faster.</p>
              </div>
              <button onClick={() => setTab("profile")} className="btn-hero px-6 py-2.5 bg-white text-[#2a0a5e] font-cabin relative">Complete Profile</button>
              <button onClick={() => setShowOnboard(false)} className="absolute top-3 right-3 text-white/60 hover:text-white"><X size={16} /></button>
            </div>
          )}
          {tab === "overview" && <Overview ov={ov} go={setTab} openSessions={() => { setSp({ tab: "internship", sub: "sessions" }); window.scrollTo(0, 0); }} />}
          {tab === "find" && <Find go={setTab} reload={load} />}
          {tab === "applications" && <Applications ov={ov} />}
          {tab === "internship" && <InternshipHub key={sp.get("sub") || "hub"} al={al} reload={load} sub0={sp.get("sub") || "tasks"} />}
          {tab === "reports" && <SReports />}
          {tab === "documents" && <SDocuments allocationId={al?._id || ""} />}
          {tab === "certificate" && <Certificates ov={ov} />}
          {tab === "profile" && <ProfileSec reload={load} />}
          {tab === "messages" && <MessagesSec />}
          {tab === "notifications" && <NotifsSec />}
        </>
      )}
    </DashShell>
  );
}

function Overview({ ov, go, openSessions }: any) {
  const al = ov.allocation;
  const s = al?.summary;
  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
          {al ? (
            <div className="flex flex-col md:flex-row gap-5">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone="green">Active</Badge>
                  <span className="text-xs text-slate-500 dark:text-cream-dim">{fmt(al.startDate)} → {fmt(al.endDate)}</span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-cream mt-2">{al.internship?.title}</h3>
                <p className="text-sm text-slate-500 dark:text-cream-dim flex items-center gap-1.5 mt-1">
                  <Building2 size={14} /> {al.internship?.companyName} · {al.internship?.mode} · {al.internship?.location}
                </p>
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-cream-dim mb-1.5">
                    <span>Overall progress</span><span className="tabular">{s?.progress ?? al.progress}%</span>
                  </div>
                  <ProgressBar value={s?.progress ?? al.progress} />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                  <div className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-2.5">
                    <p className="text-lg font-extrabold tabular">{s?.tasks.done}/{s?.tasks.total}</p>
                    <p className="text-[11px] text-slate-500 dark:text-cream-dim font-semibold">Tasks done</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-2.5">
                    <p className="text-lg font-extrabold tabular">{s?.milestones.done}/{s?.milestones.total}</p>
                    <p className="text-[11px] text-slate-500 dark:text-cream-dim font-semibold">Milestones</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-2.5">
                    <p className="text-lg font-extrabold tabular">{ov.daysRemaining ?? "—"}</p>
                    <p className="text-[11px] text-slate-500 dark:text-cream-dim font-semibold">Days left</p>
                  </div>
                </div>
              </div>
              <div className="flex md:flex-col items-center justify-center gap-5 shrink-0">
                <div className="text-center">
                  <ProgressRing value={s?.progress ?? 0} size={118} track="#ede9f5">
                    <span className="text-xl font-extrabold text-slate-900 dark:text-cream tabular">{s?.progress ?? 0}%</span>
                  </ProgressRing>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-cream-dim mt-1.5 uppercase tracking-wide">Progress</p>
                </div>
                <div className="text-center">
                  <ProgressRing value={s?.attendancePct ?? 0} size={118} color="#10b981" track="#e6f7ef">
                    <span className="text-xl font-extrabold text-slate-900 dark:text-cream tabular">{s?.attendancePct ?? 0}%</span>
                  </ProgressRing>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-cream-dim mt-1.5 uppercase tracking-wide">Attendance</p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState icon={<Briefcase size={22} />} title="No active internship yet"
              body="Find a role you love and apply — your journey hub will light up here."
              action={<button onClick={() => go("find")} className="btn-hero px-5 py-2.5 bg-primary text-white text-sm font-cabin">Find Internships</button>} />
          )}
        </div>
        <div className="space-y-5">
          {al?.mentor && (
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-500 dark:text-cream-dim uppercase tracking-wide flex items-center gap-1.5"><GraduationCap size={14} /> Your mentor</p>
              <div className="flex items-center gap-3 mt-3">
                <Avatar name={al.mentor.name} avatar={al.mentor.avatar} color={al.mentor.color} size={46} />
                <div>
                  <p className="font-bold text-slate-900 dark:text-cream">{al.mentor.name}</p>
                  <p className="text-xs text-slate-500 dark:text-cream-dim">{(al.mentor.expertise || []).slice(0, 2).join(" · ")}</p>
                </div>
              </div>
              <button onClick={() => go("messages")} className="btn-hero w-full mt-4 py-2.5 bg-[#14141a] dark:bg-cream text-white dark:text-[#14141a] text-sm font-cabin">Message Mentor</button>
            </div>
          )}
          <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-500 dark:text-cream-dim uppercase tracking-wide flex items-center gap-1.5"><Clock size={14} /> Upcoming deadlines</p>
              {(ov.deadlines || []).length > 0 && (
                <button onClick={() => downloadICS("internova-deadlines", (ov.deadlines || []).filter((d: any) => d.due).map((d: any) => ({ title: `${d.kind === "task" ? "Task" : "Milestone"}: ${d.title}`, date: d.due, details: "InterNova deadline" })))}
                  className="text-[11px] font-bold text-violet-600 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-200 inline-flex items-center gap-1"><CalendarPlus size={13} /> Export .ics</button>
              )}
            </div>
            <div className="mt-3 space-y-2.5">
              {(ov.deadlines || []).slice(0, 4).map((d: any, i: number) => (
                <div key={i} className="flex items-center gap-2.5 text-sm">
                  <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${d.kind === "task" ? "bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-300" : "bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300"}`}>
                    {d.kind === "task" ? <LayoutGrid size={15} /> : <Flag size={15} />}
                  </span>
                  <span className="flex-1 truncate font-medium text-slate-800 dark:text-cream">{d.title}</span>
                  <span className="text-xs text-slate-500 dark:text-cream-dim tabular whitespace-nowrap">{dueIn(d.due)}</span>
                  {d.due && <a href={gcalUrl({ title: `${d.kind === "task" ? "Task" : "Milestone"}: ${d.title}`, date: d.due, details: "InterNova deadline" })} target="_blank" rel="noreferrer" title="Add to Google Calendar" className="text-slate-300 dark:text-white/40 hover:text-violet-600 transition"><CalendarPlus size={14} /></a>}
                </div>
              ))}
              {(ov.deadlines || []).length === 0 && <p className="text-sm text-slate-400 dark:text-cream-dim/70">Nothing due. Enjoy the calm.</p>}
            </div>
          </div>
          <UpcomingStrip onOpen={openSessions} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<LayoutGrid size={19} />} label="Tasks completed" value={`${s?.tasks.done ?? 0}/${s?.tasks.total ?? 0}`} tone="blue" />
        <Stat icon={<Flag size={19} />} label="Milestones done" value={`${s?.milestones.done ?? 0}/${s?.milestones.total ?? 0}`} tone="purple" />
        <Stat icon={<CalendarCheck size={19} />} label="Attendance" value={`${s?.attendancePct ?? 0}%`} sub={`${s?.attendance.present ?? 0} of ${s?.attendance.total ?? 0} days`} tone="green" />
        <Stat icon={<FileText size={19} />} label="Applications" value={(ov.applications || []).length} tone="amber" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
          <p className="text-xs font-bold text-slate-500 dark:text-cream-dim uppercase tracking-wide">Recent activity</p>
          <div className="mt-3 space-y-3">
            {(ov.activity || []).slice(0, 5).map((a: any, i: number) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div><p className="text-slate-800 dark:text-cream">{a.text}</p><p className="text-xs text-slate-400 dark:text-cream-dim/70 tabular">{fmt(a.at)}</p></div>
              </div>
            ))}
            {(ov.activity || []).length === 0 && <p className="text-sm text-slate-400 dark:text-cream-dim/70">No activity yet.</p>}
          </div>
        </div>
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 dark:text-cream-dim uppercase tracking-wide">Recent notifications</p>
            <button onClick={() => go("notifications")} className="text-xs font-bold text-violet-600 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-200">View all</button>
          </div>
          <div className="mt-3 space-y-2.5">
            {(ov.notifications || []).slice(0, 4).map((n: any) => (
              <div key={n._id} className="flex gap-2.5 text-sm rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 px-3 py-2.5">
                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                <div><p className="font-semibold text-slate-800 dark:text-cream">{n.title}</p><p className="text-xs text-slate-500 dark:text-cream-dim">{n.body}</p></div>
              </div>
            ))}
            {(ov.notifications || []).length === 0 && <p className="text-sm text-slate-400 dark:text-cream-dim/70">You're all caught up.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Find({ go, reload }: any) {
  const { user } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState("");
  const [mode, setMode] = useState("");
  const [items, setItems] = useState<any[]>(mockInternships);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [cover, setCover] = useState("");
  const [applying, setApplying] = useState(false);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [recs, setRecs] = useState<any[]>([]);

  const search = async () => {
    setBusy(true);
    const r = await safe(() => api.internships({ q, domain, mode }), mockInternships);
    setItems(r.data as any[]);
    setBusy(false);
  };
  useEffect(() => { search(); api.applications().then((a: any[]) => setAppliedIds(a.map((x) => x.internshipId))).catch(() => {}); api.recommended().then(setRecs).catch(() => {}); }, []);

  const domains = useMemo(() => Array.from(new Set((items as any[]).map((i) => i.domain).filter(Boolean))), [items]);
  const fit = (it: any) => {
    const mine = (user?.skills || []).map((s) => s.toLowerCase());
    const hit = (it.skills || []).filter((s: string) => mine.includes(s.toLowerCase()));
    return { pct: it.skills?.length ? Math.round((hit.length / it.skills.length) * 100) : 0, hit };
  };

  const apply = async () => {
    if (!cover.trim()) return toast("error", "Write a short cover letter first.");
    setApplying(true);
    try {
      await api.apply({ internshipId: detail._id, coverLetter: cover });
      toast("success", "Application submitted!");
      setAppliedIds((p) => [...p, detail._id]);
      setDetail(null); setCover("");
      reload();
    } catch (e: any) { toast("error", e.detail || "Could not apply."); }
    finally { setApplying(false); }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-4 grid md:grid-cols-[1.4fr_1fr_1fr_auto] gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-cream-dim/70" />
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Search roles, companies, skills…" className="field-light w-full pl-10 pr-4 py-2.5 text-sm" />
        </div>
        <select value={domain} onChange={(e) => setDomain(e.target.value)} className="field-light px-3 py-2.5 text-sm">
          <option value="">All domains</option>
          {domains.map((d: any) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={mode} onChange={(e) => setMode(e.target.value)} className="field-light px-3 py-2.5 text-sm">
          <option value="">Any mode</option><option>Remote</option><option>Hybrid</option><option>On-site</option>
        </select>
        <button onClick={search} disabled={busy} className="btn-hero px-6 py-2.5 bg-[#14141a] dark:bg-cream text-white dark:text-[#14141a] text-sm font-cabin disabled:opacity-60">
          {busy ? "…" : "Search"}
        </button>
      </div>

            {recs.length > 0 && (
        <div>
          <p className="font-extrabold text-slate-900 dark:text-cream mb-3 flex items-center gap-2"><Sparkles size={16} className="text-primary" /> Recommended for you</p>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {recs.slice(0, 3).map((r: any) => (
              <button key={r.internship._id} onClick={() => setDetail(r.internship)} className="text-left rounded-2xl p-[1.5px] bg-gradient-to-br from-primary via-magenta to-primary card-hover">
                <span className="block bg-white dark:bg-card rounded-2xl p-4">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-slate-900 dark:text-cream text-[15px]">{r.internship.title}</span>
                    <span className="text-xs font-extrabold text-primary tabular whitespace-nowrap">{r.score}%</span>
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-cream-dim mt-0.5">{r.internship.companyName} · {r.internship.mode}</span>
                  <span className="block text-[11px] text-slate-400 dark:text-cream-dim/70 mt-2">{(r.reasons || []).slice(0, 2).join(" · ")}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {items.length === 0 && <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl"><EmptyState icon={<Inbox size={22} />} title="No roles match" body="Try widening your filters." /></div>}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((it: any) => {
          const f = fit(it);
          return (
            <div key={it._id} className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5 card-hover flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <span className="w-11 h-11 rounded-xl grid place-items-center text-white font-extrabold" style={{ background: "linear-gradient(135deg,#7b39fc,#2a0a5e)" }}>
                  {it.companyName?.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
                </span>
                <Badge tone={appliedIds.includes(it._id) ? "green" : "purple"}>{appliedIds.includes(it._id) ? "Applied" : it.mode}</Badge>
              </div>
              <p className="font-extrabold text-slate-900 dark:text-cream mt-3">{it.title}</p>
              <p className="text-[13px] text-slate-500 dark:text-cream-dim flex items-center gap-1.5 mt-1"><Building2 size={13} /> {it.companyName}</p>
              <p className="text-[13px] text-slate-500 dark:text-cream-dim flex items-center gap-1.5"><MapPin size={13} /> {it.location} · {it.duration}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(it.skills || []).slice(0, 4).map((s: string) => (
                  <span key={s} className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${f.hit.includes(s) ? "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-400/30" : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-cream-dim border-slate-200 dark:border-white/10"}`}>{s}</span>
                ))}
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-cream-dim mb-1"><span>Skill match</span><span className="tabular">{f.pct}%</span></div>
                <ProgressBar value={f.pct} />
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-white/5 text-xs text-slate-500 dark:text-cream-dim">
                <span>{it.stipend}</span><span className="tabular">Apply by {fmt(it.deadline)}</span>
              </div>
              <button onClick={() => setDetail(it)} className="btn-hero w-full mt-3 py-2.5 bg-primary text-white text-sm font-cabin">View & Apply</button>
            </div>
          );
        })}
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title} wide>
        {detail && (
          <div className="text-cream">
            <p className="text-sm text-cream-dim -mt-2">{detail.companyName} · {detail.location} · {detail.mode} · {detail.duration}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {(detail.skills || []).map((s: string) => <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/15">{s}</span>)}
            </div>
            <p className="text-sm text-cream/85 leading-relaxed mt-4">{detail.description}</p>
            <p className="font-bold text-sm mt-4 mb-2">Responsibilities</p>
            <ul className="space-y-1.5 text-sm text-cream-dim">
              {(detail.responsibilities || []).map((r: string) => <li key={r} className="flex gap-2"><Check size={14} className="mt-1 text-emerald-400 shrink-0" />{r}</li>)}
            </ul>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
              <div className="rounded-xl bg-white/5 border border-white/10 p-2.5"><p className="font-bold">{detail.stipend || "—"}</p><p className="text-cream-dim">Stipend</p></div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-2.5"><p className="font-bold tabular">{detail.openings}</p><p className="text-cream-dim">Openings</p></div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-2.5"><p className="font-bold tabular">{fmt(detail.deadline)}</p><p className="text-cream-dim">Deadline</p></div>
            </div>
            {appliedIds.includes(detail._id) ? (
              <div className="mt-5 rounded-xl bg-emerald-500/10 border border-emerald-400/30 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
                <BadgeCheck size={16} /> You've applied — track it under <button className="underline font-bold" onClick={() => { setDetail(null); go("applications"); }}>My Applications</button>
              </div>
            ) : (
              <div className="mt-5">
                <TextArea label="Cover letter" placeholder="Why are you a great fit? 3–4 lines work best." value={cover} onChange={(e: any) => setCover(e.target.value)} />
                <button onClick={apply} disabled={applying} className="btn-hero w-full mt-3 py-3 bg-primary btn-primary-glow text-white disabled:opacity-60">
                  {applying ? "Submitting…" : "Submit Application"}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Applications({ ov }: any) {
  const apps = ov.applications || [];
  const allocByInt: Record<string, any> = {};
  (ov.allocations || []).forEach((a: any) => { allocByInt[a.internshipId] = a; });
  if (ov.allocation) allocByInt[ov.allocation.internshipId] = ov.allocation;
  if (!apps.length)
    return <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl"><EmptyState icon={<FileText size={22} />} title="No applications yet" body="Your applications and their live status will appear here." /></div>;
  return (
    <div className="space-y-4">
      {apps.map((a: any) => {
        const st = APP_STATUS[a.status] || APP_STATUS.applied;
        const alloc = allocByInt[a.internshipId];
        return (
          <div key={a._id} className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-extrabold text-slate-900 dark:text-cream text-lg">{a.internship?.title}</p>
                <p className="text-sm text-slate-500 dark:text-cream-dim">{a.internship?.companyName} · Applied {fmt(a.appliedAt)}</p>
              </div>
              <Badge tone={st.tone}>{st.label}</Badge>
            </div>
            <div className="mt-4 max-w-2xl"><JourneyStepper status={a.status} allocationStatus={alloc?.status === "completed" ? "completed" : alloc?.status === "active" ? "active" : alloc ? "started" : undefined} /></div>
            {a.coverLetter && <p className="text-sm text-slate-500 dark:text-cream-dim mt-3 italic border-l-2 border-violet-200 dark:border-violet-400/30 pl-3">“{a.coverLetter}”</p>}
          </div>
        );
      })}
    </div>
  );
}

function InternshipHub({ al, reload, sub0 }: any) {
  const [sub, setSub] = useState(sub0 || "tasks");
  const [detail, setDetail] = useState<any>(null);
  const [offTasks, setOffTasks] = useState<any[]>(mockTasks);
  const toast = useToast();

  const loadDetail = async () => {
    if (!al?._id) return;
    try {
      const d = await api.allocation(al._id);
      setDetail(d);
    } catch { setDetail(null); }
  };
  useEffect(() => { loadDetail(); }, [al?._id]);

  if (!al)
    return <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl"><EmptyState icon={<Briefcase size={22} />} title="No active internship" body="Once you're allocated, tasks, attendance, updates and milestones live here." /></div>;

  const tasks = detail?.tasks || offTasks;
  const updateTask = async (id: string, patch: any) => {
    try { await api.patchTask(id, patch); loadDetail(); reload(); }
    catch {
      setOffTasks((p: any[]) => p.map((t) => (t._id === id ? { ...t, ...patch } : t)));
      toast("info", "Offline preview — change kept locally.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {[
          { id: "tasks", label: "Tasks", icon: <LayoutGrid size={15} /> },
          { id: "attendance", label: "Attendance", icon: <CalendarCheck size={15} /> },
          { id: "updates", label: "Daily Updates", icon: <Clock size={15} /> },
          { id: "milestones", label: "Milestones", icon: <Flag size={15} /> },
          { id: "sessions", label: "Sessions", icon: <Video size={15} /> },
        ].map((t) => (
          <button key={t.id} onClick={() => setSub(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition ${sub === t.id ? "bg-[#14141a] dark:bg-cream text-white dark:text-[#14141a]" : "bg-white dark:bg-card border border-slate-200 dark:border-white/10 text-slate-600 dark:text-cream-dim hover:border-violet-300"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {sub === "tasks" && <TasksBoard tasks={tasks} aid={al._id} onChange={updateTask} reload={loadDetail} />}
      {sub === "attendance" && <AttendanceSec aid={al._id} seed={detail?.attendance} />}
      {sub === "updates" && <UpdatesSec aid={al._id} seed={detail?.updates} reloadAll={() => { loadDetail(); reload(); }} />}
      {sub === "milestones" && <MilestonesSec seed={detail?.milestones} />}
      {sub === "sessions" && <SessionsPanel allocationId={al._id} role="student" />}
    </div>
  );
}

function TasksBoard({ tasks, aid, onChange, reload }: any) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [commentFor, setCommentFor] = useState("");
  const [comment, setComment] = useState("");

  const add = async () => {
    if (!title.trim()) return toast("error", "Give the task a title.");
    try { await api.createTask(aid, { title: title.trim(), dueDate: due }); }
    catch { toast("info", "Offline preview — task kept locally."); }
    setTitle(""); setDue(""); setOpen(false); reload();
  };
  const sendComment = async (id: string) => {
    if (!comment.trim()) return;
    try { await api.patchTask(id, { comment: comment.trim() }); }
    catch { toast("info", "Offline preview — comment kept locally."); }
    setComment(""); setCommentFor(""); reload();
  };

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setOpen((v) => !v)} className="btn-hero inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-cabin"><Plus size={15} /> New Task</button>
      </div>
      {open && (
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-4 mb-4 grid md:grid-cols-[1fr_200px_auto] gap-3">
          <Input tone="light" placeholder="Task title…" value={title} onChange={(e: any) => setTitle(e.target.value)} />
          <Input tone="light" type="date" value={due} onChange={(e: any) => setDue(e.target.value)} />
          <button onClick={add} className="btn-hero px-5 py-2.5 bg-[#14141a] dark:bg-cream text-white dark:text-[#14141a] text-sm font-cabin">Add</button>
        </div>
      )}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {taskCols.map((c) => {
          const list = tasks.filter((t: any) => t.status === c.id);
          return (
            <div key={c.id} className="rounded-2xl bg-slate-100/80 dark:bg-[#14121c]/90 border border-slate-200 dark:border-white/10 p-3 min-h-[220px]">
              <div className="flex items-center justify-between px-1 pb-2.5">
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-cream-dim">{c.label}</p>
                <span className="text-xs font-bold bg-white dark:bg-[#1d1a28] border border-slate-200 dark:border-white/10 rounded-full px-2 py-0.5 tabular text-slate-700 dark:text-cream">{list.length}</span>
              </div>
              <div className="space-y-2.5">
                {list.map((t: any) => (
                  <div key={t._id} className="bg-white dark:bg-[#1b1824] rounded-xl border border-slate-200 dark:border-white/10 p-3.5 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-sm text-slate-900 dark:text-cream leading-snug">{t.title}</p>
                      <Badge tone={priTone[t.priority] || "slate"}>{t.priority}</Badge>
                    </div>
                    {t.description && <p className="text-xs text-slate-500 dark:text-cream-dim mt-1.5 line-clamp-2">{t.description}</p>}
                    <p className="text-[11px] text-slate-400 dark:text-cream-dim/70 mt-2 tabular">{t.dueDate ? `${fmt(t.dueDate)} · ${dueIn(t.dueDate)}` : "No due date"}</p>
                    {(t.comments || []).length > 0 && (
                      <div className="mt-2 space-y-1.5 border-t border-slate-100 dark:border-white/5 pt-2">
                        {t.comments.slice(-2).map((cm: any, i: number) => (
                          <p key={i} className="text-[11px] text-slate-500 dark:text-cream-dim"><b className="text-slate-700 dark:text-cream-dim">{cm.by}:</b> {cm.text}</p>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 mt-2.5">
                      {nextStatus[t.status] && (
                        <button onClick={() => onChange(t._id, { status: nextStatus[t.status] })}
                          className="flex-1 text-xs font-bold py-1.5 rounded-lg bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-200 transition">
                          Move to {taskCols.find((x) => x.id === nextStatus[t.status])?.label}
                        </button>
                      )}
                      <button onClick={() => setCommentFor(commentFor === t._id ? "" : t._id)} className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-cream-dim hover:bg-slate-200 dark:hover:bg-white/15 transition grid place-items-center" title="Comment"><MessageSquare size={13} /></button>
                    </div>
                    {commentFor === t._id && (
                      <div className="flex gap-1.5 mt-2">
                        <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…"
                          className="field-light flex-1 px-2.5 py-1.5 text-xs" />
                        <button onClick={() => sendComment(t._id)} className="px-2.5 rounded-lg bg-[#14141a] dark:bg-cream text-white dark:text-[#14141a]"><Send size={13} /></button>
                      </div>
                    )}
                  </div>
                ))}
                {list.length === 0 && <p className="text-xs text-slate-400 dark:text-cream-dim/70 text-center py-6">Nothing here.</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AttendanceSec({ aid, seed }: any) {
  const toast = useToast();
  const now = new Date();
  const [ym, setYm] = useState<[number, number]>([now.getFullYear(), now.getMonth()]);
  const [rows, setRows] = useState<any[]>(seed || []);
  const [sel, setSel] = useState(now.toISOString().slice(0, 10));
  const [st, setSt] = useState("present");
  const [live, setLive] = useState(true);

  const load = async () => {
    try { setRows(await api.attendance(aid)); setLive(true); }
    catch { setRows(offlineAttendance(ym[0], ym[1])); setLive(false); }
  };
  useEffect(() => { if (seed) { setRows(seed); } else load(); }, [aid]);
  useEffect(() => { if (!live) setRows(offlineAttendance(ym[0], ym[1])); }, [ym]);

  const byDate: Record<string, any> = {};
  rows.forEach((r: any) => { byDate[r.date] = r; });
  const [Y, M] = ym;
  const first = new Date(Y, M, 1).getDay();
  const days = new Date(Y, M + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const monthRows = rows.filter((r: any) => r.date?.startsWith(`${Y}-${pad(M + 1)}`));
  const present = monthRows.filter((r: any) => r.status === "present").length;
  const pct = monthRows.length ? Math.round((present / monthRows.length) * 100) : 0;
  const color: Record<string, string> = {
    present: "bg-emerald-500 text-white", absent: "bg-rose-500 text-white",
    leave: "bg-amber-400 text-white", holiday: "bg-slate-300 dark:bg-white/20 text-slate-600 dark:text-cream-dim",
  };

  const mark = async () => {
    try { await api.markAttendance(aid, { date: sel, status: st }); toast("success", `Marked ${st} for ${sel}.`); load(); }
    catch {
      setRows((p: any[]) => {
        const rest = p.filter((r) => r.date !== sel);
        return [...rest, { date: sel, status: st }];
      });
      toast("info", "Offline preview — kept locally.");
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-5">
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setYm([M === 0 ? Y - 1 : Y, M === 0 ? 11 : M - 1])} className="w-9 h-9 grid place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10"><ChevronLeft size={18} /></button>
          <p className="font-extrabold text-slate-900 dark:text-cream">{new Date(Y, M, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
          <button onClick={() => setYm([M === 11 ? Y + 1 : Y, M === 11 ? 0 : M + 1])} className="w-9 h-9 grid place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10"><ChevronRight size={18} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-slate-400 dark:text-cream-dim/70 mb-1.5">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((d, i) => {
            if (!d) return <span key={i} />;
            const ds = `${Y}-${pad(M + 1)}-${pad(d)}`;
            const r = byDate[ds];
            const isSel = sel === ds;
            return (
              <button key={i} onClick={() => setSel(ds)}
                className={`aspect-square rounded-xl text-sm font-bold tabular grid place-items-center transition border-2 ${
                  r ? color[r.status] || "bg-slate-200 dark:bg-white/15" : "bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-cream-dim/70 hover:bg-slate-100 dark:hover:bg-white/10"
                } ${isSel ? "border-violet-600" : "border-transparent"}`}>
                {d}
              </button>
            );
          })}
        </div>
        <div className="flex gap-4 mt-4 text-xs text-slate-500 dark:text-cream-dim">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /> Present</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-500" /> Absent</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400" /> Leave</span>
        </div>
      </div>
      <div className="space-y-5">
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5 text-center">
          <p className="text-xs font-bold text-slate-500 dark:text-cream-dim uppercase tracking-wide">This month</p>
          <div className="my-3"><ProgressRing value={pct} size={130} color="#10b981" track="#e6f7ef">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-cream tabular">{pct}%</span>
          </ProgressRing></div>
          <p className="text-sm text-slate-500 dark:text-cream-dim tabular">{present} of {monthRows.length} days present</p>
        </div>
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-3">
          <p className="text-xs font-bold text-slate-500 dark:text-cream-dim uppercase tracking-wide">Log attendance</p>
          <Input tone="light" type="date" value={sel} onChange={(e: any) => setSel(e.target.value)} />
          <div className="grid grid-cols-3 gap-2">
            {["present", "absent", "leave"].map((s) => (
              <button key={s} onClick={() => setSt(s)}
                className={`py-2 rounded-xl text-xs font-bold capitalize transition ${st === s ? "bg-[#14141a] dark:bg-cream text-white dark:text-[#14141a]" : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-cream-dim"}`}>{s}</button>
            ))}
          </div>
          <button onClick={mark} className="btn-hero w-full py-2.5 bg-primary text-white text-sm font-cabin">Mark {sel === now.toISOString().slice(0, 10) ? "Today" : "Day"}</button>
        </div>
      </div>
    </div>
  );
}

function UpdatesSec({ aid, seed, reloadAll }: any) {
  const toast = useToast();
  const [items, setItems] = useState<any[]>(seed || []);
  const [f, setF] = useState({ workedOn: "", completed: "", learned: "", blockers: "", hours: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => { setItems(seed || []); }, [seed]);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!f.workedOn.trim() || !f.completed.trim()) return toast("error", "Tell us what you worked on and completed.");
    setBusy(true);
    try {
      const d = await api.postUpdate(aid, { ...f, hours: parseFloat(f.hours) || 0 });
      setItems((p: any[]) => [d, ...p]);
      setF({ workedOn: "", completed: "", learned: "", blockers: "", hours: "" });
      toast("success", "Daily update logged. Your mentor has been notified.");
      reloadAll();
    } catch { toast("error", "Could not save — is the server running?"); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-3.5 h-fit">
        <p className="font-extrabold text-slate-900 dark:text-cream">Log today's work</p>
        <TextArea tone="light" label="What did you work on?" value={f.workedOn} onChange={(e: any) => set("workedOn", e.target.value)} />
        <TextArea tone="light" label="What did you complete?" value={f.completed} onChange={(e: any) => set("completed", e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <TextArea tone="light" label="What did you learn?" value={f.learned} onChange={(e: any) => set("learned", e.target.value)} />
          <TextArea tone="light" label="Any blockers?" value={f.blockers} onChange={(e: any) => set("blockers", e.target.value)} />
        </div>
        <div className="w-40"><Input tone="light" label="Hours worked" type="number" min="0" max="24" step="0.5" value={f.hours} onChange={(e: any) => set("hours", e.target.value)} /></div>
        <button onClick={submit} disabled={busy} className="btn-hero w-full py-2.5 bg-primary text-white text-sm font-cabin disabled:opacity-60">
          {busy ? "Saving…" : "Submit Daily Update"}
        </button>
      </div>
      <div className="space-y-3">
        {items.map((u: any) => (
          <div key={u._id} className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="font-extrabold text-slate-900 dark:text-cream tabular">{fmt(u.date)}</p>
              <Badge tone={u.reviewStatus === "approved" ? "green" : "amber"}>{u.reviewStatus === "approved" ? "Reviewed" : "Pending review"}</Badge>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <p><b className="text-slate-700 dark:text-cream-dim">Worked on:</b> <span className="text-slate-600 dark:text-cream-dim">{u.workedOn}</span></p>
              <p><b className="text-slate-700 dark:text-cream-dim">Completed:</b> <span className="text-slate-600 dark:text-cream-dim">{u.completed}</span></p>
              {u.learned && <p><b className="text-slate-700 dark:text-cream-dim">Learned:</b> <span className="text-slate-600 dark:text-cream-dim">{u.learned}</span></p>}
              {u.blockers && <p><b className="text-slate-700 dark:text-cream-dim">Blockers:</b> <span className="text-slate-600 dark:text-cream-dim">{u.blockers}</span></p>}
            </div>
            {u.mentorComment && (
              <div className="mt-3 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-400/20 px-3.5 py-2.5 text-sm">
                <b className="text-violet-700 dark:text-violet-300">Mentor:</b> <span className="text-slate-600 dark:text-cream-dim">{u.mentorComment}</span>
              </div>
            )}
            {u.hours ? <p className="text-xs text-slate-400 dark:text-cream-dim/70 mt-2 tabular">{u.hours}h logged</p> : null}
          </div>
        ))}
        {items.length === 0 && <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl"><EmptyState icon={<Clock size={22} />} title="No updates yet" body="Your daily work history will build up here as a timeline." /></div>}
      </div>
    </div>
  );
}

function MilestonesSec({ seed }: any) {
  const items = seed || [];
  if (!items.length)
    return <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl"><EmptyState icon={<Flag size={22} />} title="No milestones yet" body="Your mentor will define milestones for your internship." /></div>;
  const tone: Record<string, string> = { completed: "green", in_progress: "purple", upcoming: "slate" };
  return (
    <div className="max-w-2xl space-y-4">
      {items.map((m: any, i: number) => (
        <div key={m._id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className={`w-9 h-9 rounded-full grid place-items-center font-bold text-sm shrink-0 ${m.status === "completed" ? "bg-emerald-500 text-white" : m.status === "in_progress" ? "bg-primary text-white" : "bg-slate-200 dark:bg-white/15 text-slate-500 dark:text-cream-dim"}`}>
              {m.status === "completed" ? <Check size={16} /> : i + 1}
            </span>
            {i < items.length - 1 && <span className="w-0.5 flex-1 bg-slate-200 dark:bg-white/15 my-1 rounded" />}
          </div>
          <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex-1 mb-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="font-extrabold text-slate-900 dark:text-cream">{m.title}</p>
              <Badge tone={tone[m.status] || "slate"}>{m.status.replace("_", " ")}</Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-cream-dim mt-1">{m.description}</p>
            <div className="flex items-center gap-3 mt-3">
              <ProgressBar value={m.percent} className="flex-1" />
              <span className="text-xs font-bold text-slate-500 dark:text-cream-dim tabular">{m.percent}%</span>
              <span className="text-xs text-slate-400 dark:text-cream-dim/70 tabular">· {fmt(m.dueDate)}</span>
              {m.dueDate && <a href={gcalUrl({ title: `Milestone: ${m.title}`, date: m.dueDate, details: m.description || "InterNova milestone" })} target="_blank" rel="noreferrer" title="Add to Google Calendar" className="text-slate-300 dark:text-white/40 hover:text-violet-600 transition"><CalendarPlus size={14} /></a>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Certificates({ ov }: any) {
  const toast = useToast();
  const certs = ov.certificates || [];
  const al = ov.allocation;
  const s = al?.summary;

  const download = (c: any) => {
    const blob = certificatePdf({
      _id: c._id, studentName: c.studentName, companyName: c.companyName,
      role: c.role, duration: c.duration, completionDate: c.completionDate,
      grade: c.grade, skills: c.skills,
    });
    downloadBlob(blob, `${c._id}.pdf`);
    toast("success", "Certificate downloaded.");
  };
  const copyLink = (c: any) => {
    navigator.clipboard?.writeText(`${window.location.origin}/verify/${c._id}`);
    toast("success", "Verification link copied.");
  };

  return (
    <div className="space-y-5">
      {certs.map((c: any) => (
        <div key={c._id} className="rounded-2xl p-[1.5px] bg-gradient-to-br from-primary via-magenta to-primary">
          <div className="bg-white dark:bg-card rounded-2xl p-6 flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge tone="green"><BadgeCheck size={13} /> Verified</Badge>
                <span className="font-mono text-sm text-slate-500 dark:text-cream-dim tabular">{c._id}</span>
              </div>
              <p className="font-display italic text-3xl text-slate-900 dark:text-cream mt-2">{c.role}</p>
              <p className="text-sm text-slate-500 dark:text-cream-dim mt-1">{c.companyName} · {c.duration} · Completed {fmt(c.completionDate)}{c.grade ? ` · Grade ${c.grade}` : ""}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(c.skills || []).map((sk: string) => <span key={sk} className="text-[11px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 font-semibold">{sk}</span>)}
              </div>
            </div>
            <div className="flex md:flex-col gap-2 justify-center shrink-0">
              <button onClick={() => download(c)} className="btn-hero px-5 py-2.5 bg-primary text-white text-sm font-cabin">Download PDF</button>
              <button onClick={() => copyLink(c)} className="btn-hero px-5 py-2.5 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-cream-dim text-sm font-cabin">Copy verify link</button>
              <Link to={`/verify/${c._id}`} className="btn-hero px-5 py-2.5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-cream-dim text-sm font-cabin text-center">View public page</Link>
            </div>
          </div>
        </div>
      ))}
      {certs.length === 0 && (
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl">
          <EmptyState icon={<Award size={22} />} title="No certificate yet"
            body="Finish your internship criteria — tasks, milestones, attendance and final evaluation — and your verifiable certificate will appear here." />
        </div>
      )}
      {al && al.status !== "completed" && (
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
          <p className="font-extrabold text-slate-900 dark:text-cream">Road to your {al.internship?.companyName} certificate</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            {[
              ["Tasks", `${s?.tasks.done ?? 0}/${s?.tasks.total ?? 0}`, (s?.tasks.total ? (s.tasks.done / s.tasks.total) * 100 : 0)],
              ["Milestones", `${s?.milestones.done ?? 0}/${s?.milestones.total ?? 0}`, (s?.milestones.total ? (s.milestones.done / s.milestones.total) * 100 : 0)],
              ["Attendance", `${s?.attendancePct ?? 0}%`, s?.attendancePct ?? 0],
              ["Evaluation", "Pending", 0],
            ].map(([l, v, p]: any) => (
              <div key={l as string} className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-3.5">
                <p className="text-xs font-bold text-slate-500 dark:text-cream-dim">{l}</p>
                <p className="text-lg font-extrabold tabular mt-0.5">{v}</p>
                <ProgressBar value={p} className="mt-2" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileSec({ reload }: any) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({
    name: user?.name || "", phone: user?.phone || "", location: user?.location || "",
    bio: user?.bio || "", college: user?.college || "", degree: user?.degree || "",
    year: user?.year || "", cgpa: user?.cgpa || "",
    skills: (user?.skills || []).join(", "),
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true);
    try {
      const u = await api.patchUser(user!._id, {
        ...f, skills: f.skills.split(",").map((s) => s.trim()).filter(Boolean), profileComplete: true,
      });
      setUser(u);
      toast("success", "Profile saved.");
      reload();
    } catch { toast("error", "Could not save — is the server running?"); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex items-center gap-4">
        <Avatar name={f.name} avatar={user?.avatar} color={user?.color} size={60} />
        <div>
          <p className="font-extrabold text-lg text-slate-900 dark:text-cream">{f.name || "Your name"}</p>
          <p className="text-sm text-slate-500 dark:text-cream-dim">{user?.email}</p>
          {user?.resumeName && <p className="text-xs text-slate-500 dark:text-cream-dim mt-1 flex items-center gap-1"><FileText size={12} /> {user.resumeName}</p>}
        </div>
      </div>
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5 grid md:grid-cols-2 gap-4">
        <Input tone="light" label="Full name" value={f.name} onChange={(e: any) => set("name", e.target.value)} />
        <Input tone="light" label="Phone" value={f.phone} onChange={(e: any) => set("phone", e.target.value)} />
        <Input tone="light" label="Location" value={f.location} onChange={(e: any) => set("location", e.target.value)} />
        <Input tone="light" label="College" value={f.college} onChange={(e: any) => set("college", e.target.value)} />
        <Input tone="light" label="Degree" value={f.degree} onChange={(e: any) => set("degree", e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Input tone="light" label="Year" value={f.year} onChange={(e: any) => set("year", e.target.value)} />
          <Input tone="light" label="CGPA" value={f.cgpa} onChange={(e: any) => set("cgpa", e.target.value)} />
        </div>
        <div className="md:col-span-2"><Input tone="light" label="Skills (comma separated)" value={f.skills} onChange={(e: any) => set("skills", e.target.value)} /></div>
        <div className="md:col-span-2"><TextArea tone="light" label="Bio" value={f.bio} onChange={(e: any) => set("bio", e.target.value)} /></div>
      </div>
      <button onClick={save} disabled={busy} className="btn-hero px-8 py-3 bg-primary text-white font-cabin disabled:opacity-60">
        {busy ? "Saving…" : "Save Profile"}
      </button>
    </div>
  );
}

function MessagesSec() {
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
    return <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl"><EmptyState icon={<MessageSquare size={22} />} title="No conversations" body="Once you're allocated, you can chat with your mentor and company here." /></div>;

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

function NotifsSec() {
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
        <div key={n._id} className={`bg-white dark:bg-card border rounded-2xl p-4 flex gap-3 ${n.read ? "border-slate-200 dark:border-white/10 opacity-70" : "border-violet-200 dark:border-violet-400/30"}`}>
          <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${n.read ? "bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-cream-dim/70" : "bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300"}`}>
            <Bell size={16} />
          </span>
          <div className="flex-1">
            <p className="font-bold text-slate-900 dark:text-cream text-sm">{n.title}</p>
            <p className="text-sm text-slate-500 dark:text-cream-dim">{n.body}</p>
            <p className="text-[11px] text-slate-400 dark:text-cream-dim/70 mt-1 tabular">{fmt(n.createdAt)}</p>
          </div>
          {!n.read && <button onClick={() => read(n._id)} className="text-xs font-bold text-violet-600 dark:text-violet-300 self-start">Mark read</button>}
        </div>
      ))}
      {items.length === 0 && <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl"><EmptyState icon={<Bell size={22} />} title="No notifications" body="Application updates, tasks and feedback will appear here." /></div>}
    </div>
  );
}
