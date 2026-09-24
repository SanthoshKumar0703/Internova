import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { HeroButton, Input, Logo, Modal, useToast } from "../components/ui";
import { ThemeToggle } from "../lib/theme";
import { api, ApiError } from "../lib/api";
import { dashboardFor, useAuth } from "../lib/auth";
import { requestPermissionOnce, showBrowserNotification } from "../lib/notify";

const DEMO = [
  { role: "Student", email: "student@demo.internova.app" },
  { role: "Mentor", email: "mentor@demo.internova.app" },
  { role: "Company", email: "company@demo.internova.app" },
  { role: "Admin", email: "admin@demo.internova.app" },
];

const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined;

function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    let w = (cv.width = cv.offsetWidth);
    let h = (cv.height = cv.offsetHeight);
    const ps = Array.from({ length: 70 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
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

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation();
  const toast = useToast();
  const { login } = useAuth();
  const [mode, setMode] = useState<"login" | "otp" | "forgot" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [cool, setCool] = useState(0);
  const [googleOpen, setGoogleOpen] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [newPw, setNewPw] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [sp] = useSearchParams();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const existing = document.getElementById("google-identity-script");
    const init = () => {
      const g = (window as any).google;
      if (!g?.accounts?.id || !googleBtnRef.current) return;
      g.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      g.accounts.id.renderButton(googleBtnRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        logo_alignment: "left",
        width: 340,
      });
      setGoogleReady(true);
    };
    if (existing) { init(); return; }
    const script = document.createElement("script");
    script.id = "google-identity-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = init;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    const t = sp.get("reset");
    if (t) {
      setResetToken(t);
      setMode("reset");
    }
  }, []);

  useEffect(() => {
    if (cool <= 0) return;
    const t = setTimeout(() => setCool((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cool]);

  const finish = async (token: string, user: any) => {
    login(token, user);
    try {
      const ok = await requestPermissionOnce();
      if (ok) showBrowserNotification(`Welcome back, ${user.name.split(" ")[0]}!`, "You are signed in to InterNova.", dashboardFor(user.role));
    } catch {}
    const from = (loc.state as any)?.from;
    nav(from && from.startsWith("/dashboard") ? from : dashboardFor(user.role), { replace: true });
  };

  const err = (e: any) => toast("error", e instanceof ApiError ? e.detail : "Something went wrong. Is the server running?");

  const doLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) return toast("error", "Enter your email and password.");
    setBusy(true);
    try {
      const r = await api.login({ email: email.trim(), password });
      setTempToken(r.tempToken);
      setDevOtp(r.devOtp || "");
      setOtp(["", "", "", "", "", ""]);
      setCool(30);
      setMode("otp");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (e) { err(e); } finally { setBusy(false); }
  };

  const doOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const code = otp.join("");
    if (code.length < 6) return toast("error", "Enter the 6-digit code.");
    setBusy(true);
    try {
      const r = await api.verifyOtp({ tempToken, otp: code });
      toast("success", "Verified — welcome back!");
      finish(r.token, r.user);
    } catch (e) { err(e); } finally { setBusy(false); }
  };

  const otpKey = (i: number, v: string) => {
    if (/^\d?$/.test(v)) {
      const n = [...otp];
      n[i] = v;
      setOtp(n);
      if (v && i < 5) otpRefs.current[i + 1]?.focus();
    }
  };

  const handleGoogleCredential = async (response: { credential: string }) => {
    setBusy(true);
    try {
      const r = await api.google({ credential: response.credential });
      toast("success", "Signed in with Google.");
      finish(r.token, r.user);
    } catch (e) { err(e); } finally { setBusy(false); }
  };

  const doGoogle = async (em: string, name: string) => {
    setBusy(true);
    try {
      const r = await api.google({ email: em, name });
      setGoogleOpen(false);
      toast("success", "Signed in with Google (demo).");
      finish(r.token, r.user);
    } catch (e) { err(e); } finally { setBusy(false); }
  };

  const doForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast("error", "Enter your registered email.");
    setBusy(true);
    try {
      const r = await api.forgot(email.trim());
      if (r.devResetToken) {
        setResetToken(r.devResetToken);
        setMode("reset");
      } else {
        toast("success", r.message);
        setMode("login");
      }
    } catch (e) { err(e); } finally { setBusy(false); }
  };

  const doReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 6) return toast("error", "Password must be at least 6 characters.");
    setBusy(true);
    try {
      await api.reset({ token: resetToken, password: newPw });
      toast("success", "Password updated — please sign in.");
      setMode("login");
      setPassword("");
    } catch (e) { err(e); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[#f4f2ec] dark:bg-void relative flex flex-col overflow-hidden">
      <div className="orb w-[520px] h-[520px] bg-primary/16 -top-40 left-1/2 -translate-x-1/2" />
      <div className="orb w-[380px] h-[380px] bg-magenta/10 bottom-0 -left-32" />
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
          className="glass-strong rounded-3xl w-full max-w-[440px] p-7 md:p-9 shadow-2xl">
          {mode === "login" && (
            <>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <p className="font-manrope text-[11px] font-bold tracking-[0.22em] uppercase text-primary dark:text-primary-soft">Welcome back</p>
                <h1 className="text-3xl font-medium tracking-tight mt-2">Sign in to <em className="font-display italic text-gradient-purple">InterNova</em></h1>
              </motion.div>
              <form onSubmit={doLogin} className="mt-7 space-y-4">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
                  <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e: any) => setEmail(e.target.value)} autoComplete="email" />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
                  <label className="block">
                    <span className="block text-[13px] font-medium mb-1.5 text-slate-500 dark:text-cream-dim">Password</span>
                    <span className="relative block">
                      <input type={showPw ? "text" : "password"} placeholder="••••••••" value={password}
                        onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
                        className="field-dark w-full px-4 py-2.5 pr-11 text-[15px]" />
                      <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-cream-dim hover:text-slate-900 dark:hover:text-cream">
                        {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </span>
                  </label>
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex justify-end">
                  <button type="button" onClick={() => setMode("forgot")} className="text-sm text-primary dark:text-primary-soft hover:text-slate-900 dark:hover:text-cream font-medium transition">Forgot Password?</button>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
                  <button disabled={busy} className="btn-hero w-full py-3 bg-primary btn-primary-glow text-white disabled:opacity-60">
                    {busy ? "Signing in…" : "Sign In"}
                  </button>
                </motion.div>
              </form>
              <div className="flex items-center gap-3 my-5 text-xs text-slate-500 dark:text-cream-dim">
                <span className="h-px flex-1 bg-slate-900/10 dark:bg-white/10" /> OR <span className="h-px flex-1 bg-slate-900/10 dark:bg-white/10" />
              </div>
              {GOOGLE_CLIENT_ID ? (
                <div className="flex justify-center">
                  <div className="w-full max-w-[340px] rounded-[18px] border border-slate-200 bg-white/80 p-1 shadow-[0_12px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:shadow-[0_12px_24px_rgba(0,0,0,0.24)]">
                    <div ref={googleBtnRef} className="w-full [&_iframe]:!rounded-[16px] [&_iframe]:!shadow-none [&_iframe]:!border-0 [&_iframe]:!overflow-hidden" />
                  </div>
                  {!googleReady && <p className="mt-2 text-xs text-slate-400 dark:text-cream-dim/60">Loading Google Sign-In…</p>}
                </div>
              ) : (
                <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                  Google sign-in is not configured yet.
                </div>
              )}
              <p className="text-center text-sm text-slate-500 dark:text-cream-dim mt-6">
                New to InterNova? <Link to="/register" className="text-primary dark:text-primary-soft hover:text-slate-900 dark:hover:text-cream font-semibold">Create an account</Link>
              </p>
            </>
          )}

          {mode === "otp" && (
            <>
              <button onClick={() => setMode("login")} className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-cream-dim hover:text-slate-900 dark:hover:text-cream mb-5"><ArrowLeft size={15} /> Back</button>
              <div className="w-12 h-12 rounded-2xl bg-primary/15 grid place-items-center text-primary dark:text-primary-soft"><ShieldCheck size={22} /></div>
              <h1 className="text-2xl font-medium tracking-tight mt-4">Check your email</h1>
              <p className="text-sm text-slate-500 dark:text-cream-dim mt-1.5">We sent a 6-digit code to <b className="text-slate-900 dark:text-cream">{email}</b></p>
              {devOtp && (
                <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-400/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                  Demo mode — your OTP is <b className="tabular text-base tracking-[0.2em]">{devOtp}</b>
                </div>
              )}
              <form onSubmit={doOtp} className="mt-6">
                <div className="flex gap-2.5 justify-between">
                  {otp.map((d, i) => (
                    <input key={i} ref={(el) => (otpRefs.current[i] = el)} value={d} inputMode="numeric" maxLength={1}
                      onChange={(e) => otpKey(i, e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus(); }}
                      onPaste={(e) => {
                        const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                        if (t.length >= 6) { e.preventDefault(); setOtp(t.split("")); otpRefs.current[5]?.focus(); }
                      }}
                      className="field-dark w-12 h-[52px] text-center text-xl font-bold tabular !rounded-xl" />
                  ))}
                </div>
                <button disabled={busy} className="btn-hero w-full py-3 mt-6 bg-primary btn-primary-glow text-white disabled:opacity-60">
                  {busy ? "Verifying…" : "Verify & Sign In"}
                </button>
              </form>
              <p className="text-center text-sm text-slate-500 dark:text-cream-dim mt-5">
                Didn't get it?{" "}
                {cool > 0 ? <span className="tabular">Resend in {cool}s</span> :
                  <button onClick={() => doLogin()} className="text-primary dark:text-primary-soft font-semibold hover:text-slate-900 dark:hover:text-cream">Resend code</button>}
              </p>
            </>
          )}

          {mode === "forgot" && (
            <>
              <button onClick={() => setMode("login")} className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-cream-dim hover:text-slate-900 dark:hover:text-cream mb-5"><ArrowLeft size={15} /> Back to sign in</button>
              <div className="w-12 h-12 rounded-2xl bg-primary/15 grid place-items-center text-primary dark:text-primary-soft"><KeyRound size={22} /></div>
              <h1 className="text-2xl font-medium tracking-tight mt-4">Reset password</h1>
              <p className="text-sm text-slate-500 dark:text-cream-dim mt-1.5">Enter your registered email and we'll send you a secure reset link.</p>
              <form onSubmit={doForgot} className="mt-6 space-y-4">
                <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e: any) => setEmail(e.target.value)} />
                <button disabled={busy} className="btn-hero w-full py-3 bg-primary btn-primary-glow text-white disabled:opacity-60">
                  {busy ? "Sending…" : "Send Reset Link"}
                </button>
              </form>
            </>
          )}

          {mode === "reset" && (
            <>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 grid place-items-center text-emerald-400"><CheckCircle2 size={22} /></div>
              <h1 className="text-2xl font-medium tracking-tight mt-4">Set a new password</h1>
              <p className="text-sm text-slate-500 dark:text-cream-dim mt-1.5 flex items-center gap-1.5"><Mail size={13} /> Demo mode — reset link verified inline.</p>
              <form onSubmit={doReset} className="mt-6 space-y-4">
                <Input label="New password" type="password" placeholder="Min. 6 characters" value={newPw} onChange={(e: any) => setNewPw(e.target.value)} />
                <button disabled={busy} className="btn-hero w-full py-3 bg-primary btn-primary-glow text-white disabled:opacity-60">
                  {busy ? "Updating…" : "Update Password"}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>

    </div>
  );
}
