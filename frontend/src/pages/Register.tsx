import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Eye, EyeOff, GraduationCap } from "lucide-react";
import { HeroButton, Input, Logo, useToast } from "../components/ui";
import { ThemeToggle } from "../lib/theme";
import { api, ApiError } from "../lib/api";
import { dashboardFor, useAuth } from "../lib/auth";
import { requestPermissionOnce } from "../lib/notify";

function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    let w = (cv.width = cv.offsetWidth);
    let h = (cv.height = cv.offsetHeight);
    const ps = Array.from({ length: 60 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
      o: Math.random() * 0.5 + 0.15,
    }));
    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(157,107,255,${p.o})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    const onR = () => { w = cv.width = cv.offsetWidth; h = cv.height = cv.offsetHeight; };
    window.addEventListener("resize", onR);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onR); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
}

export default function Register() {
  const nav = useNavigate();
  const toast = useToast();
  const { login } = useAuth();
  const [role, setRole] = useState<"student" | "company">("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast("error", "Please enter your full name.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return toast("error", "Please enter a valid email.");
    if (pw.length < 6) return toast("error", "Password must be at least 6 characters.");
    if (pw !== pw2) return toast("error", "Passwords do not match.");
    setBusy(true);
    try {
      const r = await api.register({ name: name.trim(), email: email.trim(), password: pw, role });
      login(r.token, r.user);
      try { await requestPermissionOnce(); } catch {}
      toast("success", `Welcome to InterNova, ${r.user.name.split(" ")[0]}!`);
      nav(role === "student" ? "/dashboard/student?onboarding=1" : dashboardFor(role), { replace: true });
    } catch (e) {
      toast("error", e instanceof ApiError ? e.detail : "Registration failed. Is the server running?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f2ec] dark:bg-void relative flex flex-col overflow-hidden">
      <div className="orb w-[520px] h-[520px] bg-primary/16 -top-40 left-1/2 -translate-x-1/2" />
      <div className="orb w-[380px] h-[380px] bg-magenta/10 bottom-0 -right-32" />
      <Particles />
      <div className="absolute inset-0 grid-lines opacity-40 pointer-events-none" />

      <header className="relative z-10 max-w-6xl w-full mx-auto px-5 pt-6 flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </header>

      <div className="relative z-10 flex-1 grid place-items-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="glass-strong rounded-3xl w-full max-w-[480px] p-7 md:p-9 shadow-2xl">
          <p className="font-manrope text-[11px] font-bold tracking-[0.22em] uppercase text-primary dark:text-primary-soft">Join InterNova</p>
          <h1 className="text-3xl font-medium tracking-tight mt-2">Create your <em className="font-display italic text-gradient-purple">account</em></h1>

          <p className="text-[13px] font-medium text-slate-500 dark:text-cream-dim mt-6 mb-2">I am joining as a…</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "student", icon: <GraduationCap size={20} />, t: "Student", d: "Find & grow" },
              { id: "company", icon: <Building2 size={20} />, t: "Company", d: "Hire & mentor" },
            ].map((r) => (
              <button key={r.id} type="button" onClick={() => setRole(r.id as any)}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  role === r.id
                    ? "border-primary bg-primary/15 shadow-[0_0_24px_-6px_rgba(123,57,252,0.7)]"
                    : "border-slate-900/10 dark:border-white/10 bg-slate-900/[0.04] dark:bg-white/[0.03] hover:border-slate-900/25 dark:hover:border-white/25"}`}>
                <span className={role === r.id ? "text-primary dark:text-primary-soft" : "text-slate-500 dark:text-cream-dim"}>{r.icon}</span>
                <span className="block font-bold mt-2">{r.t}</span>
                <span className="block text-xs text-slate-500 dark:text-cream-dim">{r.d}</span>
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <Input label="Full Name" placeholder={role === "student" ? "Aarav Sharma" : "Priya Nair"} value={name} onChange={(e: any) => setName(e.target.value)} autoComplete="name" />
            <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e: any) => setEmail(e.target.value)} autoComplete="email" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-[13px] font-medium mb-1.5 text-slate-500 dark:text-cream-dim">Password</span>
                <span className="relative block">
                  <input type={show ? "text" : "password"} placeholder="Min. 6 chars" value={pw}
                    onChange={(e) => setPw(e.target.value)} autoComplete="new-password"
                    className="field-dark w-full px-4 py-2.5 pr-11 text-[15px]" />
                  <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-cream-dim hover:text-slate-900 dark:hover:text-cream">
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>
              <Input label="Confirm Password" type={show ? "text" : "password"} placeholder="Repeat it" value={pw2} onChange={(e: any) => setPw2(e.target.value)} autoComplete="new-password" />
            </div>
            <button disabled={busy} className="btn-hero w-full py-3 bg-primary btn-primary-glow text-white disabled:opacity-60">
              {busy ? "Creating account…" : `Create ${role === "student" ? "Student" : "Company"} Account`}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 dark:text-cream-dim mt-6">
            Already have an account? <Link to="/login" className="text-primary dark:text-primary-soft hover:text-slate-900 dark:hover:text-cream font-semibold">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
