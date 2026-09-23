import { useEffect, useState } from "react";
import { Mail, Search } from "lucide-react";
import { ChartCard, Donut, HBars, Trend } from "../../../components/charts";
import { Badge, EmptyState, Modal, Spinner } from "../../../components/ui";
import { api, safe } from "../../../lib/api";
import { fmt } from "../../../components/dashbits";

const FALLBACK = {
  newUsersPerWeek: [
    { week: "Aug 17", total: 1, count: 1 }, { week: "Aug 24", total: 2, count: 2 },
    { week: "Sep 7", total: 1, count: 1 }, { week: "Sep 14", total: 2, count: 2 },
  ],
  usersByRole: { student: 3, mentor: 1, company: 2, admin: 1 },
  appsByStatus: { applied: 1, under_review: 2, shortlisted: 1, allocated: 3 },
  internshipsByDomain: { "Web Development": 3, "AI / ML": 1, Design: 1, Data: 1, DevOps: 1, Mobile: 1, Security: 1 },
  allocationsByStatus: { active: 3, completed: 1 },
};

const PALETTE = ["#7b39fc", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#6366f1", "#14b8a6", "#f43f5e"];

export default function AdminReports() {
  const [r, setR] = useState<any>(null);
  useEffect(() => { safe(() => api.reportAdmin(), FALLBACK).then((x) => setR(x.data)); }, []);
  if (!r) return <div className="grid place-items-center py-24"><Spinner light /></div>;

  const donutOf = (obj: any) =>
    Object.entries(obj || {}).map(([k, v]: any, i) => ({ label: k.replace("_", " "), value: v, color: PALETTE[i % PALETTE.length] }));

  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-2 gap-5">
        <ChartCard title="User growth" sub="New sign-ups per week">
          <Trend data={(r.newUsersPerWeek || []).map((w: any) => ({ label: w.week, value: w.total }))} />
        </ChartCard>
        <ChartCard title="Users by role" sub="Platform mix">
          <Donut segments={donutOf(r.usersByRole)} />
        </ChartCard>
        <ChartCard title="Applications by status" sub="Whole platform">
          <Donut segments={donutOf(r.appsByStatus)} />
        </ChartCard>
        <ChartCard title="Allocations by status" sub="Pipeline health">
          <Donut segments={donutOf(r.allocationsByStatus)} />
        </ChartCard>
      </div>
      <ChartCard title="Internships by domain" sub="Supply mix">
        <HBars data={Object.entries(r.internshipsByDomain || {}).map(([k, v]: any, i) => ({ label: k, value: v, color: PALETTE[i % PALETTE.length] }))} />
      </ChartCard>
      <EmailLog />
    </div>
  );
}

export function EmailLog() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [view, setView] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.outbox().then((o) => { setRows(o || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const list = rows.filter((e) =>
    !q || `${e.to} ${e.subject} ${e.kind} ${e.status}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
      <div className="p-4 flex flex-col md:flex-row md:items-center gap-3 border-b border-slate-100 dark:border-white/5">
        <p className="font-extrabold text-slate-900 dark:text-cream flex items-center gap-2">
          <Mail size={18} className="text-violet-600 dark:text-violet-300" /> Email outbox
          <span className="text-xs font-bold text-slate-400 dark:text-cream-dim/70 tabular">({list.length})</span>
        </p>
        <div className="flex-1" />
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-cream-dim/70" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search emails…" className="field-light pl-9 pr-3 py-2 text-sm w-full md:w-56" />
        </div>
      </div>
      {loading ? <div className="grid place-items-center py-10"><Spinner light /></div> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
              <tr>
                {["To", "Subject", "Kind", "Status", "Sent", ""].map((h) => (
                  <th key={h} className="text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-cream-dim/70 px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e._id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-cream-dim">{e.to}</td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-900 dark:text-cream max-w-[280px] truncate">{e.subject}</td>
                  <td className="px-4 py-3 text-sm"><Badge tone="slate">{e.kind}</Badge></td>
                  <td className="px-4 py-3 text-sm">
                    <Badge tone={e.status === "sent" ? "green" : e.status.startsWith("failed") ? "red" : "amber"}>{e.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-cream-dim tabular whitespace-nowrap">{fmt(e.createdAt)}</td>
                  <td className="px-4 py-3 text-sm"><button onClick={() => setView(e)} className="text-xs font-bold text-violet-600 dark:text-violet-300">Preview</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length && <EmptyState icon={<Mail size={22} />} title="Outbox is empty" body="Registrations, OTPs and status changes generate emails here. Configure SMTP_* to actually deliver them." />}
        </div>
      )}
      <Modal open={!!view} onClose={() => setView(null)} title={view?.subject} wide>
        {view && (
          <>
            <p className="text-xs text-cream-dim -mt-2 mb-3">To {view.to} · {view.status} · {fmt(view.createdAt)}</p>
            <iframe title="email preview" srcDoc={view.html} className="w-full h-[420px] rounded-xl bg-white dark:bg-card" sandbox="allow-same-origin" />
          </>
        )}
      </Modal>
    </div>
  );
}
