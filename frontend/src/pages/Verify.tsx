import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Award, BadgeCheck, Building2, CalendarCheck, Download, Search, Timer } from "lucide-react";
import { HeroButton, Logo, useToast } from "../components/ui";
import { ThemeToggle } from "../lib/theme";
import { api } from "../lib/api";
import { mockVerify } from "../lib/mock";
import { certificatePdf, downloadBlob } from "../lib/pdf";

export default function Verify() {
  const { code } = useParams();
  const [sp] = useSearchParams();
  const toast = useToast();
  const [id, setId] = useState(code || sp.get("id") || "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [failed, setFailed] = useState(false);
  const [offline, setOffline] = useState(false);

  const verify = async (val?: string) => {
    const v = (val ?? id).trim();
    if (!v) return toast("error", "Enter a Certificate ID.");
    setBusy(true);
    setResult(null);
    setFailed(false);
    setOffline(false);
    try {
      const r = await api.verifyCert(v);
      setResult(r);
    } catch {
      
      if (v.toUpperCase() === mockVerify.certificateId) {
        setResult(mockVerify);
        setOffline(true);
      } else {
        setFailed(true);
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const preset = code || sp.get("id");
    if (preset) verify(preset);
    
  }, [code]);

  const download = () => {
    if (!result) return;
    const blob = certificatePdf({
      _id: result.certificateId, studentName: result.studentName,
      companyName: result.company, role: result.role,
      duration: result.duration, completionDate: result.completionDate,
      grade: result.grade, skills: result.skills,
    });
    downloadBlob(blob, `${result.certificateId}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#f4f2ec] dark:bg-void relative flex flex-col overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-24 -translate-x-1/2 w-[640px] h-[420px] rounded-full bg-primary/12 blur-[120px]" />
        <div className="absolute inset-0 grid-lines opacity-30" />
      </div>
      <header className="relative z-10 max-w-6xl w-full mx-auto px-5 pt-6 flex items-center justify-between">
        <Logo />
        <ThemeToggle />
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-cream-dim hover:text-slate-900 dark:hover:text-cream font-cabin font-semibold">
          <ArrowLeft size={16} /> Back to home
        </Link>
      </header>

      <div className="relative z-10 flex-1 grid place-items-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[560px]">
          <div className="text-center">
            <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-magenta shadow-lg">
              <Award size={26} />
            </span>
            <h1 className="text-4xl font-medium tracking-tight mt-5">Certificate <em className="font-display italic text-gradient-purple">Verification</em></h1>
            <p className="text-slate-500 dark:text-cream-dim mt-2">Enter a Certificate ID to instantly confirm authenticity. No sign-in needed.</p>
          </div>

          <div className="glass-strong rounded-2xl p-5 md:p-6 mt-8">
            <div className="flex flex-col sm:flex-row gap-3">
              <input value={id} onChange={(e) => setId(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && verify()}
                placeholder="INT-2026-004821"
                className="field-dark flex-1 px-4 py-3 font-mono text-[15px] tracking-wider tabular" />
              <button onClick={() => verify()} disabled={busy}
                className="btn-hero px-6 py-3 bg-primary btn-primary-glow text-white font-cabin inline-flex items-center justify-center gap-2 disabled:opacity-60">
                <Search size={16} /> {busy ? "Verifying…" : "Verify"}
              </button>
            </div>
            <button onClick={() => { setId(mockVerify.certificateId); verify(mockVerify.certificateId); }}
              className="text-xs text-slate-500 dark:text-cream-dim hover:text-slate-900 dark:hover:text-cream mt-3 transition">
              Try the demo ID: <span className="font-mono text-primary dark:text-primary-soft">{mockVerify.certificateId}</span>
            </button>
          </div>

          {result && (
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              className="mt-6 rounded-3xl overflow-hidden border border-emerald-400/30 bg-emerald-500/[0.06] backdrop-blur-xl shadow-[0_0_80px_-20px_rgba(16,185,129,0.5)]">
              <div className="p-6 md:p-8 text-center">
                <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500/15 border border-emerald-400/50 text-emerald-700 dark:text-emerald-300 font-extrabold tracking-[0.14em] text-sm">
                  <BadgeCheck size={18} /> VERIFIED
                </span>
                {offline && <p className="text-[11px] text-amber-700 dark:text-amber-300/80 mt-2">Offline preview — connect to the server for live verification.</p>}
                <p className="font-display italic text-4xl md:text-5xl mt-5 text-slate-900 dark:text-cream">{result.studentName}</p>
                <p className="text-slate-500 dark:text-cream-dim mt-2">{result.role}</p>
                <div className="grid grid-cols-2 gap-3 mt-6 text-left">
                  <div className="rounded-xl bg-white/70 dark:bg-black/30 border border-slate-900/10 dark:border-white/10 p-3.5">
                    <p className="text-[11px] font-manrope font-bold uppercase tracking-widest text-slate-500 dark:text-cream-dim flex items-center gap-1.5"><Building2 size={12} /> Company</p>
                    <p className="font-bold mt-1">{result.company}</p>
                  </div>
                  <div className="rounded-xl bg-white/70 dark:bg-black/30 border border-slate-900/10 dark:border-white/10 p-3.5">
                    <p className="text-[11px] font-manrope font-bold uppercase tracking-widest text-slate-500 dark:text-cream-dim flex items-center gap-1.5"><Timer size={12} /> Duration</p>
                    <p className="font-bold mt-1">{result.duration}</p>
                  </div>
                  <div className="rounded-xl bg-white/70 dark:bg-black/30 border border-slate-900/10 dark:border-white/10 p-3.5">
                    <p className="text-[11px] font-manrope font-bold uppercase tracking-widest text-slate-500 dark:text-cream-dim flex items-center gap-1.5"><CalendarCheck size={12} /> Completed</p>
                    <p className="font-bold mt-1 tabular">{result.completionDate}</p>
                  </div>
                  <div className="rounded-xl bg-white/70 dark:bg-black/30 border border-slate-900/10 dark:border-white/10 p-3.5">
                    <p className="text-[11px] font-manrope font-bold uppercase tracking-widest text-slate-500 dark:text-cream-dim">Certificate ID</p>
                    <p className="font-mono mt-1 tabular text-sm">{result.certificateId}</p>
                  </div>
                </div>
                {(result.skills || []).length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5 mt-5">
                    {result.skills.map((s: string) => (
                      <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-slate-900/5 dark:bg-white/5 border border-slate-900/15 dark:border-white/15 text-slate-600 dark:text-cream/80">{s}</span>
                    ))}
                  </div>
                )}
                <div className="mt-6">
                  <HeroButton onClick={download} small><Download size={15} /> Download PDF</HeroButton>
                </div>
              </div>
            </motion.div>
          )}

          {failed && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="mt-6 rounded-2xl border border-rose-400/25 bg-rose-500/[0.06] p-6 text-center">
              <AlertCircle size={26} className="mx-auto text-rose-400/80" />
              <p className="font-bold mt-3 text-rose-700 dark:text-rose-200">Certificate not found</p>
              <p className="text-sm text-slate-500 dark:text-cream-dim mt-1">Double-check the ID and try again. IDs look like <span className="font-mono">INT-2026-004821</span>.</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
