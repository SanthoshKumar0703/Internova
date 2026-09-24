import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Award, BarChart3, Bell, Briefcase, Building2, CalendarCheck, Check, Download,
  FileText, Home, Inbox, LayoutGrid, MessageSquare, Plus, Star, TrendingUp, Users, XCircle,
} from "lucide-react";
import DashShell from "../../components/DashShell";
import {
  APP_STATUS, Avatar, Badge, EmptyState, Input, Label, Modal,
  ProgressBar, ProgressRing, Select, Spinner, Stat, TextArea, useToast,
} from "../../components/ui";
import { api, safe } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { mockCompanyOverview } from "../../lib/mock";
import { MessagesPanel, NotifsPanel, fmt } from "../../components/dashbits";
import { InsightsSection, SessionsPanel } from "../../components/sessions";
import CReports from "./company/Reports";

export default function Company() {
  const { user } = useAuth();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") || "overview";
  const [ov, setOv] = useState<any>(mockCompanyOverview);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const r = await safe(() => api.overview(), mockCompanyOverview);
    setOv(r.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const setTab = (t: string) => { setSp(t === "overview" ? {} : { tab: t }); window.scrollTo(0, 0); };

  const newApps = (ov.applications || []).filter((a: any) => ["applied", "under_review"].includes(a.status)).length;
  const titles: Record<string, [string, string]> = {
    overview: [`${user?.name || "Company"} HQ`, "Roles, applicants and interns — one command deck."],
    internships: ["Internships", "Publish roles and watch them fill."],
    applications: ["Applications", `${newApps} awaiting your decision.`],
    monitoring: ["Monitoring", "Live progress of every intern."],
    evaluations: ["Evaluations", "Rate interns and issue certificates."],
    reports: ["Reports", "Funnel analytics and intern performance."],
    profile: ["Company Profile", "How students see you."],
    messages: ["Messages", "Talk to interns and mentors."],
    notifications: ["Notifications", "Everything that needs you."],
  };
  const nav = [
    { id: "overview", label: "Overview", icon: <Home size={20} /> },
    { id: "internships", label: "Internships", icon: <Briefcase size={20} /> },
    { id: "applications", label: "Applications", icon: <Inbox size={20} />, badge: newApps || undefined },
    { id: "monitoring", label: "Monitoring", icon: <TrendingUp size={20} /> },
    { id: "evaluations", label: "Evaluations", icon: <Award size={20} /> },
    { id: "reports", label: "Reports", icon: <BarChart3 size={20} /> },
    { id: "profile", label: "Company Profile", icon: <Building2 size={20} /> },
    { id: "messages", label: "Messages", icon: <MessageSquare size={20} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={20} /> },
  ];
  const [title, subtitle] = titles[tab] || titles.overview;

  return (
    <DashShell roleLabel="Company" nav={nav} active={tab} onNav={setTab} title={title} subtitle={subtitle} thin>
      {loading ? <div className="grid place-items-center py-24"><Spinner light /></div> : (
        <>
          {tab === "overview" && <COverview ov={ov} go={setTab} reload={load} />}
          {tab === "internships" && <Internships ov={ov} reload={load} />}
          {tab === "applications" && <Applications ov={ov} reload={load} monitor={(id: string) => { setSp({ tab: "monitoring", allocation: id }); window.scrollTo(0, 0); }} />}
          {tab === "monitoring" && <Monitoring ov={ov} go={setTab} />}
          {tab === "evaluations" && <Evaluations ov={ov} reload={load} />}
          {tab === "reports" && <CReports />}
          {tab === "profile" && <CompanyProfile reload={load} />}
          {tab === "messages" && <MessagesPanel directoryMode="company" empty="Conversations with your team will appear here." />}
          {tab === "notifications" && <NotifsPanel />}
        </>
      )}
    </DashShell>
  );
}

function COverview({ ov, go, reload }: any) {
  const ints = ov.internships || [];
  const apps = ov.applications || [];
  const allocs = ov.allocations || [];
  const active = allocs.filter((a: any) => a.status === "active");
  const newApps = apps.filter((a: any) => ["applied", "under_review"].includes(a.status));
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<Briefcase size={19} />} label="Live roles" value={ints.length} tone="purple" />
        <Stat icon={<Inbox size={19} />} label="New applications" value={newApps.length} sub={`${apps.length} total`} tone="amber" />
        <Stat icon={<Users size={19} />} label="Active interns" value={active.length} tone="green" />
        <Stat icon={<Award size={19} />} label="Certified" value={allocs.filter((a: any) => a.status === "completed").length} tone="blue" />
      </div>
      <InsightsSection onPick={() => go("monitoring")} />
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 dark:text-cream-dim uppercase tracking-wide">Latest applicants</p>
            <button onClick={() => go("applications")} className="text-xs font-bold text-violet-600 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-200">Review all</button>
          </div>
          <div className="mt-3 space-y-2.5">
            {apps.slice(0, 4).map((a: any) => (
              <div key={a._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition">
                <Avatar name={a.student?.name} avatar={a.student?.avatar} color={a.student?.color} size={38} />
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-sm text-slate-900 dark:text-cream truncate">{a.student?.name}</span>
                  <span className="block text-xs text-slate-500 dark:text-cream-dim truncate">{a.internship?.title} · {(a.student?.skills || []).slice(0, 3).join(", ")}</span>
                </span>
                <Badge tone={(APP_STATUS[a.status] || APP_STATUS.applied).tone}>{(APP_STATUS[a.status] || APP_STATUS.applied).label}</Badge>
              </div>
            ))}
            {apps.length === 0 && <p className="text-sm text-slate-400 dark:text-cream-dim/70">No applications yet — publish a role to get started.</p>}
          </div>
        </div>
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 dark:text-cream-dim uppercase tracking-wide">Interns right now</p>
            <button onClick={() => go("monitoring")} className="text-xs font-bold text-violet-600 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-200">Monitor</button>
          </div>
          <div className="mt-3 space-y-3">
            {active.slice(0, 4).map((a: any) => (
              <div key={a._id} className="flex items-center gap-3">
                <Avatar name={a.student?.name} avatar={a.student?.avatar} color={a.student?.color} size={36} />
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-sm text-slate-900 dark:text-cream truncate">{a.student?.name}</span>
                  <span className="block text-xs text-slate-500 dark:text-cream-dim truncate">{a.internship?.title}</span>
                </span>
                <span className="w-24 hidden sm:block"><ProgressBar value={a.summary?.progress || 0} /></span>
                <span className="text-xs font-bold text-slate-500 dark:text-cream-dim tabular w-9">{a.summary?.progress || 0}%</span>
              </div>
            ))}
            {active.length === 0 && (
              <EmptyState icon={<Users size={22} />} title="No active interns" body="Accept an application to onboard your first intern."
                action={<button onClick={() => go("applications")} className="btn-hero px-5 py-2 bg-primary text-white text-sm font-cabin">View Applications</button>} />
            )}
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
        <p className="text-xs font-bold text-slate-500 dark:text-cream-dim uppercase tracking-wide">Recent activity</p>
        <div className="mt-3 grid md:grid-cols-2 gap-x-8 gap-y-2.5">
          {(ov.activity || []).slice(0, 6).map((a: any, i: number) => (
            <div key={i} className="flex gap-3 text-sm">
              <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
              <div><p className="text-slate-800 dark:text-cream">{a.text}</p><p className="text-xs text-slate-400 dark:text-cream-dim/70 tabular">{fmt(a.at)}</p></div>
            </div>
          ))}
          {(ov.activity || []).length === 0 && <p className="text-sm text-slate-400 dark:text-cream-dim/70">No activity yet.</p>}
        </div>
      </div>
    </div>
  );
}

function Internships({ ov, reload }: any) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [f, setF] = useState({ title: "", domain: "", description: "", skills: "", mode: "Remote", location: "", duration: "", stipend: "", openings: 1, deadline: "", responsibilities: "" });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const create = async () => {
    if (!f.title.trim() || !f.domain) return toast("error", "Title and domain are required.");
    try {
      await api.createInternship({
        ...f, openings: Number(f.openings) || 1,
        skills: f.skills.split(",").map((s) => s.trim()).filter(Boolean),
        responsibilities: f.responsibilities.split("\n").map((s) => s.trim()).filter(Boolean),
      });
      toast("success", "Role published!");
      setOpen(false);
      setF({ title: "", domain: "", description: "", skills: "", mode: "Remote", location: "", duration: "", stipend: "", openings: 1, deadline: "", responsibilities: "" });
      reload();
    } catch { toast("error", "Could not publish — is the server running?"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="btn-hero inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white text-sm font-cabin"><Plus size={15} /> Post Internship</button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {(ov.internships || []).map((it: any) => {
          const n = (ov.applications || []).filter((a: any) => a.internshipId === it._id).length;
          return (
            <button key={it._id} onClick={() => setSelected(it)} className="w-full text-left bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5 card-hover">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-extrabold text-slate-900 dark:text-cream">{it.title}</p>
                  <p className="text-xs text-slate-500 dark:text-cream-dim mt-0.5">{it.domain} · {it.mode} · {it.location} · {it.duration}</p>
                </div>
                <Badge tone="purple">{n} applied</Badge>
              </div>
              <p className="text-sm text-slate-500 dark:text-cream-dim mt-2 line-clamp-2">{it.description}</p>
              <div className="flex items-center justify-between mt-3 text-xs text-slate-500 dark:text-cream-dim">
                <span>{it.stipend} · {it.openings} openings</span>
                <span className="tabular">Apply by {fmt(it.deadline)}</span>
              </div>
            </button>
          );
        })}
      </div>
      {(ov.internships || []).length === 0 && <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl"><EmptyState icon={<Briefcase size={22} />} title="No roles yet" body="Post your first internship and meet ambitious students." /></div>}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title || "Internship details"} wide>
        {selected && (() => {
          const count = (ov.applications || []).filter((a: any) => a.internshipId === selected._id).length;
          return <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-cream-dim">
              <Badge tone={selected.status === "open" ? "green" : selected.status === "pending_approval" ? "amber" : "slate"}>{String(selected.status || "open").replace("_", " ")}</Badge>
              <span>{selected.domain}</span><span>·</span><span>{count} applicants</span>
            </div>
            <p className="text-sm leading-6 text-slate-600 dark:text-cream-dim">{selected.description || "No description provided."}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[["Mode", selected.mode], ["Location", selected.location], ["Duration", selected.duration], ["Stipend", selected.stipend || "Unpaid"], ["Openings", selected.openings], ["Apply by", fmt(selected.deadline)]].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-cream-dim/70">{label}</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-cream mt-1">{value || "—"}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-cream-dim">Required skills</p>
              <div className="flex flex-wrap gap-1.5 mt-2">{(selected.skills || []).map((skill: string) => <Badge key={skill} tone="purple">{skill}</Badge>)}</div>
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-cream-dim">Responsibilities</p>
              <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-cream-dim list-disc pl-5">{(selected.responsibilities || []).map((item: string) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>;
        })()}
      </Modal>

      <Modal open={open} onClose={() => setOpen(false)} title="Post a new internship" wide>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Input label="Role title" placeholder="e.g. Frontend Developer Intern" value={f.title} onChange={(e: any) => set("title", e.target.value)} /></div>
          <Input label="Domain" placeholder="e.g. Web Development" value={f.domain} onChange={(e: any) => set("domain", e.target.value)} />
          <Input label="Skills (comma separated)" placeholder="React, TypeScript, Tailwind" value={f.skills} onChange={(e: any) => set("skills", e.target.value)} />
          <div className="md:col-span-2"><TextArea label="Description" value={f.description} onChange={(e: any) => set("description", e.target.value)} /></div>
          <div className="md:col-span-2"><TextArea label="Responsibilities (one per line)" value={f.responsibilities} onChange={(e: any) => set("responsibilities", e.target.value)} /></div>
          <div><Label>Mode</Label><Select value={f.mode} onChange={(e: any) => set("mode", e.target.value)} options={["Remote", "Hybrid", "On-site"]} /></div>
          <Input label="Location" placeholder="Bengaluru / Remote" value={f.location} onChange={(e: any) => set("location", e.target.value)} />
          <Input label="Duration" placeholder="e.g. 3 months" value={f.duration} onChange={(e: any) => set("duration", e.target.value)} />
          <Input label="Stipend" placeholder="e.g. ₹15,000/month" value={f.stipend} onChange={(e: any) => set("stipend", e.target.value)} />
          <Input label="Openings" type="number" min="1" value={f.openings} onChange={(e: any) => set("openings", e.target.value)} />
          <Input label="Application deadline" type="date" value={f.deadline} onChange={(e: any) => set("deadline", e.target.value)} />
        </div>
        <button onClick={create} className="btn-hero w-full mt-5 py-3 bg-primary btn-primary-glow text-white">Publish Role</button>
      </Modal>
    </div>
  );
}

function Applications({ ov, reload, monitor }: any) {
  const toast = useToast();
  const [filter, setFilter] = useState("");
  const [roster, setRoster] = useState<string[]>([]);
  const [rank, setRank] = useState<Record<string, any>>({});
  const [mentorMatches, setMentorMatches] = useState<Record<string, any[]>>({});
  const [byMatch, setByMatch] = useState(false);
  const apps = (ov.applications || []).filter((a: any) => !filter || a.status === filter);
  const loadRank = async (iid: string) => {
    try {
      const r = await api.rankApps(iid);
      setRank((p) => { const n = { ...p }; r.forEach((x: any) => { n[x.application._id] = x; }); return n; });
    } catch {}
  };
  const loadMentorMatches = async (iid: string, appId: string) => {
    try {
      const r = await api.mentorMatches(iid);
      setMentorMatches((p) => ({ ...p, [appId]: r }));
    } catch {
      setMentorMatches((p) => ({ ...p, [appId]: [] }));
    }
  };
  useEffect(() => { Array.from(new Set((ov.applications || []).map((a: any) => a.internshipId))).forEach((iid: any) => loadRank(iid)); }, [ov]);
  useEffect(() => {
    (ov.applications || []).forEach((a: any) => {
      if (a.status === "accepted") loadMentorMatches(a.internshipId, a._id);
    });
  }, [ov.applications]);
  const shown = byMatch ? [...apps].sort((a, b) => (rank[b._id]?.score ?? -1) - (rank[a._id]?.score ?? -1)) : apps;

  const decide = async (a: any, status: string) => {
    try {
      await api.decideApplication(a._id, { status });
      const label = status === "shortlisted" ? "Shortlisted." : status === "under_review" ? "Moved to review." : status === "accepted" ? "Accepted." : "Rejected.";
      toast("success", label);
      reload();
    } catch { toast("error", "Could not update."); }
  };

  const alloc = async (a: any, mentorId: string) => {
    try {
      const r = await api.allocate({ applicationId: a._id, mentorId });
      toast("success", r.autoAssigned ? `Onboarded with ${r.mentorName} (auto-matched)!` : "Onboarded! Offer letter ready.");
      setRoster((p) => [...p, r._id]);
      reload();
    } catch (e: any) { toast("error", e.detail || "Could not allocate."); }
  };

  const offer = (id: string) => {
    window.open(`/api/files/offer_placeholder`, "_blank");
    toast("info", "Offer letter downloads from the allocation record.");
    void id;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {(["", "applied", "under_review", "shortlisted", "accepted", "selected", "rejected"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition ${filter === s ? "bg-[#14141a] dark:bg-cream text-white dark:text-[#14141a]" : "bg-white dark:bg-card border border-slate-200 dark:border-white/10 text-slate-600 dark:text-cream-dim"}`}>
            {s === "" ? "All" : (APP_STATUS as any)[s].label}
          </button>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={() => setByMatch((v) => !v)}
          className={`text-xs font-bold px-3.5 py-2 rounded-full transition ${byMatch ? "bg-primary text-white" : "bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-cream-dim"}`}>
          {byMatch ? "✓ Sorted by match" : "Sort by match score"}
        </button>
      </div>
      {shown.map((a: any) => {
        const st = APP_STATUS[a.status] || APP_STATUS.applied;
        const allocation = (ov.allocations || []).find((item: any) => item.internshipId === a.internshipId && item.studentId === a.studentId);
        return (
          <div key={a._id} className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
            <div className="flex flex-wrap items-start gap-4">
              <Avatar name={a.student?.name} avatar={a.student?.avatar} color={a.student?.color} size={50} />
              <div className="flex-1 min-w-[220px]">
                <p className="font-extrabold text-slate-900 dark:text-cream">{a.student?.name}</p>
                <p className="text-xs text-slate-500 dark:text-cream-dim">{a.student?.email} {a.student?.phone && `· ${a.student.phone}`} · {a.student?.college}</p>
                <p className="text-xs text-slate-500 dark:text-cream-dim mt-0.5">for <b>{a.internship?.title}</b> · {fmt(a.appliedAt)}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(a.student?.skills || []).map((s: string) => <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 font-semibold">{s}</span>)}
                </div>
                {a.student?.resumeName && <p className="text-xs text-slate-500 dark:text-cream-dim mt-2 flex items-center gap-1.5"><FileText size={13} /> {a.student.resumeName}</p>}
              </div>
              <span className="flex flex-col items-end gap-1.5"><Badge tone={st.tone}>{st.label}</Badge>
                {rank[a._id] && <span className="text-[11px] font-extrabold text-primary tabular" title={(rank[a._id].reasons || []).join(" · ")}>✨ {rank[a._id].score}% match</span>}</span>
            </div>
            {a.coverLetter && <p className="text-sm text-slate-500 dark:text-cream-dim mt-3 italic border-l-2 border-violet-200 dark:border-violet-400/30 pl-3">“{a.coverLetter}”</p>}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {a.status === "applied" && <button onClick={() => decide(a, "under_review")} className="btn-hero px-4 py-2 bg-sky-500 text-white text-xs font-cabin">Move to Review</button>}
              {["applied", "under_review"].includes(a.status) && <button onClick={() => decide(a, "shortlisted")} className="btn-hero px-4 py-2 bg-primary text-white text-xs font-cabin">Shortlist</button>}
              {["applied", "under_review", "shortlisted"].includes(a.status) && <button onClick={() => decide(a, "accepted")} className="btn-hero px-4 py-2 bg-emerald-500 text-white text-xs font-cabin">Accept</button>}
              {["applied", "under_review", "shortlisted"].includes(a.status) && <button onClick={() => decide(a, "rejected")} className="btn-hero px-4 py-2 bg-slate-200 dark:bg-white/15 text-slate-700 dark:text-cream-dim text-xs font-cabin inline-flex items-center gap-1"><XCircle size={13} /> Reject</button>}
              {a.status === "accepted" && (
                <div className="mt-4 w-full rounded-2xl border border-violet-200 dark:border-violet-500/20 bg-violet-50/80 dark:bg-violet-500/5 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-300">Mentor match shortlist</p>
                    <span className="text-[11px] text-slate-500 dark:text-cream-dim">AI score based on skills and capacity</span>
                  </div>
                  <div className="grid gap-3">
                    {(mentorMatches[a._id] || []).slice(0, 4).map((m: any) => (
                      <div key={m.mentor._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 dark:text-cream">{m.mentor.name}</span>
                            <Badge tone="purple">{m.score}% match</Badge>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-cream-dim mt-1">{m.mentor.expertise?.slice(0, 3).join(" · ") || "Mentor"} · {m.mentor.experience || "Experience pending"}</p>
                          <p className="text-xs text-slate-500 dark:text-cream-dim mt-1 line-clamp-2">{m.mentor.bio || "Mentor profile is available for guidance and review."}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {(m.mentor.expertise || []).slice(0, 5).map((skill: string) => (
                              <span key={skill} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 font-semibold">{skill}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => alloc(a, m.mentor._id)} className="btn-hero px-3.5 py-2 bg-emerald-500 text-white text-xs font-cabin inline-flex items-center gap-1"><Check size={13} /> Assign</button>
                        </div>
                      </div>
                    ))}
                    {(mentorMatches[a._id] || []).length === 0 && (
                      <p className="text-sm text-slate-500 dark:text-cream-dim">No mentor matches found yet. Please review mentor availability and assign manually.</p>
                    )}
                  </div>
                </div>
              )}
              {allocation && <button onClick={() => monitor(allocation._id)} className="btn-hero px-4 py-2 bg-sky-500 text-white text-xs font-cabin inline-flex items-center gap-1"><TrendingUp size={13} /> Monitor intern</button>}
              {a.status === "selected" && (
                <span className="inline-flex items-center gap-2 ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-300">
                  <Check size={14} /> Onboarded
                  <a href={a.offerUrl || "#"} target="_blank" rel="noreferrer" className="btn-hero inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-cream-dim"><Download size={13} /> Offer letter</a>
                </span>
              )}
            </div>
          </div>
        );
      })}
      {apps.length === 0 && <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl"><EmptyState icon={<Inbox size={22} />} title="No applications" body="Applications to your roles will land here." /></div>}
    </div>
  );
}

function Monitoring({ ov, go }: any) {
  const [sp] = useSearchParams();
  const allocs = ov.allocations || ov.interns || [];
  const [sel, setSel] = useState("");
  const [detail, setDetail] = useState<any>(null);
  const requested = sp.get("allocation");
  const cur = allocs.find((a: any) => a._id === (requested || sel)) || allocs[0];

  useEffect(() => {
    if (!cur) return;
    api.allocation(cur._id).then(setDetail).catch(() => setDetail(null));
  }, [cur?._id]);
  useEffect(() => { if (requested && allocs.some((a: any) => a._id === requested)) setSel(requested); else if (!sel && allocs[0]) setSel(allocs[0]._id); }, [allocs.length, requested]);

  if (!cur)
    return (
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-6">
        <EmptyState icon={<TrendingUp size={22} />} title="No interns to monitor" body="Monitoring starts after you accept an application, choose a mentor, and click Assign from the Applications tab." />
        <div className="max-w-2xl mx-auto mt-5 grid sm:grid-cols-3 gap-3">
          {[["1", "Review", "Open Applications and review a student."], ["2", "Assign", "Choose a mentor from the matching shortlist and assign them."], ["3", "Monitor", "The intern will appear here after onboarding." ]].map(([n, title, body]) => (
            <div key={n} className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-3.5">
              <span className="w-7 h-7 rounded-full bg-primary text-white grid place-items-center text-xs font-bold">{n}</span>
              <p className="font-bold text-sm text-slate-900 dark:text-cream mt-2">{title}</p>
              <p className="text-xs text-slate-500 dark:text-cream-dim mt-1">{body}</p>
            </div>
          ))}
        </div>
        <button onClick={() => go("applications")} className="btn-hero block mx-auto mt-5 px-5 py-2.5 bg-primary text-white text-sm font-cabin">Open Applications</button>
      </div>
    );

  const pct = cur.summary?.progress || 0;
  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-4">
        <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-cream-dim mb-3">Select intern to monitor</p>
        <div className="flex flex-wrap gap-2">
          {allocs.map((a: any) => <button key={`monitor-${a._id}`} onClick={() => setSel(a._id)} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition ${cur._id === a._id ? "bg-primary text-white" : "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-cream-dim hover:bg-violet-100 dark:hover:bg-violet-500/20"}`}><Avatar name={a.student?.name} avatar={a.student?.avatar} color={a.student?.color} size={26} /> Monitor {a.student?.name}</button>)}
        </div>
      </div>
      <div className="grid lg:grid-cols-[280px_1fr] gap-5">
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-2.5 space-y-1.5 h-fit">
        {allocs.map((a: any) => (
          <button key={a._id} onClick={() => setSel(a._id)}
            className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition ${cur._id === a._id ? "bg-violet-100 dark:bg-violet-500/15" : "hover:bg-slate-50 dark:hover:bg-white/5"}`}>
            <Avatar name={a.student?.name} avatar={a.student?.avatar} color={a.student?.color} size={38} />
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-sm text-slate-900 dark:text-cream truncate">{a.student?.name}</span>
              <span className="block text-xs text-slate-500 dark:text-cream-dim truncate">{a.internship?.title}</span>
            </span>
            <span className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-bold text-white">Monitor</span>
          </button>
        ))}
      </div>
      <div className="space-y-5">
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={cur.student?.name} avatar={cur.student?.avatar} color={cur.student?.color} size={52} />
            <div className="flex-1 min-w-[180px]">
              <p className="font-extrabold text-lg text-slate-900 dark:text-cream">{cur.student?.name}</p>
              <p className="text-sm text-slate-500 dark:text-cream-dim">{cur.internship?.title} · Mentor: {cur.mentor?.name}</p>
            </div>
            <div className="text-center">
              <ProgressRing value={pct} size={90}>
                <span className="text-sm font-extrabold text-slate-900 dark:text-cream tabular">{pct}%</span>
              </ProgressRing>
            </div>
            <div className="text-center">
              <ProgressRing value={cur.summary?.attendancePct || 0} size={90} color="#10b981" track="#e6f7ef">
                <span className="text-sm font-extrabold text-slate-900 dark:text-cream tabular">{cur.summary?.attendancePct || 0}%</span>
              </ProgressRing>
            </div>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Stat icon={<LayoutGrid size={19} />} label="Tasks" value={`${cur.summary?.tasks.done}/${cur.summary?.tasks.total}`} tone="blue" />
          <Stat icon={<CalendarCheck size={19} />} label="Attendance" value={`${cur.summary?.attendance.present}/${cur.summary?.attendance.total}`} tone="green" />
          <Stat icon={<Award size={19} />} label="Milestones" value={`${cur.summary?.milestones.done}/${cur.summary?.milestones.total}`} tone="purple" />
        </div>
        <SessionsPanel allocationId={cur._id} role="company" />
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
            <p className="text-xs font-bold text-slate-500 dark:text-cream-dim uppercase tracking-wide mb-3">Latest updates</p>
            <div className="space-y-2.5">
              {(detail?.updates || []).slice(0, 4).map((u: any) => (
                <div key={u._id} className="text-sm rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 px-3 py-2.5">
                  <p className="font-bold text-slate-800 dark:text-cream tabular">{fmt(u.date)} {u.hours ? `· ${u.hours}h` : ""}</p>
                  <p className="text-slate-600 dark:text-cream-dim">{u.completed}</p>
                </div>
              ))}
              {(detail?.updates || []).length === 0 && <p className="text-sm text-slate-400 dark:text-cream-dim/70">No updates yet.</p>}
            </div>
          </div>
          <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
            <p className="text-xs font-bold text-slate-500 dark:text-cream-dim uppercase tracking-wide mb-3">Open tasks</p>
            <div className="space-y-2.5">
              {(detail?.tasks || []).filter((t: any) => t.status !== "completed").slice(0, 5).map((t: any) => (
                <div key={t._id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate font-medium text-slate-800 dark:text-cream">{t.title}</span>
                  <Badge tone={t.status === "review" ? "amber" : "slate"}>{t.status.replace("_", " ")}</Badge>
                </div>
              ))}
              {(detail?.tasks || []).filter((t: any) => t.status !== "completed").length === 0 && <p className="text-sm text-slate-400 dark:text-cream-dim/70">All tasks complete. 🎉</p>}
            </div>
            <button onClick={() => go("evaluations")} className="btn-hero w-full mt-4 py-2.5 bg-[#14141a] dark:bg-cream text-white dark:text-[#14141a] text-sm font-cabin">Evaluate & Certify</button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

function Evaluations({ ov, reload }: any) {
  const toast = useToast();
  const allocs = (ov.allocations || []).filter((a: any) => a.status === "active");
  const [sel, setSel] = useState("");
  const [f, setF] = useState({ technical: 4, communication: 4, ownership: 4, grade: "A", comments: "" });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  const [busy, setBusy] = useState(false);
  const [cert, setCert] = useState<any>(null);

  const submit = async () => {
    if (!sel) return toast("error", "Pick an intern to evaluate.");
    setBusy(true);
    try {
      await api.companyEval(sel, f);
      const c = await api.completeAllocation(sel, {});
      setCert(c.certificate);
      toast("success", "Evaluation saved — certificate issued!");
      reload();
    } catch (e: any) { toast("error", e.detail || "Could not complete."); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4 h-fit">
        <p className="font-extrabold text-slate-900 dark:text-cream">Final evaluation</p>
        <div>
          <Label>Intern</Label>
          <Select value={sel} onChange={(e: any) => setSel(e.target.value)} tone="light"
            options={[{ value: "", label: "Select an intern…" }, ...allocs.map((a: any) => ({ value: a._id, label: `${a.student?.name} · ${a.internship?.title}` }))]} />
        </div>
        {(["technical", "communication", "ownership"] as const).map((k) => (
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
        <div>
          <Label>Grade</Label>
          <div className="flex gap-2">
            {["S", "A", "B", "C"].map((g) => (
              <button key={g} onClick={() => set("grade", g)}
                className={`w-11 h-11 rounded-xl font-extrabold transition ${f.grade === g ? "bg-primary text-white" : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-cream-dim"}`}>{g}</button>
            ))}
          </div>
        </div>
        <TextArea tone="light" label="Comments" value={f.comments} onChange={(e: any) => set("comments", e.target.value)} />
        <button onClick={submit} disabled={busy} className="btn-hero w-full py-3 bg-primary text-white font-cabin disabled:opacity-60">
          {busy ? "Issuing…" : "Submit & Issue Certificate"}
        </button>
      </div>
      <div>
        {cert ? (
          <div className="rounded-2xl p-[1.5px] bg-gradient-to-br from-primary via-magenta to-primary">
            <div className="bg-white dark:bg-card rounded-2xl p-6 text-center">
              <Award size={40} className="mx-auto text-primary" />
              <p className="font-extrabold text-xl text-slate-900 dark:text-cream mt-2">Certificate issued</p>
              <p className="font-mono text-slate-500 dark:text-cream-dim tabular mt-1">{cert._id}</p>
              <p className="text-sm text-slate-500 dark:text-cream-dim mt-2">{cert.studentName} · {cert.role}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl">
            <EmptyState icon={<Award size={22} />} title="No certificate yet" body="Evaluate an intern to generate their verifiable certificate instantly." />
          </div>
        )}
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5 mt-5">
          <p className="text-xs font-bold text-slate-500 dark:text-cream-dim uppercase tracking-wide mb-3">Eligible interns</p>
          <div className="space-y-2">
            {allocs.map((a: any) => (
              <button key={a._id} onClick={() => setSel(a._id)} className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition ${sel === a._id ? "bg-violet-100 dark:bg-violet-500/15" : "hover:bg-slate-50 dark:hover:bg-white/5"}`}>
                <Avatar name={a.student?.name} avatar={a.student?.avatar} color={a.student?.color} size={36} />
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-sm text-slate-900 dark:text-cream truncate">{a.student?.name}</span>
                  <span className="block text-xs text-slate-500 dark:text-cream-dim truncate">{a.internship?.title}</span>
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-cream-dim tabular">{a.summary?.progress}%</span>
              </button>
            ))}
            {allocs.length === 0 && <p className="text-sm text-slate-400 dark:text-cream-dim/70">No active interns right now.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompanyProfile({ reload }: any) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({
    name: user?.name || "", website: user?.website || "", industry: user?.industry || "",
    size: user?.size || "", location: user?.location || "", about: user?.about || "",
    contactName: user?.contactName || "", contactRole: user?.contactRole || "", contactPhone: user?.contactPhone || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true);
    try {
      const u = await api.patchUser(user!._id, { ...f, profileComplete: true });
      setUser(u);
      toast("success", "Company profile saved.");
      reload();
    } catch { toast("error", "Could not save — is the server running?"); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex items-center gap-4">
        <span className="w-14 h-14 rounded-2xl grid place-items-center text-white font-extrabold text-xl" style={{ background: "linear-gradient(135deg,#7b39fc,#2a0a5e)" }}>
          {(f.name || "C").split(" ").map((w) => w[0]).slice(0, 2).join("")}
        </span>
        <div>
          <p className="font-extrabold text-lg text-slate-900 dark:text-cream">{f.name || "Company"}</p>
          <p className="text-sm text-slate-500 dark:text-cream-dim">{user?.email}</p>
        </div>
      </div>
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5 grid md:grid-cols-2 gap-4">
        <Input tone="light" label="Company name" value={f.name} onChange={(e: any) => set("name", e.target.value)} />
        <Input tone="light" label="Website" value={f.website} onChange={(e: any) => set("website", e.target.value)} />
        <Input tone="light" label="Industry" value={f.industry} onChange={(e: any) => set("industry", e.target.value)} />
        <Input tone="light" label="Company size" value={f.size} onChange={(e: any) => set("size", e.target.value)} />
        <div className="md:col-span-2"><Input tone="light" label="Location" value={f.location} onChange={(e: any) => set("location", e.target.value)} /></div>
        <div className="md:col-span-2"><TextArea tone="light" label="About" value={f.about} onChange={(e: any) => set("about", e.target.value)} /></div>
        <Input tone="light" label="Contact person" value={f.contactName} onChange={(e: any) => set("contactName", e.target.value)} />
        <Input tone="light" label="Contact role" value={f.contactRole} onChange={(e: any) => set("contactRole", e.target.value)} />
        <Input tone="light" label="Contact phone" value={f.contactPhone} onChange={(e: any) => set("contactPhone", e.target.value)} />
      </div>
      <button onClick={save} disabled={busy} className="btn-hero px-8 py-3 bg-primary text-white font-cabin disabled:opacity-60">
        {busy ? "Saving…" : "Save Profile"}
      </button>
    </div>
  );
}
