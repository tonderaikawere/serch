import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { firestore } from "@/lib/firebase";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

export default function InstructorAnalytics() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [activitySeries, setActivitySeries] = useState<Array<{ day: string; events: number }>>([]);
  const [assessmentSeries, setAssessmentSeries] = useState<Array<{ day: string; created: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    const hub = profile?.hub;
    if (!hub) {
      setStudents([]);
      setAssessments([]);
      setActivitySeries([]);
      setAssessmentSeries([]);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const studentsSnap = await getDocs(query(collection(firestore, "students"), where("hub", "==", hub)));
        const nextStudents: StudentRow[] = studentsSnap.docs.map((d) => {
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

        const assessSnap = await getDocs(
          query(collection(firestore, "assessments"), where("hub", "==", hub), orderBy("createdAt", "desc"), limit(200)),
        );
        const nextAssessments: AssessmentRow[] = assessSnap.docs.map((d) => {
          const data = d.data() as {
            title?: string;
            studentUid?: string;
            instructorUid?: string;
            hub?: string;
            score?: number;
            createdAt?: unknown;
          };
          return {
            id: d.id,
            title: data.title ?? null,
            studentUid: data.studentUid ?? null,
            instructorUid: data.instructorUid ?? null,
            hub: data.hub ?? null,
            score: typeof data.score === "number" ? data.score : null,
            createdAt: data.createdAt,
          };
        });

        const now = Date.now();
        const oldest = now - 1000 * 60 * 60 * 24 * 14;

        const byDayEvents = new Map<string, number>();
        await Promise.all(
          nextStudents.map(async (s) => {
            const eventsRef = collection(firestore, "students", s.uid, "events");
            let eventsSnap;
            try {
              const qEvents = query(eventsRef, orderBy("createdAt", "desc"), limit(50));
              eventsSnap = await getDocs(qEvents);
            } catch {
              eventsSnap = await getDocs(eventsRef);
            }
            eventsSnap.forEach((d) => {
              const data = d.data() as { createdAt?: unknown };
              const ms = createdAtToMillis(data.createdAt);
              if (ms == null || ms < oldest) return;
              const key = formatDayKey(ms);
              byDayEvents.set(key, (byDayEvents.get(key) ?? 0) + 1);
            });
          }),
        );

        const byDayAssessments = new Map<string, number>();
        nextAssessments.forEach((a) => {
          const ms = createdAtToMillis(a.createdAt);
          if (ms == null || ms < oldest) return;
          const key = formatDayKey(ms);
          byDayAssessments.set(key, (byDayAssessments.get(key) ?? 0) + 1);
        });

        const eventsSeries: Array<{ day: string; events: number }> = [];
        const assessSeries: Array<{ day: string; created: number }> = [];
        for (let i = 13; i >= 0; i--) {
          const ms = now - 1000 * 60 * 60 * 24 * i;
          const key = formatDayKey(ms);
          eventsSeries.push({ day: key.slice(5), events: byDayEvents.get(key) ?? 0 });
          assessSeries.push({ day: key.slice(5), created: byDayAssessments.get(key) ?? 0 });
        }

        if (cancelled) return;
        setStudents(nextStudents);
        setAssessments(nextAssessments);
        setActivitySeries(eventsSeries);
        setAssessmentSeries(assessSeries);
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

  const topStudents = useMemo(() => {
    return [...students]
      .sort((a, b) => (b.points ?? -1) - (a.points ?? -1))
      .slice(0, 5)
      .map((s, idx) => ({ ...s, rank: idx + 1 }));
  }, [students]);

  const avgAssessmentScore = useMemo(() => {
    const scored = assessments.map((a) => a.score).filter((x): x is number => typeof x === "number");
    if (scored.length === 0) return null;
    return scored.reduce((s, x) => s + x, 0) / scored.length;
  }, [assessments]);

  const suggestions = useMemo(() => {
    const next: string[] = [];
    const eventsTotal = activitySeries.reduce((s, x) => s + x.events, 0);
    const assessTotal = assessmentSeries.reduce((s, x) => s + x.created, 0);

    if (students.length === 0) next.push("No students found for your hub yet.");
    if (students.length > 0 && eventsTotal === 0) next.push("No activity events recorded yet. Add student events to unlock activity insights.");
    if (students.length > 0 && assessTotal === 0) next.push("No assessments created yet. Start assessing students to track progress.");
    if (avgAssessmentScore != null && avgAssessmentScore < 60) next.push("Average assessment score is low. Consider targeted support sessions.");
    if (students.length > 0 && students.every((s) => s.points == null)) next.push("Leaderboard points are missing. Add a numeric points field to student docs.");
    return next;
  }, [activitySeries, assessmentSeries, avgAssessmentScore, students]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Hub-level reporting and student progress trends.</p>
        </div>

        {!profile?.hub && (
          <Card>
            <CardHeader>
              <CardTitle>Choose a hub</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Select a hub in onboarding to see analytics.</div>
            </CardContent>
          </Card>
        )}

        {profile?.hub && loading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {profile?.hub && !loading && error && <div className="text-sm text-muted-foreground break-words">{error}</div>}

        {profile?.hub && !loading && !error && (
          <>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">In hub</div>
                  <div className="text-lg font-medium text-foreground">{students.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Assessments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">Total</div>
                  <div className="text-lg font-medium text-foreground">{assessments.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Avg score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">Scored assessments</div>
                  <div className="text-lg font-medium text-foreground">
                    {avgAssessmentScore == null ? "—" : avgAssessmentScore.toFixed(1)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Student activity (14 days)</CardTitle>
                </CardHeader>
                <CardContent>
                  {activitySeries.every((x) => x.events === 0) ? (
                    <div className="text-sm text-muted-foreground">No activity events yet.</div>
                  ) : (
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

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Assessments created (14 days)</CardTitle>
                </CardHeader>
                <CardContent>
                  {assessmentSeries.every((x) => x.created === 0) ? (
                    <div className="text-sm text-muted-foreground">No assessments created yet.</div>
                  ) : (
                    <ChartContainer
                      className="h-[260px] w-full"
                      config={{
                        created: {
                          label: "Created",
                          color: "hsl(var(--primary))",
                        },
                      }}
                    >
                      <ResponsiveContainer>
                        <LineChart data={assessmentSeries} margin={{ left: 8, right: 8 }}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="day" tickLine={false} axisLine={false} />
                          <YAxis width={32} tickLine={false} axisLine={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line type="monotone" dataKey="created" stroke="var(--color-created)" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Top students</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {students.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No students found for this hub.</div>
                  ) : topStudents.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No leaderboard data yet.</div>
                  ) : (
                    topStudents.map((s) => (
                      <div key={s.uid} className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 p-3">
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">
                            #{s.rank} {s.displayName ?? s.email ?? s.uid}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{s.hub ?? "—"}</div>
                        </div>
                        <div className="text-sm text-foreground">
                          {typeof s.points === "number" ? s.points.toLocaleString() : "—"}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Suggestions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {suggestions.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No suggestions right now.</div>
                  ) : (
                    suggestions.map((s) => (
                      <div key={s} className="text-sm text-muted-foreground">
                        {s}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

type StudentRow = {
  uid: string;
  displayName: string | null;
  email: string | null;
  hub: string | null;
  points: number | null;
};

type AssessmentRow = {
  id: string;
  title: string | null;
  studentUid: string | null;
  instructorUid: string | null;
  hub: string | null;
  score: number | null;
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
