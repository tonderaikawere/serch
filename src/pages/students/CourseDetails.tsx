import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  content?: string;
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

  const totalLessons = useMemo(() => {
    const total = Object.values(lessonsByModule).reduce((sum, x) => sum + x.length, 0);
    return total;
  }, [lessonsByModule]);

  const completedLessonsCount = progress?.completedLessonIds?.length ?? 0;
  const courseProgressPct = totalLessons > 0 ? Math.min(100, (completedLessonsCount / totalLessons) * 100) : 0;

  const activeModule = openModuleId ? modules.find((m) => m.id === openModuleId) ?? null : null;
  const activeLessons = useMemo(() => (openModuleId ? lessonsByModule[openModuleId] ?? [] : []), [lessonsByModule, openModuleId]);
  const activeLesson = useMemo(
    () => (openLessonId ? activeLessons.find((l) => l.id === openLessonId) ?? null : null),
    [activeLessons, openLessonId],
  );

  const activeLessonIndex = useMemo(() => {
    if (!openLessonId) return -1;
    return activeLessons.findIndex((l) => l.id === openLessonId);
  }, [activeLessons, openLessonId]);

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

    // Auto-advance when completing the currently open lesson.
    if (openLessonId === lessonId && activeModule) {
      const lessons = lessonsByModule[activeModule.id] ?? [];
      const unlockedIdx = (() => {
        for (let i = 0; i < lessons.length; i += 1) {
          if (!completedSet.has(lessons[i].id)) return i;
        }
        return lessons.length;
      })();

      const currentIdx = lessons.findIndex((l) => l.id === lessonId);
      for (let i = currentIdx + 1; i < lessons.length; i += 1) {
        if (i <= unlockedIdx) {
          const nextLessonId = lessons[i].id;
          setOpenLessonId(nextLessonId);
          await setCurrentLesson(activeModule.id, nextLessonId);
          return;
        }
      }

      // If no next lesson in this module, jump to the next unlocked module.
      const currentModuleIdx = moduleOrder.findIndex((m) => m.id === activeModule.id);
      for (let mi = currentModuleIdx + 1; mi < moduleOrder.length; mi += 1) {
        const m = moduleOrder[mi];
        if (!isModuleUnlocked(m.id)) continue;
        const nextLessons = lessonsByModule[m.id] ?? [];
        const nextLessonIdx = (() => {
          for (let i = 0; i < nextLessons.length; i += 1) {
            if (!completedSet.has(nextLessons[i].id)) return i;
          }
          return nextLessons.length;
        })();

        const candidate = nextLessons[nextLessonIdx]?.id ?? nextLessons[0]?.id ?? null;
        if (candidate) {
          setOpenModuleId(m.id);
          setOpenLessonId(candidate);
          await setCurrentModule(m.id);
          await setCurrentLesson(m.id, candidate);
        }
        break;
      }
    }
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

  function isLessonUnlocked(lessons: Array<{ id: string; data: LessonDoc }>, lessonIndex: number) {
    const unlockedLessonIdx = nextIncompleteLessonIndex(lessons);
    return lessonIndex <= unlockedLessonIdx;
  }

  function cleanLessonTitle(moduleTitle: string, rawTitle: string | null | undefined) {
    const t = (rawTitle ?? "").trim();
    if (!t) return null;
    const prefix = `${moduleTitle} - `;
    if (t.startsWith(prefix)) return t.slice(prefix.length);

    const lastDash = t.lastIndexOf(" - ");
    if (lastDash > 0) {
      const tail = t.slice(lastDash + 3).trim();
      if (tail) return tail;
    }

    return t;
  }

  function renderLessonContent(raw: string) {
    const text = raw.trim();
    if (!text) return <div className="text-sm text-muted-foreground">No content yet.</div>;

    const parts = text.split(/\n\n+/g).map((p) => p.trim()).filter(Boolean);
    return (
      <div className="space-y-4">
        {parts.map((p, idx) => {
          const heading = p.toLowerCase();
          if (heading === "learning outcomes" || heading === "lesson" || heading === "checklist" || heading === "quick exercise") {
            const title = p;
            const isPrimary = heading === "learning outcomes";
            return (
              <div
                key={`${idx}-${title}`}
                className={
                  (isPrimary ? "bg-primary/10 border-primary/30 " : "bg-muted/30 border-border ") +
                  "rounded-lg border px-4 py-3"
                }
              >
                <div className={(isPrimary ? "text-primary" : "text-foreground") + " font-bold"}>{title}</div>
              </div>
            );
          }

          if (p.startsWith("- ")) {
            const lines = p.split("\n").map((l) => l.trim()).filter(Boolean);
            return (
              <ul key={idx} className="list-disc pl-6 text-sm text-foreground space-y-1">
                {lines.map((l) => (
                  <li key={l}>{l.replace(/^-\s+/, "")}</li>
                ))}
              </ul>
            );
          }

          if (/^\d+[).]\s+/.test(p) || /^\d+[).]\s+/.test(p.split("\n")[0] ?? "")) {
            const lines = p.split("\n").map((l) => l.trim()).filter(Boolean);
            return (
              <ol key={idx} className="list-decimal pl-6 text-sm text-foreground space-y-1">
                {lines.map((l) => (
                  <li key={l}>{l.replace(/^\d+[).]\s+/, "")}</li>
                ))}
              </ol>
            );
          }

          if (p.length <= 40 && !p.includes(" ")) {
            return (
              <div key={idx} className="text-sm font-bold text-foreground">
                {p}
              </div>
            );
          }

          return (
            <p key={idx} className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {p}
            </p>
          );
        })}
      </div>
    );
  }

  const prevNext = useMemo(() => {
    if (!activeModule) return { prevId: null as string | null, nextId: null as string | null };
    if (activeLessons.length === 0) return { prevId: null, nextId: null };
    if (activeLessonIndex < 0) return { prevId: null, nextId: null };

    let prevId: string | null = null;
    for (let i = activeLessonIndex - 1; i >= 0; i -= 1) {
      if (isLessonUnlocked(activeLessons, i)) {
        prevId = activeLessons[i].id;
        break;
      }
    }

    let nextId: string | null = null;
    for (let i = activeLessonIndex + 1; i < activeLessons.length; i += 1) {
      if (isLessonUnlocked(activeLessons, i)) {
        nextId = activeLessons[i].id;
        break;
      }
    }

    return { prevId, nextId };
  }, [activeLessonIndex, activeLessons, activeModule]);

  const recommendedModuleId = useMemo(() => {
    if (moduleOrder.length === 0) return null;
    const idx = Math.min(unlockedModuleIndex, moduleOrder.length - 1);
    return moduleOrder[idx]?.id ?? moduleOrder[0]?.id ?? null;
  }, [moduleOrder, unlockedModuleIndex]);

  const recommendedLessonId = useMemo(() => {
    if (!recommendedModuleId) return null;
    const lessons = lessonsByModule[recommendedModuleId] ?? [];
    const nextIdx = nextIncompleteLessonIndex(lessons);
    return lessons[nextIdx]?.id ?? lessons[0]?.id ?? null;
  }, [lessonsByModule, recommendedModuleId]);

  useEffect(() => {
    if (loading) return;
    if (!courseId) return;
    if (!course || course.published !== true) return;
    if (modules.length === 0) return;
    if (Object.keys(lessonsByModule).length === 0) return;
    if (openModuleId && openLessonId) return;

    const trySelect = (moduleId: string | null | undefined, lessonId: string | null | undefined) => {
      if (!moduleId || !lessonId) return false;
      if (!isModuleUnlocked(moduleId)) return false;
      const lessons = lessonsByModule[moduleId] ?? [];
      const idx = lessons.findIndex((l) => l.id === lessonId);
      if (idx < 0) return false;
      if (!isLessonUnlocked(lessons, idx)) return false;

      setOpenModuleId(moduleId);
      setOpenLessonId(lessonId);
      void setCurrentLesson(moduleId, lessonId);
      return true;
    };

    // Prefer saved progress (if still valid/unlocked)
    const fromProgress = trySelect(progress?.currentModuleId, progress?.currentLessonId);
    if (fromProgress) return;

    // Otherwise select the recommended (first unlocked + first incomplete)
    if (recommendedModuleId) {
      const lessons = lessonsByModule[recommendedModuleId] ?? [];
      const nextIdx = nextIncompleteLessonIndex(lessons);
      const candidate = lessons[nextIdx]?.id ?? lessons[0]?.id ?? null;
      if (candidate && trySelect(recommendedModuleId, candidate)) return;
    }

    // Fallback: first unlocked module + its first unlocked lesson
    for (let i = 0; i < moduleOrder.length; i += 1) {
      const m = moduleOrder[i];
      if (!isModuleUnlocked(m.id)) continue;
      const lessons = lessonsByModule[m.id] ?? [];
      const nextIdx = nextIncompleteLessonIndex(lessons);
      const candidate = lessons[nextIdx]?.id ?? lessons[0]?.id ?? null;
      if (candidate && trySelect(m.id, candidate)) return;
    }
  }, [
    loading,
    courseId,
    course,
    modules.length,
    lessonsByModule,
    openModuleId,
    openLessonId,
    progress?.currentModuleId,
    progress?.currentLessonId,
    recommendedModuleId,
    moduleOrder,
  ]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="text-sm text-muted-foreground">Course</div>
            <h1 className="text-3xl font-bold text-foreground truncate">{course?.title ?? "Untitled course"}</h1>
            {course?.description && <p className="text-muted-foreground mt-1">{course.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link to="/students/courses">Back</Link>
            </Button>
            {courseId && (
              <Button
                disabled={!recommendedModuleId || !recommendedLessonId}
                onClick={() => {
                  const mId = recommendedModuleId;
                  const lId = recommendedLessonId;
                  if (!mId || !lId) return;
                  setOpenModuleId(mId);
                  setOpenLessonId(lId);
                  void setCurrentModule(mId);
                  void setCurrentLesson(mId, lId);
                }}
              >
                Continue learning
              </Button>
            )}
          </div>
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
          <div className="space-y-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">Lessons</Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 flex flex-col h-full">
                <SheetHeader className="p-6 pb-3">
                  <SheetTitle>Learning Modules</SheetTitle>
                </SheetHeader>
                <div className="px-6 pb-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        {progress?.courseCompleted ? "Course completed" : `${completedLessonsCount}/${totalLessons || "—"} lessons completed`}
                      </div>
                      <Badge variant={progress?.courseCompleted ? "secondary" : "outline"}>
                        {progress?.courseCompleted ? "Completed" : "In progress"}
                      </Badge>
                    </div>
                    <Progress value={progress?.courseCompleted ? 100 : courseProgressPct} />
                  </div>

                  {modules.length === 0 && <div className="text-sm text-muted-foreground">No learning modules yet.</div>}

                  {modules.length > 0 && (
                    <Accordion
                      type="single"
                      collapsible
                      value={openModuleId ?? undefined}
                      onValueChange={(v) => {
                        if (!v) return;
                        if (!isModuleUnlocked(v)) return;
                        setOpenModuleId(v);
                        void setCurrentModule(v);
                        const lessons = lessonsByModule[v] ?? [];
                        const nextIdx = nextIncompleteLessonIndex(lessons);
                        const nextLesson = lessons[nextIdx]?.id ?? lessons[0]?.id ?? null;
                        if (nextLesson) {
                          setOpenLessonId(nextLesson);
                          void setCurrentLesson(v, nextLesson);
                        }
                      }}
                    >
                      {moduleOrder.map((m, idx) => {
                        const unlocked = isModuleUnlocked(m.id);
                        const lessons = lessonsByModule[m.id] ?? [];
                        const nextIdx = nextIncompleteLessonIndex(lessons);
                        const completed = nextIdx >= lessons.length && lessons.length > 0;
                        const status = completed ? "Completed" : unlocked ? "Unlocked" : "Locked";

                        return (
                          <AccordionItem key={m.id} value={m.id} className={unlocked ? "" : "opacity-60"}>
                            <AccordionTrigger className={unlocked ? "" : "cursor-not-allowed"}>
                              <div className="flex items-center justify-between w-full pr-3 gap-3">
                                <div className="min-w-0 text-left">
                                  <div className="text-sm font-medium text-foreground truncate">
                                    {idx + 1}. {m.data.title ?? "Module"}
                                  </div>
                                  {m.data.description && (
                                    <div className="text-xs text-muted-foreground mt-1 truncate">{m.data.description}</div>
                                  )}
                                </div>
                                <div className="shrink-0">
                                  <Badge variant={completed ? "secondary" : "outline"}>{status}</Badge>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              {!unlocked && (
                                <div className="text-sm text-muted-foreground">Locked. Complete the previous module exercise to unlock.</div>
                              )}
                              {unlocked && (
                                <div className="space-y-2">
                                  {lessons.map((l, lessonIdx) => {
                                    const lessonUnlocked = isLessonUnlocked(lessons, lessonIdx);
                                    const done = completedLessonIds.has(l.id);
                                    const label = l.data.type === "exercise" ? "Exercise" : `Lesson ${lessonIdx + 1}`;
                                    const clean = cleanLessonTitle(m.data.title ?? "Module", l.data.title) ?? label;
                                    const active = l.id === openLessonId && m.id === openModuleId;
                                    return (
                                      <button
                                        key={l.id}
                                        type="button"
                                        onClick={() => {
                                          if (!lessonUnlocked) return;
                                          setOpenModuleId(m.id);
                                          setOpenLessonId(l.id);
                                          void setCurrentModule(m.id);
                                          void setCurrentLesson(m.id, l.id);
                                        }}
                                        className={
                                          "w-full rounded-lg border px-3 py-2 text-left transition-colors " +
                                          (active ? "border-primary bg-primary/5 " : "border-border ") +
                                          (lessonUnlocked ? "hover:bg-muted/30" : "opacity-60 cursor-not-allowed")
                                        }
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="min-w-0">
                                            <div className="text-xs text-muted-foreground">{label}</div>
                                            <div className="text-sm font-medium text-foreground truncate">{clean}</div>
                                          </div>
                                          <Badge variant={done ? "secondary" : "outline"}>{done ? "Done" : lessonUnlocked ? "Open" : "Locked"}</Badge>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="truncate">
                      {activeLesson
                        ? cleanLessonTitle(activeModule?.data.title ?? "Module", activeLesson.data.title) ?? "Lesson"
                        : "Choose a lesson"}
                    </CardTitle>
                    <div className="text-xs text-muted-foreground">
                      {activeModule
                        ? `Module ${activeModuleIndex >= 0 ? activeModuleIndex + 1 : "—"} of ${modules.length}`
                        : "Open Lessons to begin"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!activeModule || !prevNext.prevId}
                      onClick={() => {
                        if (!activeModule || !prevNext.prevId) return;
                        setOpenLessonId(prevNext.prevId);
                        void setCurrentLesson(activeModule.id, prevNext.prevId);
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      disabled={!activeModule || !prevNext.nextId}
                      onClick={() => {
                        if (!activeModule || !prevNext.nextId) return;
                        setOpenLessonId(prevNext.nextId);
                        void setCurrentLesson(activeModule.id, prevNext.nextId);
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {!activeModule && (
                  <div className="text-sm text-muted-foreground">Open Lessons, then select a module and lesson.</div>
                )}

                {activeModule && !activeLesson && (
                  <div className="text-sm text-muted-foreground">Select a lesson to start reading.</div>
                )}

                {activeLesson && (
                  <>
                    {renderLessonContent(activeLesson.data.content ?? "")}
                    <Separator />
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-xs text-muted-foreground">
                        {activeLesson.data.type === "exercise" ? "Exercise" : "Lesson"}{" "}
                        {activeLessonIndex >= 0 ? `• Item ${activeLessonIndex + 1} of ${activeLessons.length}` : ""}
                      </div>
                      <Button
                        onClick={() => void markLessonComplete(activeLesson.id)}
                        disabled={completedLessonIds.has(activeLesson.id)}
                      >
                        {completedLessonIds.has(activeLesson.id) ? "Completed" : "Mark complete"}
                      </Button>
                    </div>
                  </>
                )}

                <Accordion type="single" collapsible>
                  <AccordionItem value="resources">
                    <AccordionTrigger>Resources</AccordionTrigger>
                    <AccordionContent>
                      {resources.length === 0 && <div className="text-sm text-muted-foreground">No resources yet.</div>}
                      {resources.length > 0 && (
                        <div className="space-y-2">
                          {resources.map((r) => (
                            <Card key={r.id}>
                              <CardContent className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-foreground truncate">{r.data.title ?? "Resource"}</div>
                                    {r.data.description && (
                                      <div className="text-xs text-muted-foreground mt-1">{r.data.description}</div>
                                    )}
                                  </div>
                                  {r.data.url ? (
                                    <a className="text-xs text-primary hover:underline" href={r.data.url} target="_blank" rel="noreferrer">
                                      Open link
                                    </a>
                                  ) : (
                                    <Badge variant="outline">Read</Badge>
                                  )}
                                </div>

                                {r.data.content && (
                                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{r.data.content}</div>
                                )}

                                {!r.data.content && r.data.url && (
                                  <div className="text-xs text-muted-foreground break-all">{r.data.url}</div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
