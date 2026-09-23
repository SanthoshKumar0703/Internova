import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { ChartCard, Donut, HBars, Trend } from "../../../components/charts";
import { EmptyState, Spinner } from "../../../components/ui";
import { api, safe } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { downloadBlob, legalPdf } from "../../../lib/pdf";

const FALLBACK = {
  weeklyHours: [
    { week: "Aug 24", total: 37.5, count: 5 }, { week: "Aug 31", total: 38, count: 5 },
    { week: "Sep 7", total: 30.5, count: 4 }, { week: "Sep 14", total: 35.5, count: 5 },
  ],
  weeklyPresent: [
    { week: "Aug 24", total: 4, count: 4 }, { week: "Aug 31", total: 5, count: 5 },
    { week: "Sep 7", total: 4, count: 4 }, { week: "Sep 14", total: 4, count: 4 },
  ],
  attendance: { present: 16, absent: 2, leave: 1 },
  tasks: { todo: 2, in_progress: 2, review: 2, completed: 2 },
  milestones: [
    { title: "Onboarding & Setup", percent: 100, status: "completed" },
    { title: "Core Feature Sprint", percent: 100, status: "completed" },
    { title: "Integration & Polish", percent: 60, status: "in_progress" },
    { title: "Final Demo & Handover", percent: 0, status: "upcoming" },
  ],
  summary: { progress: 62, attendancePct: 84 },
};

const ATT_COLORS: Record<string, string> = { present: "#10b981", absent: "#f43f5e", leave: "#f59e0b", holiday: "#94a3b8" };
const TASK_COLORS: Record<string, string> = { todo: "#94a3b8", in_progress: "#0ea5e9", review: "#f59e0b", completed: "#10b981" };

export default function SReports() {
  const { user } = useAuth();
  const [r, setR] = useState<any>(null);

  useEffect(() => {
    safe(() => api.reportStudent(), FALLBACK).then((x) => setR(x.data));
  }, []);

  if (!r) return <div className="grid place-items-center py-24"><Spinner light /></div>;
  if (r.empty)
    return <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl"><EmptyState icon={<Download size={22} />} title="No data yet" body="Reports light up once your internship begins and you log work." /></div>;

  const exportPdf = () => {
    const blob = legalPdf("Internship Progress Report", `${user?.name || "Student"} · Generated ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, [
      { heading: "Summary", paragraphs: [`Overall progress: ${r.summary?.progress ?? 0}%. Attendance: ${r.summary?.attendancePct ?? 0}%. Tasks completed: ${r.tasks?.completed || 0}. Milestones completed: ${(r.milestones || []).filter((m: any) => m.status === "completed").length}.`] },
      { heading: "Weekly effort (hours logged)", paragraphs: [(r.weeklyHours || []).map((w: any) => `${w.week}: ${w.total}h`).join("\n") || "No hours logged yet."] },
      { heading: "Attendance split", paragraphs: [Object.entries(r.attendance || {}).map(([k, v]) => `${k}: ${v}`).join(", ")] },
      { heading: "Milestones", paragraphs: [(r.milestones || []).map((m: any) => `${m.title} — ${m.percent}% (${m.status})`).join("\n")] },
    ]);
    downloadBlob(blob, "InterNova-Progress-Report.pdf");
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={exportPdf} className="btn-hero inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#14141a] dark:bg-cream text-white dark:text-[#14141a] text-sm font-cabin">
          <Download size={15} /> Export Report (PDF)
        </button>
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <ChartCard title="Weekly effort" sub="Hours logged per week">
          <Trend data={(r.weeklyHours || []).map((w: any) => ({ label: w.week, value: w.total }))} />
        </ChartCard>
        <ChartCard title="Days present" sub="Attendance per week">
          <Trend data={(r.weeklyPresent || []).map((w: any) => ({ label: w.week, value: w.total }))} color="#10b981" />
        </ChartCard>
        <ChartCard title="Attendance split" sub="All time">
          <Donut segments={Object.entries(r.attendance || {}).map(([k, v]: any) => ({ label: k, value: v, color: ATT_COLORS[k] || "#7b39fc" }))} />
        </ChartCard>
        <ChartCard title="Tasks by status" sub="Current board">
          <Donut segments={Object.entries(r.tasks || {}).map(([k, v]: any) => ({ label: k.replace("_", " "), value: v, color: TASK_COLORS[k] || "#7b39fc" }))} />
        </ChartCard>
      </div>
      <ChartCard title="Milestone completion" sub="Progress per milestone">
        <HBars data={(r.milestones || []).map((m: any) => ({
          label: m.title, value: m.percent, hint: `${m.percent}%`,
          color: m.status === "completed" ? "#10b981" : m.status === "in_progress" ? "#7b39fc" : "#cbd5e1",
        }))} />
      </ChartCard>
    </div>
  );
}
