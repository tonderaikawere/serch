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
import { CheckCircle2, ChevronRight, Lock } from "lucide-react";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

type CourseDoc = {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  promoVideoUrl?: string;
  level?: "beginner" | "intermediate" | "advanced";
  durationHours?: number;
  learnersCount?: number;
  likesCount?: number;
  certificateEnabled?: boolean;
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
  blocks?: LessonBlock[];
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
  blocks?: LessonBlock[];
  updatedAt?: unknown;
};

type LessonBlock =
  | { type: "text"; markdown: string }
  | { type: "image"; url: string; caption?: string }
  | { type: "video"; url: string; title?: string }
  | { type: "link"; url: string; title?: string; description?: string }
  | { type: "divider" };

function maybeYouTubeId(rawUrl: string): string | null {
  const s = (rawUrl ?? "").trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").trim();
      return id || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (u.pathname === "/watch") {
        const v = u.searchParams.get("v");
        return v ? v.trim() : null;
      }
      if (u.pathname.startsWith("/embed/")) {
        const id = u.pathname.split("/embed/")[1]?.split("/")[0]?.trim();
        return id || null;
      }
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/shorts/")[1]?.split("/")[0]?.trim();
        return id || null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function isProbablyMp4(rawUrl: string) {
  const s = (rawUrl ?? "").toLowerCase();
  return s.includes(".mp4") || s.includes(".webm") || s.includes(".ogg");
}

function youTubeEmbedSrc(videoId: string) {
  const id = (videoId ?? "").trim();
  if (!id) return "";
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`;
}

export default function StudentCourseDetails() {
  const { profile } = useAuth();
  const { courseId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [course, setCourse] = useState<CourseDoc | null>(null);
  const [modules, setModules] = useState<Array<{ id: string; data: ModuleDoc }>>([]);
  const [lessonsByModule, setLessonsByModule] = useState<Record<string, Array<{ id: string; data: LessonDoc }>>>({});
  const [resources, setResources] = useState<Array<{ id: string; data: ResourceDoc }>>([]);
  const [moduleResourcesByModule, setModuleResourcesByModule] = useState<Record<string, Array<{ id: string; data: ResourceDoc }>>>({});
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

        const moduleResourcesPairs = await Promise.all(
          nextModules.map(async (m) => {
            const modResourcesRef = collection(firestore, "courses", courseId, "modules", m.id, "resources");
            let modResourcesSnap;
            try {
              modResourcesSnap = await getDocs(query(modResourcesRef, orderBy("updatedAt", "desc")));
            } catch {
              modResourcesSnap = await getDocs(modResourcesRef);
            }
            return [m.id, modResourcesSnap.docs.map((d) => ({ id: d.id, data: d.data() as ResourceDoc }))] as const;
          }),
        );

        if (cancelled) return;
        setCourse(courseData);
        setModules(nextModules);
        setLessonsByModule(Object.fromEntries(lessonsPairs));
        setResources(resourcesSnap.docs.map((d) => ({ id: d.id, data: d.data() as ResourceDoc })));
        setModuleResourcesByModule(Object.fromEntries(moduleResourcesPairs));
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

  function renderBlocks(blocks: LessonBlock[]) {
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return <div className="text-sm text-muted-foreground">No content yet.</div>;
    }

    return (
      <div className="space-y-4">
        {blocks.map((b, idx) => {
          if (!b || typeof b !== "object" || !("type" in b)) return null;

          if (b.type === "divider") {
            return <Separator key={`divider-${idx}`} />;
          }

          if (b.type === "text") {
            const text = (b.markdown ?? "").trim();
            if (!text) return null;
            const parts = text.split(/\n\n+/g).map((p) => p.trim()).filter(Boolean);
            return (
              <div key={`text-${idx}`} className="space-y-3">
                {parts.map((p) => (
                  <p key={p} className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
            );
          }

          if (b.type === "image") {
            const url = (b.url ?? "").trim();
            if (!url) return null;
            return (
              <div key={`image-${idx}`} className="space-y-2">
                <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
                  <img src={url} alt={b.caption ?? "Lesson image"} className="w-full h-auto" loading="lazy" />
                </div>
                {b.caption ? <div className="text-xs text-muted-foreground">{b.caption}</div> : null}
              </div>
            );
          }

          if (b.type === "video") {
            const url = (b.url ?? "").trim();
            if (!url) return null;
            const yt = maybeYouTubeId(url);
            if (yt) {
              return (
                <div key={`video-${idx}`} className="space-y-2">
                  {b.title ? <div className="text-sm font-medium text-foreground">{b.title}</div> : null}
                  <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted/20">
                    <iframe
                      className="h-full w-full"
                      src={youTubeEmbedSrc(yt)}
                      title={b.title ?? "YouTube video"}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                </div>
              );
            }

            if (isProbablyMp4(url)) {
              return (
                <div key={`video-${idx}`} className="space-y-2">
                  {b.title ? <div className="text-sm font-medium text-foreground">{b.title}</div> : null}
                  <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
                    <video className="w-full" controls src={url} />
                  </div>
                </div>
              );
            }

            return (
              <div key={`video-${idx}`} className="space-y-2">
                {b.title ? <div className="text-sm font-medium text-foreground">{b.title}</div> : null}
                <a className="text-sm text-primary hover:underline break-all" href={url} target="_blank" rel="noreferrer">
                  {url}
                </a>
              </div>
            );
          }

          if (b.type === "link") {
            const url = (b.url ?? "").trim();
            if (!url) return null;
            return (
              <Card key={`link-${idx}`}>
                <CardContent className="p-4 space-y-1">
                  <a className="text-sm font-medium text-primary hover:underline break-all" href={url} target="_blank" rel="noreferrer">
                    {b.title?.trim() || url}
                  </a>
                  {b.description ? <div className="text-xs text-muted-foreground">{b.description}</div> : null}
                </CardContent>
              </Card>
            );
          }

          return null;
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

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6">
          <Card>
            <CardContent className="p-6 text-destructive">{error}</CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6">
          <Card>
            <CardContent className="p-6">Loading course…</CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button asChild variant="outline" size="sm">
            <Link to="/students/courses">Back</Link>
          </Button>
          {courseId ? (
            <Button asChild size="sm" disabled={!recommendedModuleId || !recommendedLessonId}>
              <Link to={`/students/courses/${courseId}/player`}>
                {completedLessonsCount ? "Continue learning" : "Start learning"}
              </Link>
            </Button>
          ) : null}
        </div>

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
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Course</div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground">{course?.title ?? "Untitled course"}</h1>
                {course?.description ? <p className="text-muted-foreground max-w-3xl">{course.description}</p> : null}
              </div>

              {(course.level || typeof course.durationHours === "number" || typeof course.learnersCount === "number" || typeof course.likesCount === "number") && (
                <div className="flex flex-wrap gap-2">
                  {course.level ? <Badge variant="outline" className="uppercase">{course.level}</Badge> : null}
                  {typeof course.durationHours === "number" ? <Badge variant="outline">{course.durationHours} hrs</Badge> : null}
                  {typeof course.learnersCount === "number" ? (
                    <Badge variant="outline">{course.learnersCount.toLocaleString()} learners</Badge>
                  ) : null}
                  {typeof course.likesCount === "number" ? <Badge variant="outline">{course.likesCount} likes</Badge> : null}
                  {course.certificateEnabled ? <Badge variant="secondary">Certificate</Badge> : null}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_0.85fr] gap-6">
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  {course.promoVideoUrl && maybeYouTubeId(course.promoVideoUrl) ? (
                    <div className="aspect-video w-full bg-muted/20">
                      <iframe
                        className="h-full w-full"
                        src={youTubeEmbedSrc(maybeYouTubeId(course.promoVideoUrl) ?? "")}
                        title="Course promo"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  ) : course.thumbnailUrl ? (
                    <div className="w-full aspect-video bg-muted/30 overflow-hidden">
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title ?? "Course"}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : course.promoVideoUrl ? (
                    <div className="p-5">
                      <a
                        className="text-sm text-primary hover:underline break-all"
                        href={course.promoVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {course.promoVideoUrl}
                      </a>
                    </div>
                  ) : (
                    <div className="p-5 text-sm text-muted-foreground">No promo video yet.</div>
                  )}

                  <div className="p-5 space-y-4">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Overview</div>
                      <div className="text-lg font-semibold text-foreground">What you’ll learn</div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Complete each module in order to unlock the next.
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>Start</CardTitle>
                    <Badge variant={progress?.courseCompleted ? "secondary" : "outline"}>
                      {progress?.courseCompleted ? "Completed" : "In progress"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border p-3">
                      <div className="text-xs text-muted-foreground">Lessons</div>
                      <div className="text-sm font-semibold text-foreground">
                        {completedLessonsCount}/{totalLessons || "—"}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <div className="text-xs text-muted-foreground">Progress</div>
                      <div className="text-sm font-semibold text-foreground">
                        {progress?.courseCompleted ? "100%" : `${Math.round(courseProgressPct)}%`}
                      </div>
                    </div>
                  </div>

                  <Progress value={progress?.courseCompleted ? 100 : courseProgressPct} />

                  <Button asChild className="w-full" disabled={!recommendedModuleId || !recommendedLessonId}>
                    <Link to={`/students/courses/${courseId}/player`}>
                      {completedLessonsCount ? "Continue learning" : "Start learning"}
                    </Link>
                  </Button>

                  {course.promoVideoUrl ? (
                    <a
                      className="text-xs text-muted-foreground hover:underline"
                      href={course.promoVideoUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open promo video
                    </a>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle>Curriculum</CardTitle>
                  <Badge variant={progress?.courseCompleted ? "secondary" : "outline"}>
                    {progress?.courseCompleted ? "Completed" : "In progress"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {modules.length === 0 && <div className="text-sm text-muted-foreground">No learning modules yet.</div>}

                {modules.length > 0 && (
                  <Accordion type="single" collapsible>
                    {moduleOrder.map((m, idx) => {
                      const unlocked = isModuleUnlocked(m.id);
                      const lessons = lessonsByModule[m.id] ?? [];
                      const modResources = moduleResourcesByModule[m.id] ?? [];
                      const nextIdx = nextIncompleteLessonIndex(lessons);
                      const completed = nextIdx >= lessons.length && lessons.length > 0;
                      const status = completed ? "Completed" : unlocked ? "Unlocked" : "Locked";
                      const previewLessons = lessons
                        .filter((l) => l.data.type !== "exercise")
                        .slice(0, 3)
                        .map((l) => cleanLessonTitle(m.data.title ?? "Module", l.data.title) ?? l.data.title ?? "Lesson")
                        .filter(Boolean);

                      return (
                        <AccordionItem key={m.id} value={m.id} className={unlocked ? "" : "opacity-70"}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center justify-between w-full pr-2 gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="mt-0.5">
                                  {completed ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  ) : unlocked ? (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="min-w-0 text-left">
                                  <div className="text-sm font-medium text-foreground truncate">
                                    {idx + 1}. {m.data.title ?? "Module"}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {lessons.length ? `${lessons.length} items` : "No lessons"}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge variant={completed ? "secondary" : "outline"}>{status}</Badge>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3">
                              {m.data.description ? (
                                <div className="text-sm text-muted-foreground whitespace-pre-wrap">{m.data.description}</div>
                              ) : (
                                <div className="text-sm text-muted-foreground">Open the player to start learning.</div>
                              )}

                              {previewLessons.length > 0 ? (
                                <div className="rounded-lg border border-border bg-muted/10 p-3">
                                  <div className="text-xs font-medium text-foreground">In this module</div>
                                  <ul className="mt-2 space-y-1">
                                    {previewLessons.map((t) => (
                                      <li key={t} className="text-xs text-muted-foreground truncate">
                                        {t}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}

                              <div className="text-xs text-muted-foreground">
                                {modResources.length ? `${modResources.length} resources available` : "No resources in this module yet."}
                              </div>

                              {!unlocked ? (
                                <div className="text-xs text-muted-foreground">Locked until previous module is completed.</div>
                              ) : null}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </CardContent>
            </Card>

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

                            {Array.isArray(r.data.blocks) && r.data.blocks.length > 0
                              ? renderBlocks(r.data.blocks)
                              : r.data.content
                                ? (
                                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">{r.data.content}</div>
                                  )
                                : null}

                            {!r.data.content && (!Array.isArray(r.data.blocks) || r.data.blocks.length === 0) && r.data.url && (
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
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
