import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Bell, Globe, LogOut, Menu, X } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { announceNew } from "../lib/notify";
import { ThemeToggle } from "../lib/theme";
import { Avatar, Logo } from "./ui";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export default function DashShell({
  roleLabel, nav, active, onNav, title, subtitle, children, actions, thin: thinProp = false, compactNav = false,
}: {
  roleLabel: string;
  nav: NavItem[];
  active: string;
  onNav: (id: string) => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  thin?: boolean;
  compactNav?: boolean;
}) {
  const thin = thinProp || compactNav;
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const poll = useRef<any>(null);

  const loadNotifs = async () => {
    try {
      const r = await api.notifications();
      setNotifs(r.items || []);
      setUnread(r.unread || 0);
      announceNew(r.items || []);
    } catch {}
  };

  useEffect(() => {
    loadNotifs();
    poll.current = setInterval(loadNotifs, 30000);
    return () => clearInterval(poll.current);
  }, []);

  const markRead = async (id?: string) => {
    try {
      if (id) await api.readNotif(id);
      else await api.readAllNotifs();
      loadNotifs();
    } catch {}
  };

  const doLogout = () => {
    logout();
    navigate("/");
  };

  const navBtn = (n: NavItem) => (
    <button
      key={n.id}
      onClick={() => { onNav(n.id); setDrawer(false); }}
      title={n.label}
      className={`relative flex items-center gap-3 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f2ec] dark:focus-visible:ring-offset-void ${
        thin ? "justify-center w-12 h-12 mx-auto" : "px-3.5 py-2.5 w-full text-[14px] font-medium"
      } ${active === n.id
        ? "bg-primary/15 text-primary dark:bg-primary/20 dark:text-white shadow-[inset_0_0_0_1px_rgba(123,57,252,0.5),0_4px_20px_-6px_rgba(123,57,252,0.6)]"
        : "text-slate-600 hover:text-slate-900 hover:bg-violet-50 dark:text-cream-dim dark:hover:text-cream dark:hover:bg-white/10"}`}>
      <span className="shrink-0">{n.icon}</span>
      {!thin && <span className="truncate">{n.label}</span>}
      {n.badge ? (
        <span className={`grid place-items-center min-w-[20px] h-5 px-1 rounded-full bg-primary text-white text-[11px] font-bold ${thin ? "absolute -top-1 -right-1" : "ml-auto"}`}>
          {n.badge}
        </span>
      ) : null}
    </button>
  );

  return (
    <div className="h-screen w-full bg-[#f4f2ec] dark:bg-void text-slate-900 dark:text-cream flex overflow-hidden relative">
      <div className="orb w-[500px] h-[500px] bg-primary/14 -top-40 -left-40" />
      <div className="orb w-[400px] h-[400px] bg-magenta/10 bottom-0 right-0" />

      <aside className={`hidden md:flex flex-col shrink-0 py-5 px-3 gap-1.5 relative z-10 ${thin ? "w-[84px]" : "w-60"}`}>
        <div className={`${thin ? "justify-center" : "px-2"} flex mb-5`}>
          <Logo compact={thin} />
        </div>
        {!thin && (
          <p className="px-3 mb-1 font-manrope text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 dark:text-cream-dim/70">{roleLabel}</p>
        )}
        <nav className="flex-1 space-y-1 overflow-y-auto">{nav.map(navBtn)}</nav>
        <div className={`${thin ? "justify-center" : ""} flex pt-3 border-t border-slate-900/10 dark:border-white/10`}>
          <Link to="/verify" title="Verify a certificate"
            className={`flex items-center gap-2.5 text-slate-500 hover:text-slate-900 dark:text-cream-dim dark:hover:text-cream text-sm transition ${thin ? "w-12 h-12 justify-center" : "px-3.5 py-2"}`}>
            <BadgeCheck size={20} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
            {!thin && "Verify certificate"}
          </Link>
        </div>
      </aside>

      <AnimatePresence>
        {drawer && (
          <motion.div className="fixed inset-0 z-[130] md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70" onClick={() => setDrawer(false)} />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute left-0 top-0 bottom-0 w-[270px] bg-white dark:bg-panel border-r border-slate-900/10 dark:border-white/10 p-4 flex flex-col gap-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <Logo />
                <button onClick={() => setDrawer(false)} className="w-9 h-9 grid place-items-center rounded-full hover:bg-slate-900/5 dark:hover:bg-white/10"><X size={18} /></button>
              </div>
              {nav.map((n) => (
                <button key={n.id} onClick={() => { onNav(n.id); setDrawer(false); }}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium w-full ${active === n.id ? "bg-primary/15 text-primary dark:bg-primary/20 dark:text-white" : "text-slate-500 dark:text-cream-dim"}`}>
                  {n.icon}<span>{n.label}</span>
                  {n.badge ? <span className="ml-auto grid place-items-center min-w-[20px] h-5 px-1 rounded-full bg-primary text-white text-[11px] font-bold">{n.badge}</span> : null}
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="flex items-center gap-3 px-4 md:px-6 h-[68px] shrink-0">
          <button onClick={() => setDrawer(true)} className="md:hidden w-10 h-10 grid place-items-center rounded-xl hover:bg-slate-900/5 dark:hover:bg-white/10"><Menu size={20} /></button>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold tracking-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs text-slate-500 dark:text-cream-dim truncate hidden sm:block">{subtitle}</p>}
          </div>
          <div className="flex-1" />
          {actions}
          <ThemeToggle />
          <div className="relative">
            <button onClick={() => { setShowNotifs((v) => !v); setShowUser(false); }}
              className="relative w-10 h-10 grid place-items-center rounded-xl hover:bg-slate-900/5 dark:hover:bg-white/10 transition" title="Notifications">
              <Bell size={19} />
              {unread > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold grid place-items-center tabular">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
            <AnimatePresence>
              {showNotifs && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                  <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    className="absolute right-0 top-12 w-[340px] max-w-[calc(100vw-32px)] glass-strong rounded-2xl p-2 z-50 shadow-2xl">
                    <div className="flex items-center justify-between px-3 py-2">
                      <p className="font-bold text-sm">Notifications</p>
                      {unread > 0 && <button onClick={() => markRead()} className="text-xs text-primary hover:text-slate-900 dark:text-primary-soft dark:hover:text-cream font-semibold">Mark all read</button>}
                    </div>
                    <div className="max-h-[380px] overflow-y-auto space-y-1">
                      {notifs.length === 0 && <p className="text-sm text-slate-500 dark:text-cream-dim text-center py-6">You're all caught up.</p>}
                      {notifs.map((n) => (
                        <button key={n._id} onClick={() => { markRead(n._id); setShowNotifs(false); if (n.link) navigate(n.link); }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl transition hover:bg-slate-900/5 dark:hover:bg-white/5 ${n.read ? "opacity-60" : "bg-primary/8"}`}>
                          <p className="text-[13px] font-semibold flex items-center gap-2">
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                            {n.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-cream-dim mt-0.5 line-clamp-2">{n.body}</p>
                          <p className="text-[10px] text-slate-400 dark:text-cream-dim/60 mt-1 tabular">{String(n.createdAt || "").slice(0, 10)}</p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          <div className="relative">
            <button onClick={() => { setShowUser((v) => !v); setShowNotifs(false); }} className="flex items-center gap-2 rounded-xl hover:bg-slate-900/5 dark:hover:bg-white/10 p-1.5 pr-2 transition">
              <Avatar name={user?.name} avatar={user?.avatar} color={user?.color} size={32} />
            </button>
            <AnimatePresence>
              {showUser && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUser(false)} />
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 top-12 w-56 glass-strong rounded-2xl p-2 z-50 shadow-2xl">
                    <div className="px-3 py-2.5 border-b border-slate-900/10 dark:border-white/10 mb-1">
                      <p className="font-bold text-sm truncate">{user?.name}</p>
                      <p className="text-xs text-slate-500 dark:text-cream-dim truncate capitalize">{user?.role} · {user?.email}</p>
                    </div>
                    <Link to="/" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-900/5 dark:text-cream-dim dark:hover:text-cream dark:hover:bg-white/5">
                      <Globe size={16} /> View website
                    </Link>
                    <button onClick={doLogout} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-rose-600 hover:bg-rose-500/10 dark:text-rose-300 w-full">
                      <LogOut size={16} /> Sign out
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </header>

        <main className="flex-1 min-h-0 px-3 md:px-6 pb-4 md:pb-5">
          <div className="panel-light rounded-2xl h-full overflow-y-auto p-4 md:p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.8)]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
