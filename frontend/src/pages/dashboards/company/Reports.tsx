import { useEffect, useState } from "react";
import { ChartCard, HBars, Trend } from "../../../components/charts";
import { Spinner } from "../../../components/ui";
import { api, safe } from "../../../lib/api";

const FALLBACK = {
  funnel: { applied: 1, under_review: 1, shortlisted: 1, selected: 1, rejected: 0 },
  appsPerWeek: [
    { week: "Aug 24", total: 1, count: 1 }, { week: "Aug 31", total: 1, count: 1 },
    { week: "Sep 7", total: 1, count: 1 }, { week: "Sep 14", total: 1, count: 1 },
  ],
  interns: [
    { name: "Aarav Sharma", role: "Frontend Developer Intern", progress: 62, attendancePct: 84, status: "active" },
  ],
};

const FUNNEL_ORDER = ["applied", "under_review", "shortlisted", "selected", "rejected"];
const FUNNEL_COLORS: Record<string, string> = {
  applied: "#94a3b8", under_review: "#0ea5e9", shortlisted: "#f59e0b", selected: "#7b39fc", rejected: "#f43f5e",
};

export default function CReports() {
  const [r, setR] = useState<any>(null);
  useEffect(() => { safe(() => api.reportCompany(), FALLBACK).then((x) => setR(x.data)); }, []);
  if (!r) return <div className="grid place-items-center py-24"><Spinner light /></div>;

  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-2 gap-5">
        <ChartCard title="Hiring funnel" sub="Applications by stage">
          <HBars data={FUNNEL_ORDER.map((k) => ({
            label: k.replace("_", " "), value: r.funnel?.[k] || 0, color: FUNNEL_COLORS[k],
          }))} />
        </ChartCard>
        <ChartCard title="Application velocity" sub="New applications per week">
          <Trend data={(r.appsPerWeek || []).map((w: any) => ({ label: w.week, value: w.total }))} color="#0ea5e9" />
        </ChartCard>
      </div>
      <ChartCard title="Intern progress" sub="Live completion across your interns">
        <HBars data={(r.interns || []).map((i: any) => ({
          label: `${i.name} — ${i.role}`, value: i.progress, hint: `${i.progress}% · ${i.attendancePct}% att.`,
          color: i.status === "completed" ? "#10b981" : "#7b39fc",
        }))} />
      </ChartCard>
    </div>
  );
}
