import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { firestore } from "@/lib/firebase";

type CourseRow = {
  id: string;
  title?: string;
  description?: string;
  published?: boolean;
  resourcesCount: number;
};

export default function InstructorResources() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const base = collection(firestore, "courses");
        let snap;
        try {
          snap = await getDocs(query(base, orderBy("updatedAt", "desc")));
        } catch {
          snap = await getDocs(base);
        }

        const rows = await Promise.all(
          snap.docs.map(async (d) => {
            const data = d.data() as { title?: string; description?: string; published?: boolean };
            const resourcesSnap = await getDocs(collection(firestore, "courses", d.id, "resources"));
            return {
              id: d.id,
              title: data.title,
              description: data.description,
              published: data.published,
              resourcesCount: resourcesSnap.size,
            } satisfies CourseRow;
          })
        );

        if (!cancelled) setCourses(rows);
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
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => `${c.title ?? ""} ${c.description ?? ""}`.toLowerCase().includes(q));
  }, [courses, search]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Resources</h1>
          <p className="text-muted-foreground mt-1">Browse learning resources available in the system.</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle>Resources by course</CardTitle>
              <div className="w-full sm:w-[320px]">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
            {!loading && error && <div className="text-sm text-muted-foreground break-words">{error}</div>}

            {!loading && !error && filtered.length === 0 && (
              <div className="text-sm text-muted-foreground">No courses found.</div>
            )}

            {!loading && !error && filtered.length > 0 && (
              <div className="space-y-3">
                {filtered.map((c) => (
                  <Link
                    key={c.id}
                    to={`/instructors/courses/${c.id}`}
                    className="block rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">{c.title ?? "Untitled course"}</div>
                        {c.description && <div className="text-sm text-muted-foreground mt-1">{c.description}</div>}
                        <div className="text-xs text-muted-foreground mt-2">Resources: {c.resourcesCount}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">{c.published ? "Published" : "Draft"}</div>
                    </div>
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
