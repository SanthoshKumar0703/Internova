import React, { createContext, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, getToken, setToken, User } from "./api";

interface AuthCtx {
  user: User | null;
  ready: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  ready: false,
  login: () => {},
  logout: () => {},
  refresh: async () => {},
  setUser: () => {},
});

export const useAuth = () => useContext(Ctx);

export const dashboardFor = (role?: string) =>
  role === "mentor"
    ? "/dashboard/mentor"
    : role === "company"
    ? "/dashboard/company"
    : role === "admin"
    ? "/dashboard/admin"
    : "/dashboard/student";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem("internova_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [ready, setReady] = useState(false);

  const refresh = async () => {
    if (!getToken()) {
      setUser(null);
      setReady(true);
      return;
    }
    try {
      const u = await api.me();
      setUser(u);
      localStorage.setItem("internova_user", JSON.stringify(u));
    } catch (e: any) {
      if (e?.status === 401) {
        
        
        setToken(null);
        setUser(null);
        try {
          localStorage.removeItem("internova_user");
        } catch {}
      }
      
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = (token: string, u: User) => {
    setToken(token);
    setUser(u);
    try {
      localStorage.setItem("internova_user", JSON.stringify(u));
    } catch {}
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem("internova_user");
    } catch {}
  };

  return (
    <Ctx.Provider value={{ user, ready, login, logout, refresh, setUser }}>
      {children}
    </Ctx.Provider>
  );
}

export function ProtectedRoute({
  roles,
  children,
}: {
  roles?: string[];
  children: React.ReactNode;
}) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready)
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/15 border-t-primary animate-spin" />
      </div>
    );
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (roles && !roles.includes(user.role))
    return <Navigate to={dashboardFor(user.role)} replace />;
  return <>{children}</>;
}
