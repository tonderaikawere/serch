import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

type CourseDoc = {
  title?: string;
  description?: string;
  published?: boolean;
};

type ModuleDoc = {
  title?: string;
  description?: string;
  order?: number;
};

type LessonDoc = {
  title?: string;
  content?: string;
  order?: number;
  type?: "lesson" | "exercise";
};

type CourseProgressDoc = {
  courseId?: string;
  currentModuleId?: string;
  currentLessonId?: string;
  completedLessonIds?: string[];
  courseCompleted?: boolean;
  updatedAt?: unknown;
};

type ResourceDoc = {
  title?: string;
  description?: string;
  url?: string;
  updatedAt?: unknown;
};

export default function StudentCourseDetails() {
  const { profile } = useAuth();
  const { courseId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [course, setCourse] = useState<CourseDoc | null>(null);
  const [modules, setModules] = useState<Array<{ id: string; data: ModuleDoc }>>([]);
  const [lessonsByModule, setLessonsByModule] = useState<Record<string, Array<{ id: string; data: LessonDoc }>>>({});
  const [resources, setResources] = useState<Array<{ id: string; data: ResourceDoc }>>([]);
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);

  const [progress, setProgress] = useState<CourseProgressDoc | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!courseId) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const courseRef = doc(firestore, "courses", courseId);
        const courseSnap = await getDoc(courseRef);
        const courseData = (courseSnap.exists() ? (courseSnap.data() as CourseDoc) : null) ?? null;

        const modulesRef = collection(firestore, "courses", courseId, "modules");
        let modulesSnap;
        try {
          modulesSnap = await getDocs(query(modulesRef, orderBy("order", "asc")));
        } catch {
          modulesSnap = await getDocs(modulesRef);
        }

        const resourcesRef = collection(firestore, "courses", courseId, "resources");
        let resourcesSnap;
        try {
          resourcesSnap = await getDocs(query(resourcesRef, orderBy("updatedAt", "desc")));
        } catch {
          resourcesSnap = await getDocs(resourcesRef);
        }

        const nextModules = modulesSnap.docs.map((d) => ({ id: d.id, data: d.data() as ModuleDoc }));

        const lessonsPairs = await Promise.all(
          nextModules.map(async (m) => {
            const lessonsRef = collection(firestore, "courses", courseId, "modules", m.id, "lessons");
            let lessonsSnap;
            try {
              lessonsSnap = await getDocs(query(lessonsRef, orderBy("order", "asc")));
            } catch {
              lessonsSnap = await getDocs(lessonsRef);
            }
            return [m.id, lessonsSnap.docs.map((d) => ({ id: d.id, data: d.data() as LessonDoc }))] as const;
          }),
        );

        if (cancelled) return;
        setCourse(courseData);
        setModules(nextModules);
        setLessonsByModule(Object.fromEntries(lessonsPairs));
        setResources(resourcesSnap.docs.map((d) => ({ id: d.id, data: d.data() as ResourceDoc })));
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
  }, [courseId]);

  useEffect(() => {
    let cancelled = false;
    if (!courseId) return;
    const uid = profile?.uid;
    if (!uid) return;

    (async () => {
      try {
        const snap = await getDoc(doc(firestore, "students", uid, "courseProgress", courseId));
        if (cancelled) return;
        setProgress((snap.exists() ? (snap.data() as CourseProgressDoc) : null) ?? null);
      } catch {
        if (cancelled) return;
        setProgress(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [courseId, profile?.uid]);

  const completedLessonIds = useMemo(() => new Set(progress?.completedLessonIds ?? []), [progress?.completedLessonIds]);

  const activeModule = openModuleId ? modules.find((m) => m.id === openModuleId) ?? null : null;
  const activeLessons = useMemo(() => (openModuleId ? lessonsByModule[openModuleId] ?? [] : []), [lessonsByModule, openModuleId]);
  const activeLesson = useMemo(
    () => (openLessonId ? activeLessons.find((l) => l.id === openLessonId) ?? null : null),
    [activeLessons, openLessonId],
  );

  const activeModuleIndex = useMemo(() => {
    if (!openModuleId) return -1;
    return modules.findIndex((m) => m.id === openModuleId);
  }, [modules, openModuleId]);

  const uid = profile?.uid;

  async function persistProgress(next: Partial<CourseProgressDoc>) {
    if (!uid || !courseId) return;
    await setDoc(
      doc(firestore, "students", uid, "courseProgress", courseId),
      {
        courseId,
        ...next,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ).catch(() => {});
  }

  async function setCurrentModule(moduleId: string) {
    if (!uid || !courseId) return;
    await persistProgress({ currentModuleId: moduleId });
  }

  async function setCurrentLesson(moduleId: string, lessonId: string) {
    await persistProgress({ currentModuleId: moduleId, currentLessonId: lessonId });
  }

  async function markLessonComplete(lessonId: string) {
    if (!uid || !courseId) return;
    const current = progress?.completedLessonIds ?? [];
    if (current.includes(lessonId)) return;
    const next = [...current, lessonId];
    setProgress((p) => ({ ...(p ?? {}), completedLessonIds: next }));

    // Determine if course is complete (all lessons across all modules)
    const allLessonIds = Object.values(lessonsByModule).flat().map((l) => l.id);
    const completedSet = new Set(next);
    const courseCompleted = allLessonIds.length > 0 && allLessonIds.every((id) => completedSet.has(id));

    await persistProgress({ completedLessonIds: next, courseCompleted });
  }

  const moduleOrder = useMemo(() => {
    return [...modules].sort((a, b) => (a.data.order ?? 999) - (b.data.order ?? 999));
  }, [modules]);

  const unlockedModuleIndex = useMemo(() => {
    // a module is considered complete when its exercise lesson is completed
    for (let i = 0; i < moduleOrder.length; i += 1) {
      const m = moduleOrder[i];
      const lessons = lessonsByModule[m.id] ?? [];
      const exercise = lessons.find((l) => l.data.type === "exercise" || (l.data.title ?? "").toLowerCase().includes("exercise"));
      if (!exercise || !completedLessonIds.has(exercise.id)) {
        return i;
      }
    }
    return moduleOrder.length; // all complete
  }, [completedLessonIds, lessonsByModule, moduleOrder]);

  function isModuleUnlocked(moduleId: string) {
    const idx = moduleOrder.findIndex((m) => m.id === moduleId);
    return idx >= 0 && idx <= unlockedModuleIndex;
  }

  function nextIncompleteLessonIndex(lessons: Array<{ id: string; data: LessonDoc }>) {
    for (let i = 0; i < lessons.length; i += 1) {
      if (!completedLessonIds.has(lessons[i].id)) return i;
    }
    return lessons.length;
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Course</h1>
            <p className="text-muted-foreground mt-1">Read modules and content.</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/students/courses">Back to courses</Link>
          </Button>
        </div>

        {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!loading && error && <div className="text-sm text-muted-foreground break-words">{error}</div>}

        {!loading && !error && (!course || course.published !== true) && (
          <Card>
            <CardHeader>
              <CardTitle>Course not available</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">This course does not exist or is not published.</div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && course && course.published === true && (
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{course.title ?? "Untitled course"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {course.description && <div className="text-sm text-muted-foreground">{course.description}</div>}

                <Separator />

                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">Modules</div>
                  {modules.length === 0 && <div className="text-sm text-muted-foreground">No modules yet.</div>}
                  {modules.length > 0 && (
                    <div className="space-y-2">
                      {moduleOrder.map((m) => {
                        const unlocked = isModuleUnlocked(m.id);
                        const lessons = lessonsByModule[m.id] ?? [];
                        const nextIdx = nextIncompleteLessonIndex(lessons);
                        const status = nextIdx >= lessons.length ? "Completed" : unlocked ? "Unlocked" : "Locked";
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              if (!unlocked) return;
                              setOpenModuleId(m.id);
                              const nextLesson = lessons[nextIdx]?.id ?? lessons[0]?.id ?? null;
                              setOpenLessonId(nextLesson);
                              void setCurrentModule(m.id);
                              if (nextLesson) void setCurrentLesson(m.id, nextLesson);
                            }}
                            className={
                              "w-full text-left rounded-lg border border-border p-3 transition-colors " +
                              (unlocked ? "hover:bg-muted/30" : "opacity-60 cursor-not-allowed")
                            }
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium text-foreground">{m.data.title ?? "Module"}</div>
                                {m.data.description && <div className="text-sm text-muted-foreground mt-1">{m.data.description}</div>}
                              </div>
                              <div className="text-xs text-muted-foreground shrink-0">{status}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">Resources</div>
                  {resources.length === 0 && <div className="text-sm text-muted-foreground">No resources yet.</div>}
                  {resources.length > 0 && (
                    <div className="space-y-2">
                      {resources.map((r) => (
                        <div key={r.id} className="rounded-lg border border-border p-3">
                          <div className="font-medium text-foreground">{r.data.title ?? "Resource"}</div>
                          {r.data.description && <div className="text-sm text-muted-foreground mt-1">{r.data.description}</div>}
                          {r.data.url && (
                            <div className="text-sm mt-2">
                              <a className="text-primary hover:underline break-all" href={r.data.url} target="_blank" rel="noreferrer">
                                {r.data.url}
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{activeLesson?.data.title ?? activeModule?.data.title ?? "Lesson"}</CardTitle>
              </CardHeader>
              <CardContent>
                {!activeModule && <div className="text-sm text-muted-foreground">Select a module to start lessons.</div>}
                {activeModule && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-foreground">Lessons</div>
                      {activeLessons.length === 0 && <div className="text-sm text-muted-foreground">No lessons yet.</div>}
                      {activeLessons.length > 0 && (
                        <div className="space-y-2">
                          {activeLessons.map((l, idx) => {
                            const unlockedLessonIdx = nextIncompleteLessonIndex(activeLessons);
                            const unlocked = idx <= unlockedLessonIdx;
                            const done = completedLessonIds.has(l.id);
                            return (
                              <button
                                key={l.id}
                                type="button"
                                onClick={() => {
                                  if (!unlocked) return;
                                  setOpenLessonId(l.id);
                                  void setCurrentLesson(activeModule.id, l.id);
                                }}
                                className={
                                  "w-full text-left rounded-lg border border-border p-3 transition-colors " +
                                  (unlocked ? "hover:bg-muted/30" : "opacity-60 cursor-not-allowed")
                                }
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="font-medium text-foreground truncate">{l.data.title ?? `Lesson ${idx + 1}`}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {l.data.type === "exercise" ? "Exercise" : "Lesson"}
                                    </div>
                                  </div>
                                  <div className="text-xs text-muted-foreground shrink-0">{done ? "Done" : unlocked ? "Open" : "Locked"}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {!activeLesson && <div className="text-sm text-muted-foreground">Select a lesson to read.</div>}
                    {activeLesson && (
                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">{activeLesson.data.content ?? ""}</div>
                        <div className="flex items-center justify-end">
                          <Button onClick={() => void markLessonComplete(activeLesson.id)} disabled={completedLessonIds.has(activeLesson.id)}>
                            {completedLessonIds.has(activeLesson.id) ? "Completed" : "Mark complete"}
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-sm text-muted-foreground">
                        Module {activeModuleIndex >= 0 ? activeModuleIndex + 1 : "—"} of {modules.length}
                      </div>
                      <div className="flex items-center gap-2">
                        {courseId && openModuleId && (
                          <Button asChild>
                            <Link to={`/students/courses/${courseId}/modules/${openModuleId}/test`}>Take Test</Link>
                          </Button>
                        )}
                        {courseId && (
                          <Button asChild variant="outline">
                            <Link to={`/students/courses/${courseId}/final`}>Final Exam</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
