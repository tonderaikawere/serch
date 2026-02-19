import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type AppRole } from "@/contexts/AuthContext";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, authError, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <img src="/favicon.svg" alt="Serch" className="h-12 w-12" />
          <div className="text-lg font-semibold text-foreground animate-bounce">Serch</div>
          <div className="text-sm text-muted-foreground">Loading…</div>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full border border-border rounded-lg p-6 bg-card">
          <div className="text-lg font-semibold text-foreground">Access problem</div>
          <div className="text-sm text-muted-foreground mt-2 break-words">{authError}</div>
          <div className="flex gap-2 mt-4">
            <button
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 bg-primary text-primary-foreground"
              onClick={async () => {
                await signOut();
                window.location.href = "/login";
              }}
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = profile?.role ?? "guest";
  const needsOnboarding = role !== "admin" && (profile?.hub == null || profile?.hub === "");

  if (needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

export function RequireRole({ allow, children }: { allow: AppRole[]; children: React.ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) return null;

  const role = profile?.role ?? "guest";

  if (!allow.includes(role)) {
    if (role === "admin") return <Navigate to="/admin" replace />;
    if (role === "instructor") return <Navigate to="/instructors" replace />;
    return <Navigate to="/students" replace />;
  }

  return <>{children}</>;
}
