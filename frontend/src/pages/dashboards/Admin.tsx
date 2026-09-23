import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Activity, Award, BadgeCheck, BarChart3, Bell, Briefcase, Building2, FileText,
  GraduationCap, Home, Inbox, MessageSquare, Plus, Settings as SettingsIcon,
  ShieldCheck, Users,
} from "lucide-react";
import DashShell from "../../components/DashShell";
import {
  APP_STATUS, Avatar, Badge, EmptyState, Input, Modal, ProgressBar,
  Select, Spinner, Stat, TextArea, useToast,
} from "../../components/ui";
import { api, safe } from "../../lib/api";
import { mockAdminOverview } from "../../lib/mock";
import { MessagesPanel, NotifsPanel, fmt } from "../../components/dashbits";
import { AdminRemindersCard } from "../../components/sessions";
import AdminReports from "./admin/Reports";

const TABS = [
  ["overview", "Overview", <Home key="h" size={20} />],
  ["students", "Students", <GraduationCap key="s" size={20} />],
  ["mentors", "Mentors", <Users key="m" size={20} />],
  ["companies", "Companies", <Building2 key="c" size={20} />],
  ["internships", "Internships", <Briefcase key="i" size={20} />],
  ["applications", "Applications", <Inbox key="a" size={20} />],
  ["allocations", "Allocations", <FileText key="f" size={20} />],
  ["certificates", "Certificates", <Award key="w" size={20} />],
  ["reports", "Reports", <BarChart3 key="r" size={20} />],
  ["activity", "System Activity", <Activity key="y" size={20} />],
  ["messages", "Messages", <MessageSquare key="g" size={20} />],
  ["notifications", "Notifications", <Bell key="n" size={20} />],
  ["settings", "Settings", <SettingsIcon key="e" size={20} />],
] as const;

export default function Admin() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") || "overview";
  const [ov, setOv] = useState<any>(mockAdminOverview);
  const [loading, setLoading] = useState(true);
  const [mentorOpen, setMentorOpen] = useState(false);

  const load = async () => {
    const r = await safe(() => api.overview(), mockAdminOverview);
    setOv(r.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const setTab = (t: string) => { setSp(t === "overview" ? {} : { tab: t }); window.scrollTo(0, 0); };

  const titles: Record<string, [string, string]> = {
    overview: ["Mission Control", "Every student, mentor, company and certificate — live."],
    students: ["Students", `${(ov.users?.students || []).length} registered learners.`],
    mentors: ["Mentors", "Guides who shape every internship."],
    companies: ["Companies", "Verified hiring partners."],
    internships: ["Internships", "Every role on the platform."],
    applications: ["Applications", "The full hiring pipeline."],
    allocations: ["Allocations", "Active and completed internships."],
    certificates: ["Certificates", "Verifiable credentials issued."],
    reports: ["Reports", "Platform analytics and the email outbox."],
    activity: ["System Activity", "The platform's live pulse."],
    messages: ["Messages", "Support conversations."],
    notifications: ["Notifications", "Broadcasts and alerts."],
    settings: ["Settings", "Platform configuration."],
  };
  const nav = TABS.map(([id, label, icon]) => ({ id, label, icon }));
  const [title, subtitle] = titles[tab] || titles.overview;

  return (
    <DashShell roleLabel="Admin" nav={nav} active={tab} onNav={setTab} title={title} subtitle={subtitle} thin compactNav
      actions={tab === "mentors" ? (
        <button onClick={() => setMentorOpen(true)} className="btn-hero inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-cabin"><Plus size={15} /> Add Mentor</button>
      ) : undefined}>
      {loading ? <div className="grid place-items-center py-24"><Spinner light /></div> : (
        <>
          {tab === "overview" && <AOverview ov={ov} go={setTab} onMentor={() => setMentorOpen(true)} />}
          {tab === "students" && <UsersTable role="students" title="Students" icon={<GraduationCap size={20} />} />}
          {tab === "mentors" && <UsersTable role="mentors" title="Mentors" icon={<Users size={20} />} onAdd={() => setMentorOpen(true)} />}
          {tab === "companies" && <UsersTable role="companies" title="Companies" icon={<Building2 size={20} />} />}
          {tab === "internships" && <InternshipsTable />}
          {tab === "applications" && <ApplicationsTable />}
          {tab === "allocations" && <AllocationsTable />}
          {tab === "certificates" && <CertificatesTable />}
          {tab === "reports" && <AdminReports />}
          {tab === "activity" && <ActivityFeed />}
          {tab === "messages" && <MessagesPanel empty="Admin conversations will appear here." />}
          {tab === "notifications" && <NotifsPanel />}
          {tab === "settings" && <SettingsSec />}
        </>
      )}
      <MentorModal open={mentorOpen} close={() => setMentorOpen(false)} reload={load} />
    </DashShell>
  );
}

function AOverview({ ov, go, onMentor }: any) {
  const s = ov.stats || {};
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<GraduationCap size={19} />} label="Students" value={s.students ?? 0} tone="purple" />
        <Stat icon={<Building2 size={19} />} label="Companies" value={s.companies ?? 0} tone="blue" />
        <Stat icon={<Users size={19} />} label="Mentors" value={s.mentors ?? 0} tone="green" />
        <Stat icon={<Briefcase size={19} />} label="Roles / Applications" value={`${s.internships ?? 0} / ${s.applications ?? 0}`} tone="amber" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<FileText size={19} />} label="Active allocations" value={s.activeAllocations ?? 0} tone="blue" />
        <Stat icon={<Award size={19} />} label="Certificates issued" value={s.certificates ?? 0} tone="green" />
        <Stat icon={<Activity size={19} />} label="Avg attendance" value={`${s.avgAttendance ?? 0}%`} tone="purple" />
        <Stat icon={<ShieldCheck size={19} />} label="Completion rate" value={`${s.completionRate ?? 0}%`} tone="amber" />
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
          <p className="text-xs font-bold text-slate-500 dark:text-cream-dim uppercase tracking-wide">Quick actions</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={onMentor} className="rounded-xl border border-slate-200 dark:border-white/10 p-3 text-left card-hover">
              <Plus size={17} className="text-primary" /><p className="text-sm font-bold text-slate-800 dark:text-cream mt-1.5">Add mentor</p>
            </button>
            <button onClick={() => go("companies")} className="rounded-xl border border-slate-200 dark:border-white/10 p-3 text-left card-hover">
              <BadgeCheck size={17} className="text-primary" /><p className="text-sm font-bold text-slate-800 dark:text-cream mt-1.5">Verify company</p>
            </button>
            <button onClick={() => go("certificates")} className="rounded-xl border border-slate-200 dark:border-white/10 p-3 text-left card-hover">
              <Award size={17} className="text-primary" /><p className="text-sm font-bold text-slate-800 dark:text-cream mt-1.5">Certificates</p>
            </button>
            <button onClick={() => go("settings")} className="rounded-xl border border-slate-200 dark:border-white/10 p-3 text-left card-hover">
              <SettingsIcon size={17} className="text-primary" /><p className="text-sm font-bold text-slate-800 dark:text-cream mt-1.5">Settings</p>
            </button>
          </div>
        </div>
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 dark:text-cream-dim uppercase tracking-wide">Pending verifications</p>
            <button onClick={() => go("companies")} className="text-xs font-bold text-violet-600 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-200">Review</button>
          </div>
          <div className="mt-3 space-y-2.5">
            {((ov.users?.companies || []).filter((c: any) => !c.verified).slice(0, 4)).map((c: any) => (
              <div key={c._id} className="flex items-center gap-3 text-sm">
                <Avatar name={c.name} size={34} />
                <span className="flex-1 min-w-0"><span className="block font-bold text-slate-900 dark:text-cream truncate">{c.name}</span>
                <span className="block text-xs text-slate-500 dark:text-cream-dim truncate">{c.industry || "—"}</span></span>
                <Badge tone="amber">Unverified</Badge>
              </div>
            ))}
            {(ov.users?.companies || []).filter((c: any) => !c.verified).length === 0 && <p className="text-sm text-slate-400 dark:text-cream-dim/70">All companies verified. 🎉</p>}
          </div>
        </div>
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 dark:text-cream-dim uppercase tracking-wide">Live activity</p>
            <button onClick={() => go("activity")} className="text-xs font-bold text-violet-600 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-200">View all</button>
          </div>
          <div className="mt-3 space-y-2.5">
            {(ov.activity || []).slice(0, 5).map((a: any, i: number) => (
              <div key={i} className="flex gap-2.5 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <div><p className="text-slate-800 dark:text-cream">{a.text}</p><p className="text-[11px] text-slate-400 dark:text-cream-dim/70 tabular">{fmt(a.at)}</p></div>
              </div>
            ))}
            {(ov.activity || []).length === 0 && <p className="text-sm text-slate-400 dark:text-cream-dim/70">Quiet… for now.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersTable({ role, title, icon, onAdd }: any) {
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    try { setItems(await api.adminUsers(role)); } catch { setItems([]); }
  };
  useEffect(() => { load(); }, [role]);

  const save = async (u: any, patch: any) => {
    try {
      await api.patchUser(u._id, patch);
      toast("success", "Saved.");
      load();
    } catch { toast("error", "Could not save."); }
  };

  const filtered = items.filter((u: any) =>
    !q || u.name?.toLowerCase().includes(q.toLowerCase()) || u.email?.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-slate-100 dark:border-white/5">
        <span className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300 grid place-items-center">{icon}</span>
        <p className="font-extrabold text-slate-900 dark:text-cream">{title} <span className="text-sm font-medium text-slate-400 dark:text-cream-dim/70 tabular">({items.length})</span></p>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`}
          className="field-light ml-auto px-3.5 py-2 text-sm w-56" />
        {onAdd && <button onClick={onAdd} className="btn-hero px-4 py-2 bg-primary text-white text-sm font-cabin">+ Add</button>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 dark:text-cream-dim/70 border-b border-slate-100 dark:border-white/5">
              <th className="px-4 py-3 font-bold">User</th>
              <th className="px-4 py-3 font-bold">Contact</th>
              <th className="px-4 py-3 font-bold">Details</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u: any) => (
              <tr key={u._id} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={u.name} avatar={u.avatar} color={u.color} size={34} />
                    <span className="font-bold text-slate-900 dark:text-cream">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-cream-dim text-[13px]">{u.email}<br />{u.phone || "—"}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-cream-dim text-[13px]">
                  {role === "students" && <>{u.college || "—"} · {(u.skills || []).slice(0, 3).join(", ")}</>}
                  {role === "mentors" && <>{(u.expertise || []).join(", ") || "—"} · {u.mentees ?? 0} mentees</>}
                  {role === "companies" && <>{u.industry || "—"} · {u.location || "—"}</>}
                </td>
                <td className="px-4 py-3">
                  {role === "companies"
                    ? <Badge tone={u.verified ? "green" : "amber"}>{u.verified ? "Verified" : "Pending"}</Badge>
                    : <Badge tone={u.suspended ? "red" : "green"}>{u.suspended ? "Suspended" : "Active"}</Badge>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5 justify-end">
                    {role === "companies" && !u.verified && (
                      <button onClick={() => save(u, { verified: true })} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Verify</button>
                    )}
                    {role !== "companies" && (
                      <button onClick={() => save(u, { suspended: !u.suspended })}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg ${u.suspended ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300"}`}>
                        {u.suspended ? "Unsuspend" : "Suspend"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <EmptyState icon={<Users size={22} />} title={`No ${title.toLowerCase()}`} body="They'll show up here once registered." />}
    </div>
  );
}

function InternshipsTable() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api.internships({}).then(setItems).catch(() => setItems([])); }, []);
  return (
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 dark:text-cream-dim/70 border-b border-slate-100 dark:border-white/5">
            <th className="px-4 py-3 font-bold">Role</th><th className="px-4 py-3 font-bold">Company</th>
            <th className="px-4 py-3 font-bold">Mode</th><th className="px-4 py-3 font-bold">Deadline</th><th className="px-4 py-3 font-bold">Status</th>
          </tr></thead>
          <tbody>
            {items.map((it: any) => (
              <tr key={it._id} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="px-4 py-3 font-bold text-slate-900 dark:text-cream">{it.title}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-cream-dim">{it.companyName}</td>
                <td className="px-4 py-3"><Badge tone="purple">{it.mode}</Badge></td>
                <td className="px-4 py-3 text-slate-500 dark:text-cream-dim tabular">{fmt(it.deadline)}</td>
                <td className="px-4 py-3"><Badge tone={it.status === "open" ? "green" : "slate"}>{it.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && <EmptyState icon={<Briefcase size={22} />} title="No internships" body="Roles posted by companies appear here." />}
    </div>
  );
}

function ApplicationsTable() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api.applications().then(setItems).catch(() => setItems([])); }, []);
  return (
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 dark:text-cream-dim/70 border-b border-slate-100 dark:border-white/5">
            <th className="px-4 py-3 font-bold">Student</th><th className="px-4 py-3 font-bold">Role</th>
            <th className="px-4 py-3 font-bold">Company</th><th className="px-4 py-3 font-bold">Applied</th><th className="px-4 py-3 font-bold">Status</th>
          </tr></thead>
          <tbody>
            {items.map((a: any) => {
              const st = APP_STATUS[a.status] || APP_STATUS.applied;
              return (
                <tr key={a._id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-cream">{a.student?.name}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-cream-dim">{a.internship?.title}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-cream-dim">{a.internship?.companyName}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-cream-dim tabular">{fmt(a.appliedAt)}</td>
                  <td className="px-4 py-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {items.length === 0 && <EmptyState icon={<Inbox size={22} />} title="No applications" body="The pipeline is empty." />}
    </div>
  );
}

function AllocationsTable() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api.allocations().then(setItems).catch(() => setItems([])); }, []);
  return (
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 dark:text-cream-dim/70 border-b border-slate-100 dark:border-white/5">
            <th className="px-4 py-3 font-bold">Intern</th><th className="px-4 py-3 font-bold">Role</th>
            <th className="px-4 py-3 font-bold">Mentor</th><th className="px-4 py-3 font-bold">Progress</th><th className="px-4 py-3 font-bold">Status</th>
          </tr></thead>
          <tbody>
            {items.map((a: any) => (
              <tr key={a._id} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="px-4 py-3 font-bold text-slate-900 dark:text-cream">{a.student?.name}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-cream-dim">{a.internship?.title}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-cream-dim">{a.mentor?.name || "—"}</td>
                <td className="px-4 py-3"><div className="w-32"><ProgressBar value={a.summary?.progress || a.progress || 0} /></div></td>
                <td className="px-4 py-3"><Badge tone={a.status === "active" ? "green" : "slate"}>{a.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && <EmptyState icon={<FileText size={22} />} title="No allocations" body="Onboarded internships appear here." />}
    </div>
  );
}

function CertificatesTable() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api.certificates().then(setItems).catch(() => setItems([])); }, []);
  return (
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 dark:text-cream-dim/70 border-b border-slate-100 dark:border-white/5">
            <th className="px-4 py-3 font-bold">ID</th><th className="px-4 py-3 font-bold">Student</th>
            <th className="px-4 py-3 font-bold">Role</th><th className="px-4 py-3 font-bold">Grade</th><th className="px-4 py-3 font-bold">Verify</th>
          </tr></thead>
          <tbody>
            {items.map((c: any) => (
              <tr key={c._id} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="px-4 py-3 font-mono text-[13px] tabular">{c._id}</td>
                <td className="px-4 py-3 font-bold text-slate-900 dark:text-cream">{c.studentName}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-cream-dim">{c.role}</td>
                <td className="px-4 py-3"><Badge tone="green">{c.grade}</Badge></td>
                <td className="px-4 py-3"><Link to={`/verify/${c._id}`} className="text-xs font-bold text-violet-600 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-200">Open →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && <EmptyState icon={<Award size={22} />} title="No certificates" body="Issued certificates appear here." />}
    </div>
  );
}

function AnnounceComposer({ reload }: any) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [roles, setRoles] = useState<string[]>(["student", "mentor", "company"]);
  const [busy, setBusy] = useState(false);
  const toggleRole = (r: string) => setRoles((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]));
  const send = async () => {
    if (!title.trim() || !body.trim()) return toast("error", "Title and body are required.");
    setBusy(true);
    try {
      const r = await api.postAnnouncement({ title: title.trim(), body: body.trim(), roles });
      toast("success", `Announcement sent to ${r.notified} users.`);
      setTitle(""); setBody("");
      reload();
    } catch (e: any) { toast("error", e.detail || "Could not send."); }
    finally { setBusy(false); }
  };
  return (
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5 mb-5 max-w-3xl">
      <p className="font-extrabold text-slate-900 dark:text-cream">📢 New announcement</p>
      <div className="grid gap-3 mt-3">
        <Input tone="light" placeholder="Title — e.g. Maintenance on Sunday" value={title} onChange={(e: any) => setTitle(e.target.value)} />
        <TextArea tone="light" placeholder="What should everyone know?" value={body} onChange={(e: any) => setBody(e.target.value)} />
        <div className="flex items-center gap-2 flex-wrap">
          {(["student", "mentor", "company"] as const).map((r) => (
            <button key={r} onClick={() => toggleRole(r)} className={`text-xs font-bold px-3 py-1.5 rounded-full capitalize transition ${roles.includes(r) ? "bg-primary text-white" : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-cream-dim"}`}>{r}s</button>
          ))}
          <button onClick={send} disabled={busy} className="btn-hero ml-auto px-5 py-2 bg-primary text-white text-sm font-cabin disabled:opacity-60">{busy ? "Sending…" : "Broadcast"}</button>
        </div>
      </div>
    </div>
  );
}

function ActivityFeed() {
  const [items, setItems] = useState<any[]>([]);
  const load = () => { api.activity().then(setItems).catch(() => setItems([])); };
  useEffect(() => { load(); }, []);
  return (
    <>
      <AnnounceComposer reload={load} />
      <AdminRemindersCard />
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5 max-w-3xl">
      <div className="space-y-3">
        {items.map((a: any, i: number) => (
          <div key={i} className="flex gap-3 text-sm pb-3 border-b border-slate-50 last:border-0">
            <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
            <div className="flex-1"><p className="text-slate-800 dark:text-cream">{a.text}</p></div>
            <p className="text-xs text-slate-400 dark:text-cream-dim/70 tabular whitespace-nowrap">{fmt(a.at)}</p>
          </div>
        ))}
        {items.length === 0 && <EmptyState icon={<Activity size={22} />} title="No activity" body="Platform events will stream here." />}
      </div>
    </div>
    </>
  );
}

function SettingsSec() {
  const toast = useToast();
  const [flags, setFlags] = useState<Record<string, boolean>>({
    open_register: true, company_auto_verify: false, email_notif: true, cert_auto: false,
  });
  const meta: Record<string, [string, string]> = {
    open_register: ["Open registration", "Allow public student & company sign-ups"],
    company_auto_verify: ["Auto-verify companies", "Skip manual verification for new companies"],
    email_notif: ["Email notifications", "Send transactional emails for key events"],
    cert_auto: ["Auto-issue certificates", "Issue certificates automatically on completion"],
  };
  const toggle = (k: string) => {
    setFlags((p) => ({ ...p, [k]: !p[k] }));
    toast("success", "Setting updated.");
  };
  return (
    <div className="max-w-xl space-y-3">
      {Object.keys(meta).map((k) => (
        <div key={k} className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-center gap-4">
          <div className="flex-1">
            <p className="font-bold text-slate-900 dark:text-cream text-sm">{meta[k][0]}</p>
            <p className="text-xs text-slate-500 dark:text-cream-dim">{meta[k][1]}</p>
          </div>
          <button onClick={() => toggle(k)} className={`w-12 h-7 rounded-full transition relative ${flags[k] ? "bg-primary" : "bg-slate-200 dark:bg-white/15"}`}>
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white dark:bg-card shadow transition-all ${flags[k] ? "right-1" : "left-1"}`} />
          </button>
        </div>
      ))}
    </div>
  );
}

function MentorModal({ open, close, reload }: any) {
  const toast = useToast();
  const [f, setF] = useState({ name: "", email: "", password: "mentor123", expertise: "", maxMentees: 10 });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const create = async () => {
    if (!f.name.trim() || !f.email.trim()) return toast("error", "Name and email are required.");
    setBusy(true);
    try {
      await api.adminCreateMentor({
        ...f, maxMentees: Number(f.maxMentees) || 10,
        expertise: f.expertise.split(",").map((s) => s.trim()).filter(Boolean),
      });
      toast("success", "Mentor account created.");
      close();
      reload();
    } catch (e: any) { toast("error", e.detail || "Could not create mentor."); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={close} title="Add a mentor">
      <div className="space-y-4">
        <Input label="Full name" value={f.name} onChange={(e: any) => set("name", e.target.value)} />
        <Input label="Email" value={f.email} onChange={(e: any) => set("email", e.target.value)} />
        <Input label="Temporary password" value={f.password} onChange={(e: any) => set("password", e.target.value)} />
        <Input label="Expertise (comma separated)" placeholder="React, Career guidance…" value={f.expertise} onChange={(e: any) => set("expertise", e.target.value)} />
        <Input label="Max mentees" type="number" value={f.maxMentees} onChange={(e: any) => set("maxMentees", e.target.value)} />
        <button onClick={create} disabled={busy} className="btn-hero w-full py-3 bg-primary btn-primary-glow text-white disabled:opacity-60">
          {busy ? "Creating…" : "Create Mentor"}
        </button>
      </div>
    </Modal>
  );
}
