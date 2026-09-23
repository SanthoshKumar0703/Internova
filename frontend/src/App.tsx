import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "./lib/auth";
import { ToastProvider } from "./components/ui";
import { ThemeProvider } from "./lib/theme";



import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
const Verify = lazy(() => import("./pages/Verify"));
const Student = lazy(() => import("./pages/dashboards/Student"));
const Mentor = lazy(() => import("./pages/dashboards/Mentor"));
const Company = lazy(() => import("./pages/dashboards/Company"));
const Admin = lazy(() => import("./pages/dashboards/Admin"));

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-void">
      <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
          <ScrollToTop />
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/verify/:code" element={<Verify />} />
            <Route
              path="/dashboard/student"
              element={
                <ProtectedRoute roles={["student"]}>
                  <Student />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/mentor"
              element={
                <ProtectedRoute roles={["mentor"]}>
                  <Mentor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/company"
              element={
                <ProtectedRoute roles={["company"]}>
                  <Company />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
