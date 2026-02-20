import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

type CourseRow = {
  id: string;
  title?: string;
  description?: string;
  published?: boolean;
  updatedAt?: unknown;
  modulesCount?: number;
  resourcesCount?: number;
  order?: number;
  thumbnailUrl?: string;
  promoVideoUrl?: string;
  level?: "beginner" | "intermediate" | "advanced";
  durationHours?: number;
  learnersCount?: number;
  likesCount?: number;
  certificateEnabled?: boolean;
};

type CourseProgressDoc = {
  courseCompleted?: boolean;
  completedLessonIds?: string[];
};

export default function StudentCourses() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [search, setSearch] = useState("");
  const [completedCourseIds, setCompletedCourseIds] = useState<Set<string>>(new Set());
  const [completedLessonsByCourse, setCompletedLessonsByCourse] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const base = collection(firestore, "courses");
        let snap;
        try {
          snap = await getDocs(query(base, where("published", "==", true), orderBy("updatedAt", "desc")));
        } catch {
          snap = await getDocs(query(base, where("published", "==", true)));
        }

        const next: CourseRow[] = await Promise.all(
          snap.docs.map(async (d) => {
            const data = d.data() as Omit<CourseRow, "id">;
            const [modulesSnap, resourcesSnap] = await Promise.all([
              getDocs(collection(firestore, "courses", d.id, "modules")),
              getDocs(collection(firestore, "courses", d.id, "resources")),
            ]);
            return {
              id: d.id,
              ...data,
              modulesCount: modulesSnap.size,
              resourcesCount: resourcesSnap.size,
            } satisfies CourseRow;
          }),
        );
        if (!cancelled) setCourses(next);
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

  useEffect(() => {
    let cancelled = false;
    const uid = profile?.uid;
    if (!uid) return;

    (async () => {
      try {
        const published = courses.filter((c) => c.published === true);
        const reads = await Promise.all(
          published.map(async (c) => {
            const snap = await getDoc(doc(firestore, "students", uid, "courseProgress", c.id));
            const data = (snap.exists() ? (snap.data() as CourseProgressDoc) : null) ?? null;
            return {
              courseId: c.id,
              completed: data?.courseCompleted === true,
              completedLessonsCount: Array.isArray(data?.completedLessonIds) ? data!.completedLessonIds!.length : 0,
            };
          }),
        );

        if (cancelled) return;
        setCompletedCourseIds(new Set(reads.filter((r) => r.completed).map((r) => r.courseId)));
        setCompletedLessonsByCourse(
          Object.fromEntries(reads.map((r) => [r.courseId, r.completedLessonsCount])),
        );
      } catch {
        if (cancelled) return;
        setCompletedCourseIds(new Set());
        setCompletedLessonsByCourse({});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [courses, profile?.uid]);

  const orderedCourses = useMemo(() => {
    const published = [...courses].filter((c) => c.published === true);
    return published.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [courses]);

  const firstLockedIndex = useMemo(() => {
    for (let i = 0; i < orderedCourses.length; i += 1) {
      const courseId = orderedCourses[i].id;
      if (!completedCourseIds.has(courseId)) return i;
    }
    return orderedCourses.length;
  }, [completedCourseIds, orderedCourses]);

  function isCourseUnlocked(courseId: string) {
    const idx = orderedCourses.findIndex((c) => c.id === courseId);
    if (idx < 0) return false;
    return idx <= firstLockedIndex;
  }

  const q = search.trim().toLowerCase();
  const filtered = !q
    ? orderedCourses
    : orderedCourses.filter((c) => `${c.title ?? ""} ${c.description ?? ""}`.toLowerCase().includes(q));

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Your Curriculum</h1>
          <p className="text-muted-foreground mt-1">Complete each course in order. Modules, lessons, exercises, and tests live inside the course.</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle>Courses</CardTitle>
              <div className="w-full sm:w-[320px]">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
            {!loading && error && <div className="text-sm text-muted-foreground break-words">{error}</div>}

            {!loading && !error && filtered.length === 0 && (
              <div className="text-sm text-muted-foreground">No published courses yet.</div>
            )}

            {!loading && !error && filtered.length > 0 && (
              <div className="space-y-3">
                {filtered.map((c) => (
                  <Card
                    key={c.id}
                    className={
                      "transition-colors " +
                      (isCourseUnlocked(c.id) ? "hover:bg-muted/30" : "opacity-60")
                    }
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-4">
                        {c.thumbnailUrl ? (
                          <div className="w-24 sm:w-28 shrink-0">
                            <div className="aspect-video w-full overflow-hidden rounded-md border border-border bg-muted/30">
                              <img
                                src={c.thumbnailUrl}
                                alt={c.title ?? "Course"}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          </div>
                        ) : null}

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              {c.level ? (
                                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                                  {c.level} level
                                </div>
                              ) : null}
                              <div className="text-lg font-semibold text-foreground truncate">{c.title ?? "Untitled course"}</div>
                              {c.description && <div className="text-sm text-muted-foreground">{c.description}</div>}
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                              {c.certificateEnabled ? <Badge variant="outline">Certificate</Badge> : null}
                              {c.promoVideoUrl ? <Badge variant="outline">Video</Badge> : null}
                              <Badge variant={isCourseUnlocked(c.id) ? "secondary" : "outline"}>
                                {isCourseUnlocked(c.id) ? "Unlocked" : "Locked"}
                              </Badge>
                            </div>
                          </div>

                          {(typeof c.durationHours === "number" || typeof c.learnersCount === "number" || typeof c.likesCount === "number") && (
                            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                              {typeof c.likesCount === "number" ? <div>{c.likesCount} liked this course</div> : null}
                              {typeof c.durationHours === "number" ? <div>{c.durationHours} hrs</div> : null}
                              {typeof c.learnersCount === "number" ? <div>{c.learnersCount.toLocaleString()} learners</div> : null}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Progress
                          value={
                            completedCourseIds.has(c.id)
                              ? 100
                              : Math.min(
                                  100,
                                  ((completedLessonsByCourse[c.id] ?? 0) /
                                    Math.max(1, (c.modulesCount ?? 20) * 11)) *
                                    100,
                                )
                          }
                        />
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="text-xs text-muted-foreground">
                            {completedCourseIds.has(c.id)
                              ? "Completed"
                              : `${completedLessonsByCourse[c.id] ?? 0} lessons completed`}
                          </div>
                          {isCourseUnlocked(c.id) ? (
                            <div className="flex items-center gap-2">
                              <Button asChild size="sm" variant="outline">
                                <Link to={`/students/courses/${c.id}`}>More info</Link>
                              </Button>
                              <Button asChild size="sm">
                                <Link to={`/students/courses/${c.id}/player`}>
                                  {completedLessonsByCourse[c.id] ? "Continue learning" : "Start learning"}
                                </Link>
                              </Button>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">Finish previous course</div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
