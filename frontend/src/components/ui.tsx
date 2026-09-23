import React, { createContext, useContext, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle, ArrowLeft, BadgeCheck, CheckCircle2, Download, Info, X,
} from "lucide-react";
import { LegalSection, downloadBlob, legalPdf } from "../lib/pdf";

export function Logo({ to = "/", compact = false }: { to?: string; compact?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 group shrink-0">
      <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary via-[#9333ea] to-magenta grid place-items-center shadow-[0_4px_20px_-4px_rgba(123,57,252,0.8)] group-hover:shadow-[0_4px_28px_-2px_rgba(123,57,252,0.9)] transition-shadow">
        <span className="font-display italic text-white text-xl leading-none pb-0.5">N</span>
      </span>
      {!compact && (
        <span className="font-manrope font-800 tracking-tight text-[19px] text-slate-900 dark:text-cream font-extrabold">
          Inter<span className="text-gradient-purple">Nova</span>
        </span>
      )}
    </Link>
  );
}

export function HeroButton({
  to, href, onClick, children, variant = "primary", className = "", small = false, type,
}: {
  to?: string; href?: string; onClick?: () => void; children: React.ReactNode;
  variant?: "primary" | "glass" | "ghost" | "dark"; className?: string; small?: boolean;
  type?: "button" | "submit";
}) {
  const base = `btn-hero inline-flex items-center justify-center gap-2 font-cabin ${small ? "py-2 px-4 text-sm" : "py-3 px-6 text-[15px]"} ${className}`;
  const styles =
    variant === "primary"
      ? "bg-primary text-white btn-primary-glow hover:bg-[#8b4dff]"
      : variant === "glass"
      ? "liquid-glass text-slate-800 dark:text-cream hover:bg-slate-900/5 dark:hover:bg-white/10 rounded-full"
      : variant === "dark"
      ? "bg-[#14141a] dark:bg-cream text-white dark:text-[#14141a] hover:bg-black dark:hover:bg-white"
      : "text-slate-500 hover:text-slate-900 dark:text-cream-dim dark:hover:text-cream";
  const cls = `${base} ${styles}`;
  if (to) return <Link to={to} className={cls}>{children}</Link>;
  if (href) return <a href={href} className={cls}>{children}</a>;
  return <button type={type || "button"} onClick={onClick} className={cls}>{children}</button>;
}

const toneCls = (tone: string) => (tone === "light" ? "field-light" : "field-dark");

export function Input({ label, tone = "dark", className = "", ...rest }: any) {
  return (
    <label className="block">
      {label && <span className={`block text-[13px] font-medium mb-1.5 ${tone === "light" ? "text-slate-600 dark:text-cream-dim" : "text-slate-500 dark:text-cream-dim"}`}>{label}</span>}
      <input {...rest} className={`${toneCls(tone)} w-full px-4 py-2.5 text-[15px] ${className}`} />
    </label>
  );
}
export function TextArea({ label, tone = "dark", className = "", ...rest }: any) {
  return (
    <label className="block">
      {label && <span className={`block text-[13px] font-medium mb-1.5 ${tone === "light" ? "text-slate-600 dark:text-cream-dim" : "text-slate-500 dark:text-cream-dim"}`}>{label}</span>}
      <textarea {...rest} className={`${toneCls(tone)} w-full px-4 py-2.5 text-[15px] min-h-[96px] resize-y ${className}`} />
    </label>
  );
}
export function Label({ children }: { children: React.ReactNode }) {
  return <span className="block text-[13px] font-medium mb-1.5 text-slate-600 dark:text-cream-dim">{children}</span>;
}
export function Select({ label, tone = "dark", children, className = "", ...rest }: any) {
  return (
    <label className="block">
      {label && <span className={`block text-[13px] font-medium mb-1.5 ${tone === "light" ? "text-slate-600 dark:text-cream-dim" : "text-slate-500 dark:text-cream-dim"}`}>{label}</span>}
      <select {...rest} className={`${toneCls(tone)} w-full px-3.5 py-2.5 text-[15px] ${className}`}>{children}</select>
    </label>
  );
}

const badgeTones: Record<string, string> = {
  purple: "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-400/30",
  green: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-400/30",
  amber: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-400/30",
  red: "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-400/30",
  blue: "bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-400/30",
  slate: "bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-cream-dim border-slate-300/60 dark:border-white/10",
  pink: "bg-pink-100 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-400/30",
};
export function Badge({ tone = "slate", children, className = "" }: { tone?: string; children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeTones[tone] || badgeTones.slate} ${className}`}>
      {children}
    </span>
  );
}

export function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 liquid-glass rounded-full px-4 py-1.5 font-manrope text-[11px] font-bold tracking-[0.18em] uppercase text-primary dark:text-primary-soft">
      {children}
    </span>
  );
}

export function Avatar({ name = "?", avatar, color = "#7b39fc", size = 40 }: { name?: string; avatar?: string; color?: string; size?: number }) {
  const initials = avatar || name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className="rounded-full grid place-items-center font-bold text-white shrink-0" style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}, #2a0a5e)`, fontSize: size * 0.36 }}>
      {initials}
    </span>
  );
}

export function ProgressRing({ value, size = 120, stroke = 10, color = "#7b39fc", track = "rgba(255,255,255,0.1)", children }: any) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * Math.min(100, Math.max(0, value))) / 100}
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function ProgressBar({ value, color = "#7b39fc", className = "" }: { value: number; color?: string; className?: string }) {
  return (
    <div className={`h-2 rounded-full bg-slate-200 dark:bg-white/15 overflow-hidden ${className}`}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  );
}

export function Stat({ icon, label, value, sub, tone = "purple" }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; tone?: string }) {
  const tones: Record<string, string> = {
    purple: "bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300", green: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    amber: "bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300", red: "bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300",
    blue: "bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-300", pink: "bg-pink-100 dark:bg-pink-500/15 text-pink-600",
  };
  return (
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-4 card-hover">
      <div className="flex items-center gap-3">
        <span className={`w-10 h-10 rounded-xl grid place-items-center ${tones[tone] || tones.purple}`}>{icon}</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 dark:text-cream-dim uppercase tracking-wide truncate">{label}</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-cream tabular leading-tight">{value}</p>
        </div>
      </div>
      {sub && <p className="text-xs text-slate-500 dark:text-cream-dim mt-2">{sub}</p>}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: any) {
  return (
    <div className="text-center py-10 px-6">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300 grid place-items-center mb-3">{icon}</div>
      <p className="font-bold text-slate-900 dark:text-cream">{title}</p>
      {body && <p className="text-sm text-slate-500 dark:text-cream-dim mt-1 max-w-sm mx-auto">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ light = false }: { light?: boolean }) {
  return <div className={`w-8 h-8 rounded-full border-[3px] animate-spin "border-slate-300 dark:border-white/15 border-t-primary"`} />;
}

export function Modal({ open, onClose, title, children, wide = false }: any) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[120] grid place-items-center p-4 bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className={`solid-dark dark rounded-2xl w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[88vh] overflow-y-auto p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-cream">{title}</h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full grid place-items-center text-cream-dim hover:bg-white/10 hover:text-cream transition"><X size={18} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const APP_STATUS: Record<string, { label: string; tone: string }> = {
  applied: { label: "Applied", tone: "slate" },
  under_review: { label: "Under Review", tone: "blue" },
  shortlisted: { label: "Shortlisted", tone: "amber" },
  selected: { label: "Selected", tone: "purple" },
  allocated: { label: "Allocated", tone: "green" },
  rejected: { label: "Rejected", tone: "red" },
};
const P1 = ["applied", "under_review", "shortlisted", "selected", "allocated"];
const P1_LABELS = ["Applied", "Review", "Shortlisted", "Selected", "Allocated"];
const P2 = ["started", "active", "evaluation", "completed", "certificate"];
const P2_LABELS = ["Started", "Active", "Evaluation", "Completed", "Certificate"];

export function JourneyStepper({ status, allocationStatus, hasCertificate = false }: { status: string; allocationStatus?: string; hasCertificate?: boolean }) {
  const inP2 = ["allocated", "selected"].includes(status) || !!allocationStatus;
  const p1Idx = status === "rejected" ? -1 : Math.max(0, P1.indexOf(status));
  let p2Idx = -1;
  if (hasCertificate) p2Idx = 4;
  else if (allocationStatus === "completed") p2Idx = 3;
  else if (allocationStatus === "evaluation") p2Idx = 2;
  else if (allocationStatus === "active") p2Idx = 1;
  else if (inP2) p2Idx = 0;

  const row = (labels: string[], idx: number, active: boolean) => (
    <div className={`flex items-center ${active ? "" : "opacity-40"}`}>
      {labels.map((l, i) => (
        <React.Fragment key={l}>
          <div className="flex flex-col items-center shrink-0">
            <span className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold border-2 transition ${
              i < idx ? "bg-emerald-500 border-emerald-500 text-white"
              : i === idx ? "bg-primary border-primary text-white shadow-[0_0_12px_rgba(123,57,252,0.7)]"
              : "bg-white dark:bg-card border-slate-300 dark:border-white/20 text-slate-400 dark:text-cream-dim/70"}`}>
              {i < idx ? "✓" : i + 1}
            </span>
            <span className={`mt-1 text-[10px] font-semibold whitespace-nowrap ${i <= idx ? "text-slate-700 dark:text-cream-dim" : "text-slate-400 dark:text-cream-dim/70"}`}>{l}</span>
          </div>
          {i < labels.length - 1 && <span className={`h-0.5 flex-1 mx-1 mb-5 rounded ${i < idx ? "bg-emerald-400" : "bg-slate-200 dark:bg-white/15"}`} />}
        </React.Fragment>
      ))}
    </div>
  );
  return (
    <div className="space-y-3">
      {row(P1_LABELS, inP2 ? 4 : p1Idx, true)}
      {row(P2_LABELS, p2Idx, inP2)}
    </div>
  );
}

type Toast = { id: number; type: string; msg: string };
const ToastCtx = createContext<(type: string, msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = (type: string, msg: string) => {
    const id = Date.now() + Math.random();
    setItems((p) => [...p.slice(-3), { id, type, msg }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 3800);
  };
  const icons: Record<string, React.ReactNode> = {
    success: <CheckCircle2 size={18} className="text-emerald-400" />,
    error: <AlertCircle size={18} className="text-rose-400" />,
    info: <Info size={18} className="text-primary-soft" />,
  };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-5 right-5 z-[200] space-y-2 w-[320px] max-w-[calc(100vw-40px)]">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
              className="solid-dark dark rounded-xl px-4 py-3 flex items-start gap-2.5 text-sm text-cream shadow-2xl">
              <span className="mt-0.5 shrink-0">{icons[t.type] || icons.info}</span>
              <span>{t.msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export const privacySections: LegalSection[] = [
  { heading: "Introduction", paragraphs: ["InterNova (\"we\", \"our\") provides a smart internship management platform connecting students, companies, mentors and administrators. This Privacy Policy explains what data we collect, how we use it, and the choices you have.", "By using InterNova, you agree to the practices described here. If you do not agree, please do not use the platform."] },
  { heading: "Information We Collect", paragraphs: ["Account data: name, email address, password (stored only as a salted hash), role, and profile details you provide such as college, skills, resume and company information.", "Activity data: internship applications, attendance logs, daily work updates, tasks, milestones, feedback, evaluations, messages and verification lookups.", "Technical data: device and browser type, approximate location, and anonymised usage analytics that help us improve reliability."] },
  { heading: "How We Use Information", paragraphs: ["We use your data to operate the platform: matching students with internships, tracking progress, assigning mentors, generating certificates and sending role-relevant notifications.", "We use aggregated, de-identified analytics to improve features and prevent abuse. We never sell your personal data."] },
  { heading: "Data Sharing", paragraphs: ["Student application material is shared with the companies they apply to. Internship progress is visible to the assigned mentor, the host company and platform administrators — each strictly within their role.", "Public certificate verification exposes only the certificate ID, holder name, company, role, duration and completion date. We disclose data to authorities only when legally required."] },
  { heading: "Data Security", paragraphs: ["We protect data with transport encryption (TLS), salted password hashing, short-lived session tokens, role-based access control and least-privilege database access.", "No system is perfectly secure. If you suspect unauthorised access to your account, contact us immediately so we can lock it down and investigate."] },
  { heading: "Cookies", paragraphs: ["We use strictly-necessary cookies and local storage for sign-in sessions, theme consistency and security (such as OTP attempt limiting).", "We do not use third-party advertising trackers. Analytics, where enabled, are aggregated and anonymised."] },
  { heading: "User Rights", paragraphs: ["You may request access to, correction of, or deletion of your personal data at any time, and you may export your internship records and certificates.", "You can withdraw notification consent in your browser settings and opt out of non-essential emails from your dashboard."] },
  { heading: "Data Retention", paragraphs: ["Account and internship records are retained while your account is active and for up to 24 months afterwards for audit and certificate-verification purposes.", "Verification records for issued certificates are retained indefinitely so employers can always confirm authenticity, unless revocation is requested by the issuing authority."] },
  { heading: "Contact", paragraphs: ["Questions about privacy? Reach us at privacy@internova.app. We respond to verified requests within 30 days.", "InterNova — Coimbatore, Tamil Nadu, India."] },
];

export const termsSections: LegalSection[] = [
  { heading: "Introduction", paragraphs: ["These Terms & Conditions govern your use of the InterNova platform. By creating an account or using any part of the service, you accept these terms.", "If you use InterNova on behalf of a company or institution, you confirm you are authorised to bind that organisation."] },
  { heading: "Eligibility & Accounts", paragraphs: ["Students and companies may self-register. Mentor accounts are created by administrators or partner companies; the Admin role is never publicly available.", "You are responsible for keeping your credentials confidential and for all activity under your account, including OTP-verified sessions."] },
  { heading: "Platform Services", paragraphs: ["InterNova provides internship discovery, application management, allocation, attendance and progress tracking, mentor feedback, evaluations and verifiable certificates.", "We may update features over time. Core records (applications, logs, certificates) remain exportable to the relevant role holders."] },
  { heading: "User Responsibilities", paragraphs: ["Provide accurate information. Students must log attendance and work honestly; companies must review applications fairly; mentors must give timely, constructive feedback.", "Do not misuse the platform: no spam, scraping, harassment, falsified records or attempts to access data outside your role. Violations may lead to suspension."] },
  { heading: "Intellectual Property", paragraphs: ["The InterNova brand, design and software are our property. Your content (profiles, resumes, work logs) remains yours.", "You grant us a limited licence to host and display your content to the roles you share it with (e.g. applications to companies) as required to operate the service."] },
  { heading: "Stipends & Employment", paragraphs: ["Stipend terms are set by the host company in each internship posting and form an agreement between the student and the company — InterNova is not a party to it.", "An InterNova certificate confirms completion of programme criteria; it is not a guarantee of employment."] },
  { heading: "Limitation of Liability", paragraphs: ["The platform is provided \"as is\". To the maximum extent permitted by law, we are not liable for indirect losses arising from use of the service.", "Our total liability for any claim is limited to the fees (if any) you paid us in the 12 months before the claim."] },
  { heading: "Termination", paragraphs: ["You may delete your account at any time from Settings or by contacting support. We may suspend accounts that violate these terms.", "On termination, your private data is deleted per our retention schedule; issued certificates remain verifiable unless revoked."] },
  { heading: "Contact", paragraphs: ["For questions about these terms, contact legal@internova.app.", "InterNova — Coimbatore, Tamil Nadu, India. These terms are governed by the laws of India."] },
];

export function LegalOverlay({ kind, onClose }: { kind: "privacy" | "terms"; onClose: () => void }) {
  const isPrivacy = kind === "privacy";
  const title = isPrivacy ? "Privacy Policy" : "Terms & Conditions";
  const sections = isPrivacy ? privacySections : termsSections;
  const file = isPrivacy ? "Privacy-Policy.pdf" : "Terms-and-Conditions.pdf";
  const download = () => {
    const blob = legalPdf(title, "InterNova · Last updated September 2026", sections);
    downloadBlob(blob, file);
  };
  return (
    <motion.div className="fixed inset-0 z-[150] bg-[#f4f2ec]/95 dark:bg-[#050309]/92 backdrop-blur-xl overflow-y-auto"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="min-h-full max-w-3xl mx-auto px-5 py-6">
        <div className="flex items-center justify-between sticky top-0 py-3 bg-white/80 dark:bg-[#050309]/80 backdrop-blur-xl z-10">
          <button onClick={onClose} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-cream-dim dark:hover:text-cream font-cabin font-semibold transition">
            <ArrowLeft size={18} /> Back
          </button>
          <button onClick={download} className="inline-flex items-center gap-2 liquid-glass rounded-full px-5 py-2.5 text-sm font-cabin font-semibold text-slate-800 dark:text-cream hover:bg-slate-900/5 dark:hover:bg-white/10 transition">
            <Download size={16} /> Download
          </button>
        </div>
        <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <p className="font-manrope text-[11px] font-bold tracking-[0.2em] uppercase text-primary dark:text-primary-soft mt-4">InterNova Legal</p>
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight mt-2 text-slate-900 dark:text-cream">{title}</h1>
          <p className="text-slate-500 dark:text-cream-dim mt-2 text-sm">Last updated September 2026</p>
          <div className="divider-gradient my-8" />
          <div className="space-y-8 pb-16">
            {sections.map((s, i) => (
              <section key={s.heading}>
                <h2 className="text-xl font-bold text-slate-900 dark:text-cream flex items-baseline gap-3">
                  <span className="text-sm font-manrope text-primary dark:text-primary-soft tabular">{String(i + 1).padStart(2, "0")}</span>
                  {s.heading}
                </h2>
                {s.paragraphs.map((p, j) => (
                  <p key={j} className="text-[15px] leading-relaxed text-slate-500 dark:text-cream-dim mt-3">{p}</p>
                ))}
              </section>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export function Footer({ onLegal }: { onLegal: (k: "privacy" | "terms") => void }) {
  return (
    <footer className="relative border-t border-slate-900/10 dark:border-white/10 bg-white dark:bg-black/50">
      <div className="max-w-6xl mx-auto px-5 py-14 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="text-sm text-slate-500 dark:text-cream-dim mt-4 max-w-xs leading-relaxed">
            The smart internship management system — from application to achievement.
          </p>
          <div className="inline-flex items-center gap-2 mt-4 liquid-glass rounded-full px-3.5 py-1.5 text-xs text-slate-600 dark:text-cream-dim">
            <BadgeCheck size={14} className="text-emerald-400" /> Certificates verifiable worldwide
          </div>
        </div>
        <div>
          <p className="font-manrope text-xs font-bold tracking-[0.16em] uppercase text-slate-500 dark:text-cream-dim mb-4">Platform</p>
          <ul className="space-y-2.5 text-sm">
            <li><a href="#discover" className="text-slate-600 hover:text-slate-900 dark:text-cream/80 dark:hover:text-cream transition">Discover</a></li>
            <li><a href="#journey" className="text-slate-600 hover:text-slate-900 dark:text-cream/80 dark:hover:text-cream transition">The Journey</a></li>
            <li><a href="#success" className="text-slate-600 hover:text-slate-900 dark:text-cream/80 dark:hover:text-cream transition">Success Stories</a></li>
            <li><Link to="/verify" className="text-slate-600 hover:text-slate-900 dark:text-cream/80 dark:hover:text-cream transition">Verify Certificate</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-manrope text-xs font-bold tracking-[0.16em] uppercase text-slate-500 dark:text-cream-dim mb-4">Roles</p>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/register" className="text-slate-600 hover:text-slate-900 dark:text-cream/80 dark:hover:text-cream transition">For Students</Link></li>
            <li><Link to="/register" className="text-slate-600 hover:text-slate-900 dark:text-cream/80 dark:hover:text-cream transition">For Companies</Link></li>
            <li><Link to="/login" className="text-slate-600 hover:text-slate-900 dark:text-cream/80 dark:hover:text-cream transition">For Mentors</Link></li>
            <li><Link to="/login" className="text-slate-600 hover:text-slate-900 dark:text-cream/80 dark:hover:text-cream transition">Sign In</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-manrope text-xs font-bold tracking-[0.16em] uppercase text-slate-500 dark:text-cream-dim mb-4">Legal</p>
          <ul className="space-y-2.5 text-sm">
            <li><button onClick={() => onLegal("privacy")} className="text-slate-600 hover:text-slate-900 dark:text-cream/80 dark:hover:text-cream transition">Privacy Policy</button></li>
            <li><button onClick={() => onLegal("terms")} className="text-slate-600 hover:text-slate-900 dark:text-cream/80 dark:hover:text-cream transition">Terms & Conditions</button></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-900/10 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-5 py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-cream-dim">
          <p>© 2026 InterNova. All rights reserved.</p>
          <p className="font-manrope tracking-wide">FROM APPLICATION TO <span className="text-primary dark:text-primary-soft font-bold">ACHIEVEMENT</span></p>
        </div>
      </div>
    </footer>
  );
}
