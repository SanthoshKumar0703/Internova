
export const mockInternships = [
  {
    _id: "int_fe", title: "Frontend Developer Intern", companyId: "u_technova",
    companyName: "TechNova Solutions", domain: "Web Development",
    skills: ["React", "TypeScript", "Tailwind CSS", "Git"], mode: "Remote",
    location: "Remote (India)", duration: "6 months", durationMonths: 6,
    stipend: "₹15,000 / month", openings: 4, startDate: "2026-07-01",
    deadline: "2026-06-25", postedAt: "2026-06-01", status: "open",
    description: "Join the Design Engineering pod and help build the analytics dashboard used by 2,000+ teams.",
    responsibilities: ["Build responsive React + TypeScript interfaces", "Implement design-system components"],
    applicants: 12,
  },
  {
    _id: "int_ml", title: "Machine Learning Intern", companyId: "u_datawings",
    companyName: "DataWings Analytics", domain: "AI / ML",
    skills: ["Python", "PyTorch", "SQL", "Statistics"], mode: "Remote",
    location: "Remote (India)", duration: "6 months", durationMonths: 6,
    stipend: "₹20,000 / month", openings: 2, startDate: "2026-10-15",
    deadline: "2026-09-30", postedAt: "2026-08-28", status: "open",
    description: "Train and evaluate demand-forecasting models on real retail data.",
    responsibilities: ["Explore and clean large retail datasets", "Train baseline forecasters"],
    applicants: 21,
  },
  {
    _id: "int_be", title: "Backend Developer Intern", companyId: "u_technova",
    companyName: "TechNova Solutions", domain: "Web Development",
    skills: ["Python", "FastAPI", "MongoDB", "Docker"], mode: "Hybrid",
    location: "Bengaluru, IN", duration: "6 months", durationMonths: 6,
    stipend: "₹18,000 / month", openings: 3, startDate: "2026-10-01",
    deadline: "2026-09-25", postedAt: "2026-08-20", status: "open",
    description: "Work on ingestion APIs that process millions of events a day.",
    responsibilities: ["Design and build FastAPI endpoints", "Model data in MongoDB"],
    applicants: 9,
  },
];

export const mockVerify = {
  certificateId: "INT-2026-004821",
  studentName: "Aarav Sharma",
  company: "PixelKraft Studio",
  role: "Web Development Intern",
  duration: "Jan 2026 – Jun 2026",
  completionDate: "2026-06-30",
  grade: "A",
  skills: ["HTML", "CSS", "JavaScript", "React"],
  status: "VERIFIED",
  issuedAt: "2026-07-02T10:00:00",
};

export const mockStudentOverview = {
  role: "student",
  allocation: {
    _id: "al_arav", status: "active", startDate: "2026-07-01", endDate: "2026-12-31",
    progress: 62,
    internship: mockInternships[0],
    mentor: { _id: "u_kavya", name: "Dr. Kavya Menon", role: "mentor", avatar: "KM", color: "#ec4899", expertise: ["Full-Stack Development", "Cloud"] },
    summary: {
      attendancePct: 84,
      attendance: { present: 16, total: 19 },
      tasks: { done: 2, total: 8 },
      milestones: { done: 2, total: 4 },
      progress: 62,
    },
  },
  allocations: [],
  applications: [
    { _id: "ap_arav_fe", status: "allocated", appliedAt: "2026-06-08", internship: mockInternships[0] },
    { _id: "ap_arav_be", status: "shortlisted", appliedAt: "2026-08-25", internship: mockInternships[2] },
    { _id: "ap_arav_ml", status: "under_review", appliedAt: "2026-09-02", internship: mockInternships[1] },
  ],
  certificates: [{ _id: "INT-2026-004821", studentName: "Aarav Sharma", companyName: "PixelKraft Studio", role: "Web Development Intern", duration: "Jan 2026 – Jun 2026", completionDate: "2026-06-30", status: "valid", grade: "A", skills: ["HTML", "CSS", "JavaScript", "React"], issuedAt: "2026-07-02T10:00:00" }],
  deadlines: [
    { kind: "task", title: "Export-to-CSV test coverage", due: "2026-09-18" },
    { kind: "task", title: "Notifications centre UI", due: "2026-09-24" },
    { kind: "milestone", title: "Integration & Polish", due: "2026-10-10" },
  ],
  activity: [
    { kind: "update", text: "Daily update for 2026-09-17 (pending)", at: "2026-09-17T18:00:00" },
    { kind: "task", text: "Task “Dashboard empty states” → review", at: "2026-09-16T10:00:00" },
  ],
  daysRemaining: 104,
  notifications: [],
};

export const mockMentorOverview = {
  role: "mentor",
  interns: [
    { _id: "al_arav", status: "active", progress: 62, dot: "on-track", pendingUpdates: 1, pendingTasks: 2,
      student: { _id: "u_arav", name: "Aarav Sharma", avatar: "AS", color: "#7b39fc" },
      internship: { title: "Frontend Developer Intern", companyName: "TechNova Solutions" },
      summary: { attendancePct: 84, attendance: { present: 16, total: 19 }, tasks: { done: 2, total: 8 }, milestones: { done: 2, total: 4 }, progress: 62 } },
    { _id: "al_diya", status: "active", progress: 45, dot: "on-track", pendingUpdates: 1, pendingTasks: 1,
      student: { _id: "u_diya", name: "Diya Patel", avatar: "DP", color: "#0ea5e9" },
      internship: { title: "Data Analyst Intern", companyName: "DataWings Analytics" },
      summary: { attendancePct: 89, attendance: { present: 8, total: 9 }, tasks: { done: 0, total: 2 }, milestones: { done: 1, total: 2 }, progress: 45 } },
    { _id: "al_arjun", status: "active", progress: 28, dot: "at-risk", pendingUpdates: 1, pendingTasks: 1,
      student: { _id: "u_arjun", name: "Arjun Kumar", avatar: "AK", color: "#f59e0b" },
      internship: { title: "DevOps Intern", companyName: "TechNova Solutions" },
      summary: { attendancePct: 56, attendance: { present: 5, total: 9 }, tasks: { done: 0, total: 2 }, milestones: { done: 0, total: 1 }, progress: 28 } },
  ],
  stats: { active: 3, onTrack: 2, attention: 1, pendingUpdates: 3, pendingTasks: 4, upcomingMilestones: 4 },
  pendingUpdates: [],
  pendingTasks: [],
  upcomingMilestones: [{ _id: "m_3", title: "Integration & Polish", dueDate: "2026-10-10", percent: 60 }],
  notifications: [],
};

export const mockCompanyOverview = {
  role: "company",
  internships: mockInternships,
  applications: [
    { _id: "ap_diya_fe", status: "applied", appliedAt: "2026-09-15", student: { name: "Diya Patel", email: "diya@demo.internova.app", college: "PSG College of Technology", degree: "B.Tech IT", cgpa: "9.1", skills: ["Python", "SQL", "Pandas", "Power BI", "Excel"], avatar: "DP", color: "#0ea5e9" }, internship: mockInternships[0], coverLetter: "Frontend-curious data student here — I have shipped two React dashboards for college fests." },
    { _id: "ap_arjun_fe", status: "under_review", appliedAt: "2026-09-05", student: { name: "Arjun Kumar", email: "arjun@demo.internova.app", college: "Anna University", degree: "B.E. CSE", cgpa: "7.4", skills: ["Linux", "Docker", "AWS", "Bash", "Python"], avatar: "AK", color: "#f59e0b" }, internship: mockInternships[0], coverLetter: "I maintain our department website and its CI pipeline." },
  ],
  byStatus: { applied: 1, under_review: 1, shortlisted: 1, allocated: 1 },
  interns: [mockStudentOverview.allocation],
  stats: { activeInternships: 3, totalApplications: 4, shortlisted: 1, selected: 1, activeInterns: 1, completed: 0, completionRate: 0 },
  notifications: [],
};

export const mockAdminOverview = {
  role: "admin",
  stats: { students: 3, mentors: 1, companies: 2, internships: 9, applications: 7, active: 3, completed: 1, certificates: 2 },
  notifications: [],
};

export const mockTasks = [
  { _id: "t_7", allocationId: "al_arav", title: "Accessibility audit pass", description: "Keyboard nav + screen-reader pass.", status: "todo", priority: "low", dueDate: "2026-10-02", comments: [] },
  { _id: "t_5", allocationId: "al_arav", title: "Notifications centre UI", description: "Inbox-style centre with optimistic read-state.", status: "in_progress", priority: "high", dueDate: "2026-09-24", comments: [] },
  { _id: "t_3", allocationId: "al_arav", title: "Dashboard empty states", description: "Designed empty + error states.", status: "review", priority: "medium", dueDate: "2026-09-16", comments: [] },
  { _id: "t_1", allocationId: "al_arav", title: "Design-token migration for filters", description: "v2 tokens + URL-synced state.", status: "completed", priority: "high", dueDate: "2026-09-11", comments: [] },
];
