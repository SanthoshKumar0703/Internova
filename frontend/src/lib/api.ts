
const BASE = (import.meta as any).env?.VITE_API_URL || "/api";
const KEY = "internova_token";

export const getToken = () =>
  typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
export const setToken = (t: string | null) => {
  if (typeof localStorage === "undefined") return;
  if (t) localStorage.setItem(KEY, t);
  else localStorage.removeItem(KEY);
};

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

async function req(path: string, init?: RequestInit): Promise<any> {
  const token = getToken();
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail =
      (data && typeof data === "object" && (data.detail || data.message)) ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, String(detail));
  }
  return data;
}

const post = (b: any = {}) => ({ method: "POST", body: JSON.stringify(b) });
const patch = (b: any = {}) => ({ method: "PATCH", body: JSON.stringify(b) });

async function reqForm(path: string, form: FormData): Promise<any> {
  const token = getToken();
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form,
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail =
      (data && typeof data === "object" && (data.detail || data.message)) ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, String(detail));
  }
  return data;
}
const qs = (o: Record<string, any>) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : "";
};


export interface User {
  _id: string;
  name: string;
  email: string;
  role: "student" | "mentor" | "company" | "admin";
  avatar?: string;
  color?: string;
  phone?: string;
  location?: string;
  bio?: string;
  skills?: string[];
  college?: string;
  degree?: string;
  year?: string;
  cgpa?: string;
  education?: string[];
  projects?: string[];
  experience?: string[];
  certifications?: string[];
  interests?: string[];
  preferredRoles?: string[];
  resumeName?: string;
  resumeUrl?: string;
  profileComplete?: boolean;
  expertise?: string[];
  experience?: string;
  organisation?: string;
  website?: string;
  industry?: string;
  size?: string;
  about?: string;
  contactName?: string;
  contactRole?: string;
  contactPhone?: string;
  verified?: boolean;
  suspended?: boolean;
  company?: { name: string; industry: string; size: string; location: string; website: string; about: string; founded?: string };
}
export interface Internship {
  _id: string; title: string; companyId: string; companyName: string;
  domain: string; skills: string[]; mode: string; location: string;
  duration: string; durationMonths: number; stipend: string; openings: number;
  startDate: string; deadline: string; postedAt: string; status: string;
  description: string; responsibilities: string[]; applicants?: number;
}
export interface Application {
  _id: string; studentId: string; internshipId: string; status: string;
  coverLetter: string; appliedAt: string; updatedAt?: string;
  timeline?: { s: string; at: string }[];
  student?: User; internship?: Internship; allocation?: any;
}
export interface Allocation {
  _id: string; studentId: string; internshipId: string; companyId: string;
  mentorId: string; status: string; startDate: string; endDate: string;
  progress: number; flag?: string;
  student?: User; mentor?: User; internship?: Internship;
  summary?: { attendancePct: number; attendance: { present: number; total: number }; tasks: { done: number; total: number }; milestones: { done: number; total: number }; progress: number };
}
export interface Task { _id: string; allocationId: string; title: string; description: string; status: string; priority: string; dueDate: string; comments: { by: string; text: string; at: string }[]; createdAt?: string }
export interface Milestone { _id: string; allocationId: string; title: string; description: string; status: string; percent: number; dueDate: string; tasks: string[] }
export interface DailyUpdate { _id: string; allocationId: string; date: string; workedOn: string; completed: string; learned: string; blockers: string; hours: number; reviewStatus: string; mentorComment: string; createdAt?: string }
export interface AttendanceRow { _id: string; allocationId: string; date: string; status: string; checkIn?: string; checkOut?: string; hours?: number; note?: string }
export interface FeedbackItem { _id: string; allocationId: string; fromName: string; category: string; rating: number; message: string; createdAt: string }
export interface Certificate { _id: string; studentId?: string; studentName: string; companyName: string; role: string; duration: string; completionDate: string; status: string; grade?: string; skills: string[]; issuedAt: string }
export interface Notif { _id: string; userId: string; title: string; body: string; link: string; kind: string; read: boolean; createdAt: string }
export interface Thread { _id: string; participants: string[]; subject: string; updatedAt: string; messages: { fromId: string; text: string; at: string }[]; other?: { name: string; avatar: string; color: string; role: string } }
export interface SessionItem { _id: string; allocationId: string; title: string; description: string; date: string; durationMin: number; meetLink: string; status: string; proposedBy: string; notes: string; actionItems: { text: string; done: boolean }[]; student?: any; mentor?: any; internship?: any }
export interface InsightRow { allocationId: string; internName: string; role: string; companyName: string; score: number; risks: string[]; highlights: string[]; hours7: number; attendance7: { pct: number; present: number; total: number }; tasksDone7: number; updates7: number }

export const api = {
  health: () => req("/health"),
  register: (b: { name: string; email: string; password: string; role: string }) => req("/auth/register", post(b)),
  login: (b: { email: string; password: string }) => req("/auth/login", post(b)),
  verifyOtp: (b: { tempToken: string; otp: string }) => req("/auth/verify-otp", post(b)),
  google: (b: { credential?: string; email?: string; name?: string }) => req("/auth/google", post(b)),
  forgot: (email: string) => req("/auth/forgot-password", post({ email })),
  reset: (b: { token: string; password: string }) => req("/auth/reset-password", post(b)),
  me: () => req("/auth/me"),

  internships: (p: Record<string, any> = {}) => req(`/internships${qs(p)}`),
  internship: (id: string) => req(`/internships/${id}`),
  createInternship: (b: any) => req("/internships", post(b)),
  updateInternship: (id: string, b: any) => req(`/internships/${id}`, patch(b)),

  apply: (b: { internshipId: string; coverLetter: string }) => req("/applications", post(b)),
  applications: (p: Record<string, any> = {}) => req(`/applications${qs(p)}`),
  updateApplication: (id: string, status: string) => req(`/applications/${id}`, patch({ status })),

  allocations: (p: Record<string, any> = {}) => req(`/allocations${qs(p)}`),
  allocation: (id: string) => req(`/allocations/${id}`),
  completeAllocation: (id: string, _b?: any) => req(`/allocations/${id}/complete`, post(_b || {})),

  attendance: (aid: string) => req(`/allocations/${aid}/attendance`),
  markAttendance: (aid: string, b: any) => req(`/allocations/${aid}/attendance`, post(b)),

  updates: (aid: string) => req(`/allocations/${aid}/updates`),
  postUpdate: (aid: string, b: any) => req(`/allocations/${aid}/updates`, post(b)),
  reviewUpdate: (id: string, b: any) => req(`/updates/${id}`, patch(b)),

  tasks: (aid: string) => req(`/allocations/${aid}/tasks`),
  createTask: (aid: string, b: any) => req(`/allocations/${aid}/tasks`, post(b)),
  patchTask: (id: string, b: any) => req(`/tasks/${id}`, patch(b)),

  milestones: (aid: string) => req(`/allocations/${aid}/milestones`),
  createMilestone: (aid: string, b: any) => req(`/allocations/${aid}/milestones`, post(b)),
  patchMilestone: (id: string, b: any) => req(`/milestones/${id}`, patch(b)),

  feedback: (aid: string) => req(`/allocations/${aid}/feedback`),
  giveFeedback: (aid: string, b: any) => req(`/allocations/${aid}/feedback`, post(b)),

  evaluation: (aid: string) => req(`/allocations/${aid}/evaluation`),
  submitEvaluation: (aid: string, b: any) => req(`/allocations/${aid}/evaluation`, post(b)),

  verifyCert: (code: string) => req(`/certificates/verify/${encodeURIComponent(code)}`),
  certificates: (p: Record<string, any> = {}) => req(`/certificates${qs(p)}`),
  revokeCert: (code: string) => req(`/certificates/${code}/revoke`, post()),
  reissueCert: (code: string) => req(`/certificates/${code}/reissue`, post()),

  users: (p: Record<string, any> = {}) => req(`/users${qs(p)}`),
  user: (id: string) => req(`/users/${id}`),
  patchUser: (id: string, b: any) => req(`/users/${id}`, patch(b)),
  createMentor: (b: any) => req("/users/mentor", post(b)),

  notifications: () => req("/notifications"),
  readNotif: (id: string) => req(`/notifications/${id}/read`, post()),
  readAllNotifs: () => req("/notifications/read-all", post()),

  threads: () => req("/messages/threads"),
  messageContacts: () => req("/messages/contacts"),
  startThread: (b: { recipientId: string; subject?: string }) => req("/messages/threads", post(b)),
  sendMessage: (tid: string, text: string) => req(`/messages/${tid}`, post({ text })),

  overview: () => req("/dashboard/overview"),
  activity: () => req("/admin/activity"),

  uploadResume: (file: File) => {
    const f = new FormData();
    f.append("file", file);
    return reqForm("/uploads/resume", f);
  },
  myResume: () => req("/uploads/resume/me"),
  uploadDocument: (file: File, extra: Record<string, string> = {}) => {
    const f = new FormData();
    f.append("file", file);
    Object.entries(extra).forEach(([k, v]) => f.append(k, v));
    return reqForm("/uploads/document", f);
  },
  documents: (p: Record<string, any> = {}) => req(`/uploads/documents${qs(p)}`),

  reportStudent: () => req("/reports/student"),
  reportMentor: () => req("/reports/mentor"),
  reportCompany: () => req("/reports/company"),
  reportAdmin: () => req("/reports/admin"),
  outbox: () => req("/admin/outbox"),

  allocate: (b: any) => req("/allocations", { method: "POST", body: JSON.stringify(b) }),
  recommended: () => req("/match/recommended"),
  rankApps: (id: string) => req(`/match/rank?internshipId=${id}`),
  mentorMatches: (id: string) => req(`/match/mentors?internshipId=${id}`),
  announcements: () => req("/announcements"),
  postAnnouncement: (b: any) => req("/admin/announcements", { method: "POST", body: JSON.stringify(b) }),
  presence: () => req("/presence"),

  sessions: (aid?: string) => req(`/sessions${qs({ allocationId: aid || "" })}`),
  upcomingSessions: (days = 14) => req(`/sessions/upcoming${qs({ days })}`),
  createSession: (b: any) => req("/sessions", post(b)),
  patchSession: (id: string, b: any) => req(`/sessions/${id}`, patch(b)),
  insightsWeekly: (aid: string) => req(`/insights/weekly${qs({ allocationId: aid })}`),
  insightsOverview: () => req("/insights/overview"),
  sessionReminders: () => req("/admin/session-reminders", post()),

  decideApplication: (id: string, b: any) => req(`/applications/${id}`, patch(b)),
  companyEval: (aid: string, b: any) => req(`/allocations/${aid}/evaluation`, post(b)),
  mentorFeedback: (aid: string, f: any) => req(`/allocations/${aid}/feedback`, post({
    category: "Mentor review",
    rating: Math.max(1, Math.min(5, Math.round(((f.technical || 0) + (f.communication || 0) + (f.punctuality || 0)) / 3) || 5)),
    message: `Technical ${f.technical}/5 \u00b7 Communication ${f.communication}/5 \u00b7 Punctuality ${f.punctuality}/5${f.comments ? ` \u2014 ${f.comments}` : ""}`,
  })),
  adminUsers: (role: string) => req(`/users${qs({ role: ({ students: "student", mentors: "mentor", companies: "company" } as any)[role] || "" })}`),
  adminCreateMentor: (b: any) => req("/users/mentor", post(b)),
};

export async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<{ data: T; live: boolean }> {
  try {
    return { data: await fn(), live: true };
  } catch {
    return { data: fallback, live: false };
  }
}
