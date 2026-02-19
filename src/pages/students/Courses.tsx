import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
};

type CourseProgressDoc = {
  courseCompleted?: boolean;
};

export default function StudentCourses() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [search, setSearch] = useState("");
  const [completedCourseIds, setCompletedCourseIds] = useState<Set<string>>(new Set());

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
            return { courseId: c.id, completed: data?.courseCompleted === true };
          }),
        );

        if (cancelled) return;
        setCompletedCourseIds(new Set(reads.filter((r) => r.completed).map((r) => r.courseId)));
      } catch {
        if (cancelled) return;
        setCompletedCourseIds(new Set());
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
          <h1 className="text-3xl font-bold text-foreground">Courses</h1>
          <p className="text-muted-foreground mt-1">Browse published courses and open modules.</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle>Published courses</CardTitle>
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
                  <div
                    key={c.id}
                    className={
                      "block rounded-lg border border-border p-4 transition-colors " +
                      (isCourseUnlocked(c.id) ? "hover:bg-muted/30" : "opacity-60")
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">{c.title ?? "Untitled course"}</div>
                        {c.description && <div className="text-sm text-muted-foreground mt-1">{c.description}</div>}
                        <div className="text-xs text-muted-foreground mt-2">
                          Modules: {typeof c.modulesCount === "number" ? c.modulesCount : "—"} · Resources:{" "}
                          {typeof c.resourcesCount === "number" ? c.resourcesCount : "—"}
                        </div>
                      </div>
                      {isCourseUnlocked(c.id) ? (
                        <Badge variant="secondary">
                          <Link to={`/students/courses/${c.id}`}>Open</Link>
                        </Badge>
                      ) : (
                        <Badge variant="outline">Locked</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
