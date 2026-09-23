import { useEffect, useState } from "react";
import { ChartCard, Donut, HBars, Trend } from "../../../components/charts";
import { Spinner } from "../../../components/ui";
import { api, safe } from "../../../lib/api";

const FALLBACK = {
  interns: [
    { name: "Aarav Sharma", attendancePct: 84, progress: 62, tasksDone: 2, tasksTotal: 8, pending: 3 },
    { name: "Diya Patel", attendancePct: 89, progress: 45, tasksDone: 0, tasksTotal: 2, pending: 2 },
    { name: "Arjun Kumar", attendancePct: 56, progress: 28, tasksDone: 0, tasksTotal: 2, pending: 2 },
  ],
  reviewsPerWeek: [
    { week: "Aug 31", total: 6, count: 6 }, { week: "Sep 7", total: 8, count: 8 }, { week: "Sep 14", total: 5, count: 5 },
  ],
  pending: { updates: 3, tasks: 4 },
};

export default function MReports() {
  const [r, setR] = useState<any>(null);
  useEffect(() => { safe(() => api.reportMentor(), FALLBACK).then((x) => setR(x.data)); }, []);
  if (!r) return <div className="grid place-items-center py-24"><Spinner light /></div>;

  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-2 gap-5">
        <ChartCard title="Intern progress" sub="Overall completion per intern">
          <HBars data={(r.interns || []).map((i: any) => ({ label: i.name, value: i.progress, hint: `${i.progress}%`, color: "#7b39fc" }))} />
        </ChartCard>
        <ChartCard title="Attendance comparison" sub="Present % per intern">
          <HBars data={(r.interns || []).map((i: any) => ({
            label: i.name, value: i.attendancePct, hint: `${i.attendancePct}%`,
            color: i.attendancePct >= 75 ? "#10b981" : i.attendancePct >= 60 ? "#f59e0b" : "#f43f5e",
          }))} />
        </ChartCard>
        <ChartCard title="Reviews completed" sub="Items reviewed per week">
          <Trend data={(r.reviewsPerWeek || []).map((w: any) => ({ label: w.week, value: w.total }))} color="#0ea5e9" />
        </ChartCard>
        <ChartCard title="Pending right now" sub="Queue split">
          <Donut segments={[
            { label: "Daily updates", value: r.pending?.updates || 0, color: "#0ea5e9" },
            { label: "Tasks", value: r.pending?.tasks || 0, color: "#f59e0b" },
          ]} />
        </ChartCard>
      </div>
      <ChartCard title="Task throughput" sub="Completed vs assigned per intern">
        <HBars data={(r.interns || []).map((i: any) => ({
          label: `${i.name} — ${i.tasksDone}/${i.tasksTotal} done`,
          value: i.tasksTotal ? Math.round((i.tasksDone / i.tasksTotal) * 100) : 0,
          hint: `${i.tasksDone}/${i.tasksTotal}`, color: "#10b981",
        }))} />
      </ChartCard>
    </div>
  );
}
