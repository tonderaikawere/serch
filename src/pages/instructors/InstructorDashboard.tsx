import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { firestore } from "@/lib/firebase";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { Search } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

type StudentRow = {
  uid: string;
  displayName: string | null;
  email: string | null;
  hub: string | null;
  points: number | null;
};

type StudentEvent = {
  createdAt?: unknown;
};

function createdAtToMillis(v: unknown): number | null {
  if (!v) return null;
  if (typeof v === "number") return v;
  if (typeof v === "object" && v && "toMillis" in v && typeof (v as { toMillis: () => number }).toMillis === "function") {
    return (v as { toMillis: () => number }).toMillis();
  }
  if (typeof v === "object" && v && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate().getTime();
  }
  return null;
}

function formatDayKey(ms: number) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function InstructorDashboard() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activitySeries, setActivitySeries] = useState<Array<{ day: string; events: number }>>([]);

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
          const data = d.data() as {
            uid?: string;
            displayName?: string | null;
            email?: string | null;
            hub?: string | null;
            points?: number;
          };
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
  }, [profile?.hub]);

  useEffect(() => {
    let cancelled = false;
    const hub = profile?.hub;
    if (!hub) return;

    (async () => {
      setActivityLoading(true);
      setActivityError(null);
      try {
        const qStudents = query(collection(firestore, "students"), where("hub", "==", hub));
        const snap = await getDocs(qStudents);
        const uids = snap.docs.map((d) => d.id);
        const byDay = new Map<string, number>();
        const now = Date.now();
        const oldest = now - 1000 * 60 * 60 * 24 * 14;

        await Promise.all(
          uids.map(async (uid) => {
            const eventsRef = collection(firestore, "students", uid, "events");
            let eventsSnap;
            try {
              const qEvents = query(eventsRef, orderBy("createdAt", "desc"), limit(50));
              eventsSnap = await getDocs(qEvents);
            } catch {
              eventsSnap = await getDocs(eventsRef);
            }

            eventsSnap.forEach((d) => {
              const data = d.data() as StudentEvent;
              const ms = createdAtToMillis(data.createdAt);
              if (ms == null) return;
              if (ms < oldest) return;
              const key = formatDayKey(ms);
              byDay.set(key, (byDay.get(key) ?? 0) + 1);
            });
          }),
        );

        const series: Array<{ day: string; events: number }> = [];
        for (let i = 13; i >= 0; i--) {
          const ms = now - 1000 * 60 * 60 * 24 * i;
          const key = formatDayKey(ms);
          series.push({ day: key.slice(5), events: byDay.get(key) ?? 0 });
        }

        if (!cancelled) setActivitySeries(series);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setActivityError(msg);
      } finally {
        if (!cancelled) setActivityLoading(false);
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

  const leaderboard = useMemo(() => {
    const sorted = [...students].sort((a, b) => {
      const ap = a.points ?? -1;
      const bp = b.points ?? -1;
      if (bp !== ap) return bp - ap;
      return (a.displayName ?? a.email ?? a.uid).localeCompare(b.displayName ?? b.email ?? b.uid);
    });
    return sorted.map((s, idx) => ({ ...s, rank: idx + 1 }));
  }, [students]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your hub and student performance.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Hub</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Current hub</div>
              <div className="text-lg font-medium text-foreground">{profile?.hub ?? "—"}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">In your hub</div>
              <div className="text-lg font-medium text-foreground">{students.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Events (last 14 days)</div>
              <div className="text-lg font-medium text-foreground">
                {activitySeries.reduce((sum, x) => sum + x.events, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Leaderboard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button asChild variant="outline">
                  <Link to="/instructors/leaderboard">View all</Link>
                </Button>
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
                <div className="overflow-auto">
                  <div className="min-w-[520px]">
                    <div className="grid grid-cols-[72px_1fr_160px_120px] gap-3 text-xs text-muted-foreground px-2 pb-2">
                      <div>Rank</div>
                      <div>Student</div>
                      <div>Hub</div>
                      <div className="text-right">Points</div>
                    </div>
                    <div className="space-y-2">
                      {leaderboard
                        .filter((s) => filtered.some((f) => f.uid === s.uid))
                        .slice(0, 10)
                        .map((s) => (
                          <Link
                            key={s.uid}
                            to={`/instructors/students/${s.uid}`}
                            className="grid grid-cols-[72px_1fr_160px_120px] gap-3 items-center rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors px-2 py-3"
                          >
                            <div className="text-sm font-medium text-foreground">#{s.rank}</div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">
                                {s.displayName ?? "Unnamed student"}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">{s.email ?? s.uid}</div>
                            </div>
                            <div className="text-sm text-muted-foreground truncate">{s.hub ?? "—"}</div>
                            <div className="text-sm text-foreground text-right">
                              {typeof s.points === "number" ? s.points.toLocaleString() : "—"}
                            </div>
                          </Link>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {profile?.hub && !loading && !error && students.length > 0 && students.every((s) => s.points == null) && (
                <div className="text-xs text-muted-foreground">
                  Add a numeric <span className="font-mono">points</span> field to student docs to enable ranking.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Activity (last 14 days)</CardTitle>
            </CardHeader>
            <CardContent>
              {activityLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
              {!activityLoading && activityError && (
                <div className="text-sm text-muted-foreground break-words">{activityError}</div>
              )}
              {!activityLoading && !activityError && activitySeries.length > 0 && activitySeries.every((x) => x.events === 0) && (
                <div className="text-sm text-muted-foreground">No activity events yet.</div>
              )}
              {!activityLoading && !activityError && activitySeries.some((x) => x.events > 0) && (
                <ChartContainer
                  className="h-[260px] w-full"
                  config={{
                    events: {
                      label: "Events",
                      color: "hsl(var(--primary))",
                    },
                  }}
                >
                  <ResponsiveContainer>
                    <BarChart data={activitySeries} margin={{ left: 8, right: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} />
                      <YAxis width={32} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="events" fill="var(--color-events)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
