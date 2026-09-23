import { useEffect, useState } from "react";
import { Download, FileText, Sparkles, Upload } from "lucide-react";
import { Badge, EmptyState, Spinner, useToast } from "../../../components/ui";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";

const KINDS = ["Resume", "Offer Letter", "ID Proof", "Report", "Certificate", "Other"];

export default function SDocuments({ allocationId = "" }: { allocationId?: string }) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [resume, setResume] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState("Report");

  const load = async () => {
    try {
      const [r, d] = await Promise.all([
        api.myResume().catch(() => null),
        api.documents(allocationId ? { allocationId } : {}).catch(() => []),
      ]);
      setResume(r);
      setDocs(d || []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, [allocationId]);

  const uploadResume = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      const r = await api.uploadResume(f);
      setResume(r);
      toast("success", `Resume parsed — ${r.skills?.length || 0} skills detected.`);
      load();
    } catch (e: any) { toast("error", e.detail || "Upload failed."); }
    finally { setBusy(false); }
  };

  const applySkills = async () => {
    if (!resume?.skills?.length) return;
    const merged = Array.from(new Set([...(user?.skills || []), ...resume.skills]));
    try {
      const u = await api.patchUser(user!._id, { skills: merged });
      setUser(u);
      toast("success", "Profile skills updated from resume.");
    } catch { toast("error", "Could not update profile."); }
  };

  const uploadDoc = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      await api.uploadDocument(f, { label: label || f.name, kind, allocationId });
      toast("success", "Document uploaded.");
      setLabel("");
      load();
    } catch (e: any) { toast("error", e.detail || "Upload failed."); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="grid place-items-center py-24"><Spinner light /></div>;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
        <p className="font-extrabold text-slate-900 dark:text-cream flex items-center gap-2"><FileText size={17} className="text-violet-600 dark:text-violet-300" /> Resume</p>
        <p className="text-xs text-slate-500 dark:text-cream-dim mt-1">Upload a PDF, DOCX or TXT resume — InterNova extracts your skills automatically.</p>
        {resume ? (
          <div className="mt-4 rounded-2xl border border-violet-200 dark:border-violet-400/30 bg-violet-50/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-sm text-slate-900 dark:text-cream">{resume.filename}</p>
              <a href={resume.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-200">
                <Download size={13} /> Download
              </a>
            </div>
            {(resume.skills || []).length > 0 && (
              <>
                <p className="text-xs font-bold text-slate-500 dark:text-cream-dim mt-3 mb-1.5 flex items-center gap-1"><Sparkles size={12} /> Detected skills ({resume.skills.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {resume.skills.map((s: string) => (
                    <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 font-semibold">{s}</span>
                  ))}
                </div>
                <button onClick={applySkills} className="btn-hero mt-3 px-4 py-2 bg-primary text-white text-[13px] font-cabin">Apply skills to my profile</button>
              </>
            )}
            {resume.preview && (
              <details className="mt-3 text-xs text-slate-500 dark:text-cream-dim">
                <summary className="cursor-pointer font-bold">Extracted text preview</summary>
                <p className="mt-1.5 whitespace-pre-wrap leading-relaxed">{resume.preview.slice(0, 500)}…</p>
              </details>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400 dark:text-cream-dim/70 mt-3">No resume uploaded yet.</p>
        )}
        <label className="btn-hero mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#14141a] dark:bg-cream text-white dark:text-[#14141a] text-sm font-cabin cursor-pointer">
          <Upload size={15} /> {busy ? "Uploading…" : resume ? "Replace resume" : "Upload resume"}
          <input type="file" accept=".pdf,.docx,.txt,.md" className="hidden" disabled={busy}
            onChange={(e) => { uploadResume(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>

      <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5">
        <p className="font-extrabold text-slate-900 dark:text-cream">Documents</p>
        <p className="text-xs text-slate-500 dark:text-cream-dim mt-1">Offer letters, ID proofs, reports — everything tied to your internship.</p>
        <div className="grid sm:grid-cols-[1fr_150px] gap-2.5 mt-4">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g. Mid-term report)" className="field-light px-3.5 py-2.5 text-sm" />
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="field-light px-3 py-2.5 text-sm">
            {KINDS.map((k) => <option key={k}>{k}</option>)}
          </select>
        </div>
        <label className="btn-hero mt-2.5 inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white text-sm font-cabin cursor-pointer">
          <Upload size={15} /> {busy ? "Uploading…" : "Upload document"}
          <input type="file" className="hidden" disabled={busy}
            onChange={(e) => { uploadDoc(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        <div className="mt-4 space-y-2">
          {docs.map((d) => (
            <div key={d._id} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 px-3.5 py-2.5">
              <span className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-white/10 grid place-items-center text-slate-500 dark:text-cream-dim shrink-0"><FileText size={16} /></span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-900 dark:text-cream truncate">{d.label}</p>
                <p className="text-[11px] text-slate-400 dark:text-cream-dim/70 tabular">{d.filename} · {String(d.createdAt || "").slice(0, 10)}</p>
              </div>
              <Badge tone="purple">{d.kind}</Badge>
              <a href={d.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-violet-600 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-200 inline-flex items-center gap-1">
                <Download size={13} /> Open
              </a>
            </div>
          ))}
          {!docs.length && <EmptyState icon={<FileText size={22} />} title="No documents" body="Upload your first document above." />}
        </div>
      </div>
    </div>
  );
}
