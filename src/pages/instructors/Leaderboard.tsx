import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { firestore } from "@/lib/firebase";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { Search } from "lucide-react";

type StudentRow = {
  uid: string;
  displayName: string | null;
  email: string | null;
  hub: string | null;
  points: number | null;
};

export default function InstructorLeaderboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const ref = collection(firestore, "students");
        const snap = await getDocs(query(ref, limit(1000)));

        const next: StudentRow[] = snap.docs.map((d) => {
          const data = d.data() as { uid?: string; displayName?: string | null; email?: string | null; hub?: string | null; points?: number };
          return {
            uid: data.uid ?? d.id,
            displayName: data.displayName ?? null,
            email: data.email ?? null,
            hub: data.hub ?? null,
            points: typeof data.points === "number" ? data.points : null,
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
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const name = (s.displayName ?? "").toLowerCase();
      const email = (s.email ?? "").toLowerCase();
      const hub = (s.hub ?? "").toLowerCase();
      return name.includes(q) || email.includes(q) || hub.includes(q);
    });
  }, [searchTerm, students]);

  const leaderboard = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      const ap = a.points ?? -1;
      const bp = b.points ?? -1;
      if (bp !== ap) return bp - ap;
      return (a.displayName ?? a.email ?? a.uid).localeCompare(b.displayName ?? b.email ?? b.uid);
    });
    return sorted.map((s, idx) => ({ ...s, rank: idx + 1 }));
  }, [filtered]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Leaderboard</h1>
          <p className="text-muted-foreground mt-1">All students across all hubs.</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Students</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or hub…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
            {!loading && error && <div className="text-sm text-muted-foreground break-words">{error}</div>}

            {!loading && !error && leaderboard.length === 0 && (
              <div className="text-sm text-muted-foreground">No students found.</div>
            )}

            {!loading && !error && leaderboard.length > 0 && (
              <div className="overflow-auto">
                <div className="min-w-[720px]">
                  <div className="grid grid-cols-[72px_1fr_220px_120px] gap-3 text-xs text-muted-foreground px-2 pb-2">
                    <div>Rank</div>
                    <div>Student</div>
                    <div>Hub</div>
                    <div className="text-right">Points</div>
                  </div>
                  <div className="space-y-2">
                    {leaderboard.map((s) => (
                      <div key={s.uid} className="grid grid-cols-[72px_1fr_220px_120px] gap-3 items-center px-2 py-3 rounded-lg bg-muted/50">
                        <div className="text-sm font-medium text-foreground">#{s.rank}</div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{s.displayName ?? "Unnamed student"}</div>
                          <div className="text-xs text-muted-foreground truncate">{s.email ?? s.uid}</div>
                        </div>
                        <div className="text-sm text-muted-foreground truncate">{s.hub ?? "—"}</div>
                        <div className="text-sm text-foreground text-right">{typeof s.points === "number" ? s.points : "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
