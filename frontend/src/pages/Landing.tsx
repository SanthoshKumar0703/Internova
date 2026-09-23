import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight, Award, BadgeCheck, Bell, Briefcase, Building2, CalendarCheck,
  Check, ChevronDown, FileText, Flag, GraduationCap, KanbanSquare, MapPin,
  Quote, Search, ShieldCheck, Sparkles, Star, Users, ShieldCheck as VerifyIcon, Zap,
} from "lucide-react";
import { Footer, HeroButton, LegalOverlay, SectionTag } from "../components/ui";
import { ThemeToggle, useTheme } from "../lib/theme";
import { api, Internship, safe } from "../lib/api";
import { mockInternships } from "../lib/mock";
import Threads from "../components/reactbits/Threads";
import WarpText from "../components/reactbits/WarpText";
import SpecularButton from "../components/reactbits/SpecularButton";
import MagicBento from "../components/reactbits/MagicBento";
import PillNav from "../components/reactbits/PillNav";

gsap.registerPlugin(ScrollTrigger);

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Discover", href: "#discover" },
  { label: "Journey", href: "#journey" },
  { label: "Success", href: "#success" },
  { label: "Verify", href: "/verify" },
];

const MARQUEE = [
  "TechNova Solutions", "2,400+ internships", "DataWings Analytics",
  "12,000+ students mentored", "PixelKraft Studio", "98% completion rate",
  "CloudNest", "320+ partner companies", "FinEdge", "Instant verification",
];

const WORKFLOW = [
  { icon: <Users size={22} />, t: "Register", d: "Create your profile in minutes" },
  { icon: <FileText size={22} />, t: "Apply", d: "One confident application" },
  { icon: <Building2 size={22} />, t: "Allocate", d: "Get selected & matched" },
  { icon: <CalendarCheck size={22} />, t: "Track", d: "Log work, tasks & growth" },
  { icon: <GraduationCap size={22} />, t: "Evaluate", d: "Mentor & company reviews" },
  { icon: <Award size={22} />, t: "Certify", d: "Verifiable certificate" },
];

const QUOTES = [
  { q: "InterNova turned my internship from a black box into a guided journey. My mentor saw everything — and so did I.", n: "Aarav Sharma", r: "Frontend Intern · TechNova" },
  { q: "We shortlist in hours, not weeks. The fit reasoning on every application is ridiculously useful.", n: "Priya Nair", r: "People Ops · TechNova" },
  { q: "Reviewing daily updates and tasks for all my interns takes me twenty minutes a day. It used to take my weekends.", n: "Dr. Kavya Menon", r: "Mentor · 12 yrs experience" },
];

export default function Landing() {
  const [internships, setInternships] = useState<Internship[]>(mockInternships as Internship[]);
  const [legal, setLegal] = useState<"privacy" | "terms" | null>(null);
  const navigate = useNavigate();
  const { mode } = useTheme();
  const isDark = mode === "dark";

  useEffect(() => {
    safe(() => api.internships(), mockInternships).then((r) =>
      setInternships((r.data as Internship[]).slice(0, 3))
    );
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .from("[data-hero='badge']", { y: 24, opacity: 0, duration: 0.7 }, 0.15)
        .from("[data-hero='title'] .line", { y: 90, opacity: 0, duration: 1, stagger: 0.12 }, "-=0.4")
        .from("[data-hero='sub']", { y: 24, opacity: 0, duration: 0.7 }, "-=0.55")
        .from("[data-hero='cta']", { y: 20, opacity: 0, duration: 0.6, stagger: 0.1 }, "-=0.5")
        .from("[data-hero='meta']", { opacity: 0, duration: 0.9 }, "-=0.3");

      
      gsap.to("[data-hero-content]", {
        yPercent: -16, opacity: 0.2, ease: "none",
        scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true },
      });

      
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          y: 48, opacity: 0, duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 86%" },
        });
      });
      gsap.utils.toArray<HTMLElement>("[data-reveal-group]").forEach((g) => {
        gsap.from(g.children, {
          y: 44, opacity: 0, duration: 0.85, stagger: 0.12, ease: "power3.out",
          scrollTrigger: { trigger: g, start: "top 84%" },
        });
      });

      
      gsap.utils.toArray<HTMLElement>("[data-float-card]").forEach((el, i) => {
        gsap.to(el, {
          y: i % 2 ? 46 : -46, ease: "none",
          scrollTrigger: { trigger: el.closest("section") || el, start: "top bottom", end: "bottom top", scrub: 1.2 },
        });
      });

      
      gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
        const target = parseFloat(el.dataset.count || "0");
        const suffix = el.dataset.suffix || "";
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target, duration: 1.8, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
          onUpdate: () => {
            el.textContent = Math.round(obj.v).toLocaleString("en-IN") + suffix;
          },
        });
      });

      
      const path = document.getElementById("connect-path") as unknown as SVGPathElement | null;
      if (path) {
        const len = path.getTotalLength();
        gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, {
          strokeDashoffset: 0, ease: "none",
          scrollTrigger: { trigger: "#connect", start: "top 75%", end: "center 45%", scrub: 1 },
        });
      }

      
      const ring = document.getElementById("grow-ring") as unknown as SVGCircleElement | null;
      if (ring) {
        const C = 2 * Math.PI * 54;
        gsap.fromTo(ring, { strokeDasharray: C, strokeDashoffset: C }, {
          strokeDashoffset: C * (1 - 0.84), duration: 1.6, ease: "power2.out",
          scrollTrigger: { trigger: "#grow", start: "top 70%", once: true },
        });
      }

      
      gsap.from("#cert-card", {
        y: 70, opacity: 0, scale: 0.94, rotateX: 12, duration: 1.1, ease: "power3.out",
        scrollTrigger: { trigger: "#success", start: "top 65%", once: true },
      });
    });

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <div className="relative bg-[#f4f2ec] dark:bg-void text-slate-900 dark:text-cream overflow-x-clip">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Threads
          color={isDark ? [0.62, 0.42, 1] : [0.36, 0.15, 0.72]}
          amplitude={1.4}
          distance={0.18}
          enableMouseInteraction={false}
        />
      </div>

      <div className="relative z-10">
      <div className="fixed top-4 inset-x-0 z-[100] px-4 flex items-center justify-between gap-3 max-w-6xl mx-auto">
        <div className="relative h-11">
        <PillNav
          logo="/logo-mark.svg"
          logoAlt="InterNova"
          items={NAV_ITEMS}
          activeHref="/"
          baseColor="#7b39fc"
          pillColor={isDark ? "#14121c" : "#ffffff"}
          pillTextColor={isDark ? "#f5f1e8" : "#171717"}
          hoveredPillTextColor="#ffffff"
        />
        </div>
        <div className="hidden md:flex items-center gap-2 liquid-glass rounded-full pl-2 pr-2 py-2">
          <ThemeToggle />
          <Link to="/login" className="font-cabin font-semibold text-sm text-slate-500 dark:text-cream-dim hover:text-slate-900 dark:hover:text-cream px-3 py-2 transition">Sign In</Link>
          <SpecularButton
            size="sm"
            radius={9999}
            tint="#7b39fc"
            tintOpacity={1}
            textColor="#ffffff"
            lineColor="#ffffff"
            baseColor="#4c1d95"
            onClick={() => navigate("/register")}
          >
            Sign Up
          </SpecularButton>
        </div>
        <ThemeToggle className="md:hidden" />
      </div>

      <section id="hero" className="relative min-h-[108vh] flex items-center justify-center overflow-hidden">
        <div className="orb w-[600px] h-[600px] bg-primary/20 top-1/4 left-1/2 -translate-x-1/2 animate-glow-pulse" />

        <div data-hero-content className="relative z-10 max-w-5xl mx-auto px-5 text-center pt-32 pb-40">
          <div data-hero="badge">
            <SectionTag><Sparkles size={13} /> Smart Internship Management System</SectionTag>
          </div>
          <div data-hero="title" className="mt-7">
            <WarpText
              text={"From application\nto achievement."}
              color={isDark ? "#f5f1e8" : "#171717"}
              fontFamily="var(--font-sans)"
              fontWeight={600}
              letterSpacing="-0.03em"
              lineHeight={0.98}
              fontSize="clamp(2.8rem, 8.4vw, 6.6rem)"
              warpStrength={0.09}
              warpScale={1.6}
              speed={0.5}
              pointerInfluence={0.4}
              pointerStrength={0.4}
              refraction={0.02}
              ripple
              style={{ height: "clamp(220px, 34vw, 380px)" }}
            />
          </div>
          <p data-hero="sub" className="mt-6 text-slate-600 dark:text-cream/80 text-lg max-w-md mx-auto leading-relaxed">
            InterNova connects students, companies and mentors on one intelligent platform — tracked, guided and certified.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <span data-hero="cta">
              <SpecularButton
                size="lg"
                radius={9999}
                tint={isDark ? "#ffffff" : "#171717"}
                tintOpacity={isDark ? 0.08 : 0.05}
                textColor={isDark ? "#f5f1e8" : "#171717"}
                lineColor="#9d6bff"
                baseColor={isDark ? "#f5f1e8" : "#171717"}
                onClick={() => document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" })}
              >
                Explore Platform
              </SpecularButton>
            </span>
            <span data-hero="cta">
              <SpecularButton
                size="lg"
                radius={9999}
                tint="#7b39fc"
                tintOpacity={1}
                textColor="#ffffff"
                lineColor="#ffffff"
                baseColor="#4c1d95"
                onClick={() => navigate("/register")}
              >
                Get Started
              </SpecularButton>
            </span>
          </div>
          <div data-hero="meta" className="mt-10 flex items-center justify-center gap-3 text-sm text-slate-500 dark:text-cream-dim">
            <div className="flex -space-x-2.5">
              {["AS", "DP", "KM"].map((a, i) => (
                <span key={a} className="w-8 h-8 rounded-full grid place-items-center text-[11px] font-bold border-2 border-[#f4f2ec] dark:border-void text-white"
                  style={{ background: ["#7b39fc", "#0ea5e9", "#ec4899"][i] }}>{a}</span>
              ))}
            </div>
            <span className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={13} className="fill-amber-400 text-amber-400" />)}
            </span>
            <span>Trusted by <b className="text-slate-900 dark:text-cream">12,000+</b> students</span>
          </div>
        </div>

        <a href="#discover" className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 text-slate-500 dark:text-cream-dim hover:text-slate-900 dark:hover:text-cream transition text-xs font-manrope tracking-[0.2em] uppercase">
          Scroll to explore <ChevronDown size={18} className="animate-bounce" />
        </a>
      </section>

      <div className="relative border-y border-slate-900/10 dark:border-white/10 bg-white/80 dark:bg-black/60 py-4 overflow-hidden mask-fade-x -mt-16 z-20">
        <div className="flex w-max animate-marquee gap-0">
          {[0, 1].map((k) => (
            <div key={k} className="flex items-center shrink-0">
              {MARQUEE.map((m) => (
                <span key={k + m} className="flex items-center gap-8 pr-8 font-manrope text-sm font-semibold text-slate-500 dark:text-cream-dim whitespace-nowrap">
                  {m} <Zap size={13} className="text-primary" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section id="discover" className="relative py-28 md:py-36">
        <div className="orb w-[420px] h-[420px] bg-primary/12 top-10 -left-40" />
        <div className="max-w-6xl mx-auto px-5 grid lg:grid-cols-2 gap-14 items-center">
          <div data-reveal>
            <SectionTag>01 — Discover</SectionTag>
            <h2 className="mt-5 text-4xl md:text-[3.4rem] font-medium tracking-tight leading-[1.04]">
              Discover opportunities that fit your <em className="font-display italic text-gradient-purple">journey.</em>
            </h2>
            <p className="mt-5 text-slate-600 dark:text-cream/70 text-lg leading-relaxed max-w-md">
              Search across verified internships by domain, skill, location and work mode — every listing structured, every company real.
            </p>
            <ul className="mt-7 space-y-3.5">
              {["Smart filters across domain, skills, mode & stipend", "Transparent openings, deadlines & expectations", "Skill-fit insights on every single role"].map((t) => (
                <li key={t} className="flex items-center gap-3 text-slate-600 dark:text-cream/85">
                  <span className="w-6 h-6 rounded-full bg-primary/20 grid place-items-center shrink-0"><Check size={13} className="text-primary dark:text-primary-soft" /></span>
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-8"><HeroButton to="/register" variant="glass" small>Start discovering <ArrowRight size={15} /></HeroButton></div>
          </div>
          <div className="relative" data-reveal-group>
            <div className="absolute inset-0 bg-primary/15 blur-[100px] rounded-full scale-75" />
            <div className="relative z-10 flex flex-col gap-4 md:gap-0">
              {internships.map((it, i) => (
                <div key={it._id} data-float-card
                  className={`glass-card card-hover rounded-2xl p-5 relative w-full md:max-w-[92%] ${i === 1 ? "md:ml-12 md:my-4" : i === 2 ? "md:ml-6" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-[17px]">{it.title}</p>
                      <p className="text-sm text-slate-500 dark:text-cream-dim flex items-center gap-1.5 mt-1">
                        <Building2 size={13} /> {it.companyName} · <MapPin size={13} /> {it.location}
                      </p>
                    </div>
                    <span className="liquid-glass rounded-full px-3 py-1 text-xs font-cabin font-semibold text-primary dark:text-primary-soft whitespace-nowrap">{it.mode}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {(it.skills || []).slice(0, 4).map((s) => (
                      <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-slate-600 dark:text-cream/75">{s}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-4 text-xs text-slate-500 dark:text-cream-dim">
                    <span>{it.duration} · {it.stipend}</span>
                    <span className="text-primary dark:text-primary-soft font-semibold">Apply →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="apply" className="relative py-28 md:py-36 bg-white/70 dark:bg-black/30 border-y border-slate-900/10 dark:border-white/5">
        <div className="max-w-6xl mx-auto px-5 grid lg:grid-cols-2 gap-14 items-center">
          <div className="order-2 lg:order-1" data-reveal>
            <div data-float-card className="glass-card rounded-3xl p-6 md:p-8 max-w-md mx-auto relative overflow-hidden">
              <div className="orb w-64 h-64 bg-primary/25 -top-20 -right-20" />
              <p className="font-manrope text-[11px] font-bold tracking-[0.2em] uppercase text-primary dark:text-primary-soft">Application</p>
              <p className="text-xl font-bold mt-2">Backend Developer Intern</p>
              <p className="text-sm text-slate-500 dark:text-cream-dim">TechNova Solutions · Hybrid</p>
              <div className="mt-5 space-y-3">
                <div className="field-dark px-4 py-3 text-sm text-slate-500 dark:text-cream-dim flex items-center gap-2.5">
                  <FileText size={15} className="text-primary dark:text-primary-soft" /> aarav_resume.pdf <span className="ml-auto text-emerald-400 text-xs font-bold">Attached</span>
                </div>
                <div className="field-dark px-4 py-3 text-sm text-slate-500 dark:text-cream-dim leading-relaxed">
                  “I built a FastAPI event logger that handles my homelab telemetry…”
                </div>
              </div>
              <div className="flex items-center mt-6 text-[11px] font-semibold">
                {["Applied", "Review", "Shortlisted"].map((s, i) => (
                  <span key={s} className="flex items-center gap-1.5">
                    <span className={`w-5 h-5 rounded-full grid place-items-center text-[10px] ${i < 2 ? "bg-emerald-500 text-white" : "bg-primary text-white"}`}>{i < 2 ? <Check size={11} /> : "3"}</span>
                    <span className={i < 2 ? "text-slate-600 dark:text-cream/80" : "text-slate-900 dark:text-cream"}>{s}</span>
                    {i < 2 && <span className="w-6 md:w-10 h-px bg-slate-900/20 dark:bg-white/20 mx-1.5" />}
                  </span>
                ))}
              </div>
              <button className="btn-hero w-full mt-6 py-3 bg-primary btn-primary-glow text-white font-cabin">Submit Application</button>
            </div>
          </div>
          <div className="order-1 lg:order-2" data-reveal>
            <SectionTag>02 — Apply</SectionTag>
            <h2 className="mt-5 text-4xl md:text-[3.4rem] font-medium tracking-tight leading-[1.04]">
              Apply with <em className="font-display italic text-gradient-purple">confidence.</em>
            </h2>
            <p className="mt-5 text-slate-600 dark:text-cream/70 text-lg leading-relaxed max-w-md">
              One profile, one click. Your resume, skills and cover letter travel together — and a live stepper shows exactly where you stand.
            </p>
            <ul className="mt-7 space-y-3.5">
              {["Visual stepper: Applied → Allocated", "Instant notifications on every status change", "No black boxes, no ghosting, ever"].map((t) => (
                <li key={t} className="flex items-center gap-3 text-slate-600 dark:text-cream/85">
                  <span className="w-6 h-6 rounded-full bg-primary/20 grid place-items-center shrink-0"><Check size={13} className="text-primary dark:text-primary-soft" /></span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="connect" className="relative py-28 md:py-36">
        <div className="max-w-6xl mx-auto px-5 text-center" data-reveal>
          <SectionTag>03 — Connect</SectionTag>
          <h2 className="mt-5 text-4xl md:text-[3.4rem] font-medium tracking-tight leading-[1.04] max-w-3xl mx-auto">
            One connected platform, every step <em className="font-display italic text-gradient-purple">monitored.</em>
          </h2>
          <p className="mt-5 text-slate-600 dark:text-cream/70 text-lg max-w-xl mx-auto">Applications flow to companies, mentors get assigned automatically, and everyone sees the same truth.</p>
        </div>
        <div className="max-w-5xl mx-auto px-5 mt-14 relative">
          <svg className="absolute left-[12%] right-[12%] top-16 w-[76%] h-8 hidden md:block" preserveAspectRatio="none" viewBox="0 0 600 32" fill="none">
            <path id="connect-path" d="M4 16 C 150 4, 450 28, 596 16" stroke="#7b39fc" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="grid md:grid-cols-3 gap-5 relative" data-reveal-group>
            {[
              { icon: <Search size={22} />, t: "Student applies", d: "Profile, resume & cover letter in one polished packet.", tag: "Student" },
              { icon: <Building2 size={22} />, t: "Company reviews", d: "Skill-fit reasoning on every candidate. Shortlist in clicks.", tag: "Company" },
              { icon: <GraduationCap size={22} />, t: "Mentor assigned", d: "An expert guide from day one — reviews, feedback, growth.", tag: "Mentor" },
            ].map((c) => (
              <div key={c.t} className="glass-card card-hover rounded-2xl p-6 text-left">
                <div className="flex items-center justify-between">
                  <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-magenta grid place-items-center shadow-lg">{c.icon}</span>
                  <span className="font-manrope text-[10px] font-bold tracking-[0.18em] uppercase text-primary dark:text-primary-soft">{c.tag}</span>
                </div>
                <p className="font-bold text-lg mt-4">{c.t}</p>
                <p className="text-sm text-slate-500 dark:text-cream-dim mt-1.5 leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="grow" className="relative py-28 md:py-36 bg-white/70 dark:bg-black/30 border-y border-slate-900/10 dark:border-white/5 overflow-hidden">
        <div className="orb w-[500px] h-[500px] bg-magenta/10 bottom-0 right-0" />
        <div className="max-w-6xl mx-auto px-5 grid lg:grid-cols-[1fr_1.2fr] gap-14 items-center">
          <div data-reveal>
            <SectionTag>04 — Grow</SectionTag>
            <h2 className="mt-5 text-4xl md:text-[3.4rem] font-medium tracking-tight leading-[1.04]">
              Track progress that actually means <em className="font-display italic text-gradient-purple">something.</em>
            </h2>
            <p className="mt-5 text-slate-600 dark:text-cream/70 text-lg leading-relaxed max-w-md">
              Attendance calendars, kanban tasks, milestone timelines and daily reflections — reviewed by a real mentor, not an algorithm.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="liquid-glass rounded-full px-4 py-2 text-sm flex items-center gap-2"><CalendarCheck size={15} className="text-primary dark:text-primary-soft" /> Attendance rings</span>
              <span className="liquid-glass rounded-full px-4 py-2 text-sm flex items-center gap-2"><KanbanSquare size={15} className="text-primary dark:text-primary-soft" /> Kanban boards</span>
              <span className="liquid-glass rounded-full px-4 py-2 text-sm flex items-center gap-2"><Flag size={15} className="text-primary dark:text-primary-soft" /> Milestones</span>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5" data-reveal-group>
            <div className="glass-card rounded-2xl p-6 text-center">
              <p className="font-manrope text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500 dark:text-cream-dim mb-4">Attendance</p>
              <div className="relative inline-grid place-items-center text-slate-200 dark:text-white/10">
                <svg width="140" height="140" className="-rotate-90">
                  <circle cx="70" cy="70" r="54" fill="none" stroke="currentColor" strokeWidth="12" />
                  <circle id="grow-ring" cx="70" cy="70" r="54" fill="none" stroke="#7b39fc" strokeWidth="12" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 grid place-items-center"><span className="text-3xl font-extrabold tabular">84%</span></div>
              </div>
              <p className="text-xs text-slate-500 dark:text-cream-dim mt-3">16 of 19 days present</p>
            </div>
            <div className="glass-card rounded-2xl p-6">
              <p className="font-manrope text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500 dark:text-cream-dim mb-4">This week</p>
              {[
                ["Notifications centre UI", "In Progress", "bg-sky-500/15 text-sky-700 dark:text-sky-300"],
                ["Export tests coverage", "In Review", "bg-amber-500/15 text-amber-700 dark:text-amber-300"],
                ["A11y audit pass", "To Do", "bg-slate-900/5 dark:bg-white/5 text-slate-500 dark:text-cream-dim"],
              ].map(([t, s, c]) => (
                <div key={t as string} className="rounded-xl bg-slate-900/[0.04] dark:bg-white/[0.03] border border-slate-900/10 dark:border-white/10 px-3.5 py-2.5 mb-2.5">
                  <p className="text-sm font-semibold truncate">{t}</p>
                  <span className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${c}`}>{s}</span>
                </div>
              ))}
            </div>
            <div className="glass-card rounded-2xl p-6 sm:col-span-2">
              <p className="font-manrope text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500 dark:text-cream-dim mb-4">Milestone timeline</p>
              <div className="flex items-center">
                {["Onboarding", "Core Sprint", "Polish", "Demo"].map((m, i) => (
                  <div key={m} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <span className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold ${i < 2 ? "bg-emerald-500 text-white" : i === 2 ? "bg-primary text-white shadow-[0_0_16px_rgba(123,57,252,0.8)]" : "bg-slate-900/10 dark:bg-white/10 text-slate-500 dark:text-cream-dim"}`}>
                        {i < 2 ? <Check size={13} /> : i + 1}
                      </span>
                      <span className="mt-1.5 text-[11px] font-semibold text-slate-600 dark:text-cream/80 whitespace-nowrap">{m}</span>
                    </div>
                    {i < 3 && <span className={`h-0.5 flex-1 mx-2 mb-6 rounded ${i < 2 ? "bg-emerald-400" : "bg-slate-900/15 dark:bg-white/15"}`} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="success" className="relative py-28 md:py-36 overflow-hidden">
        <div className="orb w-[560px] h-[560px] bg-primary/14 top-10 left-1/2 -translate-x-1/2 animate-glow-pulse" />
        <div className="max-w-6xl mx-auto px-5 grid lg:grid-cols-2 gap-14 items-center">
          <div data-reveal>
            <SectionTag>05 — Achieve</SectionTag>
            <h2 className="mt-5 text-4xl md:text-[3.4rem] font-medium tracking-tight leading-[1.04]">
              Earn a certificate that's instantly <em className="font-display italic text-gradient-purple">verifiable.</em>
            </h2>
            <p className="mt-5 text-slate-600 dark:text-cream/70 text-lg leading-relaxed max-w-md">
              Complete your criteria, get evaluated, and receive a certificate with a unique ID any recruiter can verify in seconds — no login needed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <HeroButton to="/verify">Verify a certificate <ShieldCheck size={16} /></HeroButton>
              <HeroButton to="/register" variant="glass">Get started</HeroButton>
            </div>
          </div>
          <div className="relative">
            <div id="cert-card" className="glass-card rounded-3xl p-8 max-w-md mx-auto relative overflow-hidden">
              <div className="absolute inset-3 rounded-2xl border border-primary/40 pointer-events-none" />
              <div className="text-center relative">
                <p className="font-manrope text-[10px] font-bold tracking-[0.3em] text-primary dark:text-primary-soft">INTERNOVA</p>
                <p className="font-display italic text-3xl mt-2 text-gradient">Certificate of Completion</p>
                <p className="text-xs text-slate-500 dark:text-cream-dim mt-3">Proudly presented to</p>
                <p className="font-display italic text-[26px] mt-1">Aarav Sharma</p>
                <div className="w-40 h-px bg-gradient-to-r from-transparent via-primary to-transparent mx-auto my-4" />
                <p className="text-sm text-slate-600 dark:text-cream/85">Frontend Developer Intern · TechNova Solutions</p>
                <p className="text-xs text-slate-500 dark:text-cream-dim mt-1 tabular">Jan 2026 – Jun 2026 · Grade A</p>
                <p className="mt-4 inline-block font-mono text-sm px-4 py-1.5 rounded-lg bg-slate-900/5 dark:bg-white/5 border border-slate-900/15 dark:border-white/15 tabular">INT-2026-004821</p>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-700 dark:text-emerald-300 text-sm font-bold ml-3">
                  <BadgeCheck size={16} /> VERIFIED
                </div>
              </div>
            </div>
            <div className="absolute -top-4 -right-2 md:right-8 liquid-glass rounded-2xl px-4 py-3 flex items-center gap-2.5 animate-float">
              <Bell size={16} className="text-primary dark:text-primary-soft" />
              <div className="text-left"><p className="text-xs font-bold">Certificate generated</p><p className="text-[11px] text-slate-500 dark:text-cream-dim">Just now</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-y border-slate-900/10 dark:border-white/10 bg-white/80 dark:bg-black/50">
        <div className="max-w-6xl mx-auto px-5 py-14 grid grid-cols-2 md:grid-cols-4 gap-8 text-center" data-reveal-group>
          {[
            ["850", "+", "Internships listed"],
            ["320", "+", "Partner companies"],
            ["12", "k+", "Students mentored"],
            ["98", "%", "Completion rate"],
          ].map(([n, s, l]) => (
            <div key={l as string}>
              <p className="text-4xl md:text-5xl font-extrabold tabular text-gradient" data-count={n} data-suffix={s}>0</p>
              <p className="mt-2 font-manrope text-xs font-bold tracking-[0.16em] uppercase text-slate-500 dark:text-cream-dim">{l}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="journey" className="relative py-28 md:py-32">
        <div className="max-w-6xl mx-auto px-5 text-center" data-reveal>
          <SectionTag>The Journey</SectionTag>
          <h2 className="mt-5 text-4xl md:text-[3.2rem] font-medium tracking-tight">
            Six steps from <em className="font-display italic text-gradient-purple">sign-up</em> to <em className="font-display italic text-gradient-purple">certified.</em>
          </h2>
        </div>
        <div className="max-w-6xl mx-auto px-5 mt-12" data-reveal>
          <div className="rounded-[2rem] bg-[#0b0714] p-4 sm:p-6 border border-white/10">
            <MagicBento
              cards={WORKFLOW.map((w, i) => ({
                color: "#120F17",
                title: w.t,
                description: w.d,
                label: `0${i + 1}`,
                icon: w.icon,
              }))}
              glowColor="123, 57, 252"
              enableTilt
              enableStars
              enableSpotlight
              enableBorderGlow
              enableMagnetism
              clickEffect
              particleCount={10}
              spotlightRadius={280}
            />
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-5 mt-16 grid md:grid-cols-3 gap-5" data-reveal-group>
          {QUOTES.map((t) => (
            <figure key={t.n} className="glass-card rounded-2xl p-6 flex flex-col">
              <Quote size={20} className="text-primary" />
              <blockquote className="text-[15px] leading-relaxed text-slate-600 dark:text-cream/85 mt-3 flex-1">“{t.q}”</blockquote>
              <figcaption className="mt-4 pt-4 border-t border-slate-900/10 dark:border-white/10">
                <p className="font-bold text-sm">{t.n}</p>
                <p className="text-xs text-slate-500 dark:text-cream-dim">{t.r}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="relative px-4 pb-24">
        <div className="max-w-5xl mx-auto glass-card rounded-[2rem] px-6 py-16 md:py-20 text-center relative overflow-hidden" data-reveal>
          <div className="orb w-[420px] h-[420px] bg-primary/25 -top-32 left-1/2 -translate-x-1/2" />
          <div className="absolute inset-0 grid-lines opacity-50" />
          <div className="relative">
            <Briefcase size={28} className="mx-auto text-primary dark:text-primary-soft" />
            <h2 className="mt-4 text-4xl md:text-6xl font-medium tracking-tight">
              Ready to launch your <em className="font-display italic text-gradient-purple">career?</em>
            </h2>
            <p className="mt-4 text-slate-600 dark:text-cream/70 text-lg max-w-md mx-auto">Join thousands of students and companies building the future of internships.</p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <HeroButton to="/register">Get Started Free <ArrowRight size={17} /></HeroButton>
              <HeroButton to="/verify" variant="glass"><ShieldCheck size={16} /> Verify Certificate</HeroButton>
            </div>
          </div>
        </div>
      </section>

      <Footer onLegal={setLegal} />
      <AnimatePresence>{legal && <LegalOverlay kind={legal} onClose={() => setLegal(null)} />}</AnimatePresence>
      </div>
    </div>
  );
}
