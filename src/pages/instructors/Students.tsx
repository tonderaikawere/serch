import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { firestore } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type StudentRow = {
  uid: string;
  displayName: string | null;
  email: string | null;
  hub: string | null;
};

export default function InstructorStudents() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    const hub = profile?.hub;
    if (!hub) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const q = query(collection(firestore, "students"), where("hub", "==", hub));
        const snap = await getDocs(q);
        const next: StudentRow[] = snap.docs.map((d) => {
          const data = d.data() as { uid?: string; displayName?: string | null; email?: string | null; hub?: string | null };
          return {
            uid: data.uid ?? d.id,
            displayName: data.displayName ?? null,
            email: data.email ?? null,
            hub: data.hub ?? null,
          };
        });
        if (!cancelled) setStudents(next);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.hub]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const name = (s.displayName ?? "").toLowerCase();
      const email = (s.email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [searchTerm, students]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">My Students</h1>
          <p className="text-muted-foreground mt-1">Students in your hub.</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Students</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">Hub: {profile?.hub ?? "—"}</div>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {!profile?.hub && (
              <div className="text-sm text-muted-foreground">Choose a hub in onboarding to see students.</div>
            )}

            {profile?.hub && loading && <div className="text-sm text-muted-foreground">Loading…</div>}

            {profile?.hub && !loading && error && (
              <div className="text-sm text-muted-foreground break-words">{error}</div>
            )}

            {profile?.hub && !loading && !error && filtered.length === 0 && (
              <div className="text-sm text-muted-foreground">No students found for this hub.</div>
            )}

            {profile?.hub && !loading && !error && filtered.length > 0 && (
              <div className="space-y-3">
                {filtered.map((s) => (
                  <Link
                    key={s.uid}
                    to={`/instructors/students/${s.uid}`}
                    className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate">{s.displayName ?? "Unnamed student"}</div>
                      <div className="text-sm text-muted-foreground truncate">{s.email ?? s.uid}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">{s.hub ?? "—"}</div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
