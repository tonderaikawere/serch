import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
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

type LessonBlock =
  | { type: "text"; markdown: string }
  | { type: "image"; url: string; caption?: string }
  | { type: "video"; url: string; title?: string }
  | { type: "link"; url: string; title?: string; description?: string }
  | { type: "divider" };

type LessonDoc = {
  title?: string;
  content?: string;
  order?: number;
  type?: "lesson" | "exercise";
  blocks?: LessonBlock[];
};

type ResourceDoc = {
  title?: string;
  description?: string;
  url?: string;
  content?: string;
  blocks?: LessonBlock[];
  updatedAt?: unknown;
};

type CourseProgressDoc = {
  courseId?: string;
  currentModuleId?: string;
  currentLessonId?: string;
  completedLessonIds?: string[];
  courseCompleted?: boolean;
  updatedAt?: unknown;
};

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

function isProbablyVideoUrl(rawUrl: string) {
  const s = (rawUrl ?? "").toLowerCase();
  return s.includes(".mp4") || s.includes(".webm") || s.includes(".ogg");
}

function youTubeEmbedSrc(videoId: string) {
  const id = (videoId ?? "").trim();
  if (!id) return "";
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`;
}

export default function StudentCoursePlayer() {
  const { profile } = useAuth();
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [course, setCourse] = useState<CourseDoc | null>(null);
  const [modules, setModules] = useState<Array<{ id: string; data: ModuleDoc }>>([]);
  const [lessonsByModule, setLessonsByModule] = useState<Record<string, Array<{ id: string; data: LessonDoc }>>>({});
  const [resourcesByModule, setResourcesByModule] = useState<Record<string, Array<{ id: string; data: ResourceDoc }>>>({});
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);

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

        const resourcesPairs = await Promise.all(
          nextModules.map(async (m) => {
            const resourcesRef = collection(firestore, "courses", courseId, "modules", m.id, "resources");
            let resourcesSnap;
            try {
              resourcesSnap = await getDocs(query(resourcesRef, orderBy("updatedAt", "desc")));
            } catch {
              resourcesSnap = await getDocs(resourcesRef);
            }
            return [m.id, resourcesSnap.docs.map((d) => ({ id: d.id, data: d.data() as ResourceDoc }))] as const;
          }),
        );

        if (cancelled) return;
        setCourse(courseData);
        setModules(nextModules);
        setLessonsByModule(Object.fromEntries(lessonsPairs));
        setResourcesByModule(Object.fromEntries(resourcesPairs));
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

  const moduleOrder = useMemo(() => {
    const next = [...modules];
    next.sort((a, b) => (a.data.order ?? 999) - (b.data.order ?? 999));
    return next;
  }, [modules]);

  const totalLessons = useMemo(() => {
    const total = Object.values(lessonsByModule).reduce((sum, x) => sum + x.length, 0);
    return total;
  }, [lessonsByModule]);

  const completedLessonsCount = progress?.completedLessonIds?.length ?? 0;
  const courseProgressPct = totalLessons > 0 ? Math.min(100, (completedLessonsCount / totalLessons) * 100) : 0;

  function nextIncompleteLessonIndex(lessons: Array<{ id: string; data: LessonDoc }>) {
    for (let i = 0; i < lessons.length; i += 1) {
      if (!completedLessonIds.has(lessons[i].id)) return i;
    }
    return lessons.length;
  }

  function isLessonUnlocked(lessons: Array<{ id: string; data: LessonDoc }>, idx: number) {
    const firstLocked = nextIncompleteLessonIndex(lessons);
    return idx <= firstLocked;
  }

  function isModuleUnlocked(moduleId: string) {
    const idx = moduleOrder.findIndex((m) => m.id === moduleId);
    if (idx < 0) return false;
    if (idx === 0) return true;

    for (let i = 0; i < idx; i += 1) {
      const m = moduleOrder[i];
      const lessons = lessonsByModule[m.id] ?? [];
      if (lessons.length === 0) continue;
      const complete = lessons.every((l) => completedLessonIds.has(l.id));
      if (!complete) return false;
    }

    return true;
  }

  const activeModule = openModuleId ? modules.find((m) => m.id === openModuleId) ?? null : null;
  const activeLessons = useMemo(() => (openModuleId ? lessonsByModule[openModuleId] ?? [] : []), [lessonsByModule, openModuleId]);
  const activeResources = useMemo(
    () => (openModuleId ? resourcesByModule[openModuleId] ?? [] : []),
    [openModuleId, resourcesByModule],
  );
  const activeLesson = useMemo(
    () => (openLessonId ? activeLessons.find((l) => l.id === openLessonId) ?? null : null),
    [activeLessons, openLessonId],
  );

  const activeLessonIndex = useMemo(() => {
    if (!openLessonId) return -1;
    return activeLessons.findIndex((l) => l.id === openLessonId);
  }, [activeLessons, openLessonId]);

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

  const recommendedModuleId = useMemo(() => {
    for (const m of moduleOrder) {
      const lessons = lessonsByModule[m.id] ?? [];
      if (lessons.length === 0) continue;
      const nextIdx = nextIncompleteLessonIndex(lessons);
      if (nextIdx < lessons.length) return m.id;
    }
    return moduleOrder[0]?.id ?? null;
  }, [lessonsByModule, moduleOrder]);

  const recommendedLessonId = useMemo(() => {
    const mId = recommendedModuleId;
    if (!mId) return null;
    const lessons = lessonsByModule[mId] ?? [];
    const nextIdx = nextIncompleteLessonIndex(lessons);
    return lessons[nextIdx]?.id ?? lessons[0]?.id ?? null;
  }, [lessonsByModule, recommendedModuleId]);

  useEffect(() => {
    if (loading) return;
    if (!courseId) return;

    const trySelect = (mId: string, lId: string) => {
      if (!isModuleUnlocked(mId)) return false;
      const lessons = lessonsByModule[mId] ?? [];
      const idx = lessons.findIndex((l) => l.id === lId);
      if (idx < 0) return false;
      if (!isLessonUnlocked(lessons, idx)) return false;
      setOpenModuleId(mId);
      setOpenLessonId(lId);
      void setCurrentModule(mId);
      void setCurrentLesson(mId, lId);
      return true;
    };

    const m = progress?.currentModuleId;
    const l = progress?.currentLessonId;
    if (m && l && trySelect(m, l)) return;

    const mId = recommendedModuleId;
    const lId = recommendedLessonId;
    if (mId && lId && trySelect(mId, lId)) return;

    for (const mod of moduleOrder) {
      const lessons = lessonsByModule[mod.id] ?? [];
      const nextIdx = nextIncompleteLessonIndex(lessons);
      const candidate = lessons[nextIdx]?.id ?? lessons[0]?.id ?? null;
      if (candidate && trySelect(mod.id, candidate)) return;
    }
  }, [
    courseId,
    loading,
    lessonsByModule,
    moduleOrder,
    progress?.currentLessonId,
    progress?.currentModuleId,
    recommendedLessonId,
    recommendedModuleId,
  ]);

  async function markLessonComplete(lessonId: string) {
    if (!uid || !courseId) return;
    const current = progress?.completedLessonIds ?? [];
    if (current.includes(lessonId)) return;
    const next = [...current, lessonId];
    const completedSet = new Set(next);

    setProgress((p) => ({ ...(p ?? {}), completedLessonIds: next }));

    const allLessonIds = Object.values(lessonsByModule).flat().map((l) => l.id);
    const courseCompleted = allLessonIds.length > 0 && allLessonIds.every((id) => completedSet.has(id));
    await persistProgress({ completedLessonIds: next, courseCompleted });

    if (courseCompleted) {
      navigate(`/students/courses/${courseId}`);
      return;
    }

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

  function renderLessonContent(raw: string) {
    const text = raw.trim();
    if (!text) return <div className="text-sm text-muted-foreground">No content yet.</div>;

    const parts = text
      .split(/\n\n+/g)
      .map((p) => p.trim())
      .filter(Boolean);

    return (
      <div className="space-y-4">
        {parts.map((p, idx) => (
          <p key={idx} className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {p}
          </p>
        ))}
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

          if (b.type === "divider") return <Separator key={`divider-${idx}`} />;

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

            if (isProbablyVideoUrl(url)) {
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

    const unlockedIdx = nextIncompleteLessonIndex(activeLessons);

    let prevId: string | null = null;
    for (let i = activeLessonIndex - 1; i >= 0; i -= 1) {
      if (isLessonUnlocked(activeLessons, i)) {
        prevId = activeLessons[i].id;
        break;
      }
    }

    let nextId: string | null = null;
    for (let i = activeLessonIndex + 1; i < activeLessons.length; i += 1) {
      if (i <= unlockedIdx) {
        nextId = activeLessons[i].id;
        break;
      }
    }

    return { prevId, nextId };
  }, [activeLessonIndex, activeLessons, activeModule]);

  const upNextTitle = useMemo(() => {
    if (!prevNext.nextId) return null;
    const next = activeLessons.find((l) => l.id === prevNext.nextId) ?? null;
    return next?.data.title ?? null;
  }, [activeLessons, prevNext.nextId]);

  async function goPrev() {
    if (!activeModule || !prevNext.prevId) return;
    setOpenLessonId(prevNext.prevId);
    await setCurrentLesson(activeModule.id, prevNext.prevId);
  }

  async function goNext() {
    if (!activeModule || !activeLesson) return;

    // Auto-complete the current lesson when advancing.
    const isDone = completedLessonIds.has(activeLesson.id);
    if (!isDone) {
      await markLessonComplete(activeLesson.id);
    }

    const nextCompleted = new Set([...(progress?.completedLessonIds ?? []), activeLesson.id]);

    // Try next unlocked lesson in the same module.
    const lessons = lessonsByModule[activeModule.id] ?? [];
    const currentIdx = lessons.findIndex((l) => l.id === activeLesson.id);
    const unlockedIdx = (() => {
      for (let i = 0; i < lessons.length; i += 1) {
        if (!nextCompleted.has(lessons[i].id)) return i;
      }
      return lessons.length;
    })();

    for (let i = Math.max(0, currentIdx + 1); i < lessons.length; i += 1) {
      if (i <= unlockedIdx) {
        const nextLessonId = lessons[i].id;
        setOpenLessonId(nextLessonId);
        await setCurrentLesson(activeModule.id, nextLessonId);
        return;
      }
    }

    // Otherwise jump to the next unlocked module.
    const currentModuleIdx = moduleOrder.findIndex((m) => m.id === activeModule.id);
    for (let mi = currentModuleIdx + 1; mi < moduleOrder.length; mi += 1) {
      const m = moduleOrder[mi];
      if (!isModuleUnlocked(m.id)) continue;
      const nextLessons = lessonsByModule[m.id] ?? [];
      const nextLessonIdx = (() => {
        for (let i = 0; i < nextLessons.length; i += 1) {
          if (!nextCompleted.has(nextLessons[i].id)) return i;
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
      return;
    }
  }

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

  if (!courseId || !course || course.published !== true) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6">
          <Card>
            <CardHeader>
              <CardTitle>Course not available</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">This course does not exist or is not published.</div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-4rem)] w-full bg-[#f6f7f9] overflow-hidden">
        <div className="h-full w-full">
          {sidebarOpen ? (
            <div className="fixed inset-0 z-50">
              <button
                type="button"
                className="absolute inset-0 bg-black/30"
                onClick={() => setSidebarOpen(false)}
              />
              <div className="absolute left-0 top-0 h-full w-[360px] max-w-[90vw] bg-white border-r border-border">
                <div className="h-full overflow-y-auto">
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-foreground truncate">{course.title ?? "Untitled course"}</div>
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => setSidebarOpen(false)}>
                        Close
                      </Button>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <Button asChild size="sm" variant="outline" className="rounded-full">
                        <Link to={`/students/courses/${courseId}`}>Overview</Link>
                      </Button>
                      <Badge variant={progress?.courseCompleted ? "secondary" : "outline"} className="rounded-full">
                        {progress?.courseCompleted ? "Completed" : "In progress"}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">
                        {progress?.courseCompleted
                          ? "Course completed"
                          : `${completedLessonsCount}/${totalLessons || "—"} lessons completed`}
                      </div>
                      <Progress value={progress?.courseCompleted ? 100 : courseProgressPct} />
                    </div>
                  </div>

                  <div className="px-4 pb-4 space-y-3">
                    {modules.length === 0 && <div className="text-sm text-muted-foreground">No learning modules yet.</div>}

                    {modules.length > 0 && (
                      <>
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-foreground">{activeModule?.data.title ?? "Module"}</div>
                          {activeModule?.data.description ? (
                            <div className="text-xs text-muted-foreground truncate">{activeModule.data.description}</div>
                          ) : null}
                        </div>

                        <select
                          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
                          value={openModuleId ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
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
                            setSidebarOpen(false);
                          }}
                        >
                          {moduleOrder.map((m) => {
                            const unlocked = isModuleUnlocked(m.id);
                            const title = m.data.title ?? "Module";
                            return (
                              <option key={m.id} value={m.id} disabled={!unlocked}>
                                {title}
                                {!unlocked ? " (Locked)" : ""}
                              </option>
                            );
                          })}
                        </select>

                        <div className="space-y-2">
                          {activeLessons.length === 0 && <div className="text-xs text-muted-foreground">No lessons yet.</div>}

                          {activeLessons.map((l, idx) => {
                            const canOpen = Boolean(activeModule) && isLessonUnlocked(activeLessons, idx);
                            const done = completedLessonIds.has(l.id);
                            return (
                              <button
                                key={l.id}
                                type="button"
                                className={
                                  "w-full text-left rounded-xl border border-border bg-white px-3 py-2 transition-colors " +
                                  (openLessonId === l.id ? "shadow-sm" : "hover:bg-muted/20") +
                                  (canOpen ? "" : " opacity-60 cursor-not-allowed")
                                }
                                onClick={() => {
                                  if (!activeModule) return;
                                  if (!canOpen) return;
                                  setOpenLessonId(l.id);
                                  void setCurrentLesson(activeModule.id, l.id);
                                  setSidebarOpen(false);
                                }}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-xs font-medium text-foreground truncate">{l.data.title ?? "Lesson"}</div>
                                    <div className="text-[11px] text-muted-foreground">
                                      {l.data.type === "exercise" ? "Exercise" : "Lesson"}
                                    </div>
                                  </div>
                                  <Badge variant={done ? "secondary" : "outline"} className="rounded-full">
                                    {done ? "Done" : "Next"}
                                  </Badge>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="space-y-2 pt-2">
                          <div className="text-[11px] text-muted-foreground">Resources</div>
                          {activeResources.length === 0 ? (
                            <div className="text-xs text-muted-foreground">No resources yet.</div>
                          ) : (
                            <div className="space-y-2">
                              {activeResources.map((r) => (
                                <div key={r.id} className="rounded-xl border border-border bg-white px-3 py-2">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="text-xs font-medium text-foreground truncate">{r.data.title ?? "Resource"}</div>
                                      {r.data.description ? (
                                        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{r.data.description}</div>
                                      ) : null}
                                    </div>
                                    {r.data.url ? (
                                      <a
                                        className="text-[11px] text-primary hover:underline"
                                        href={r.data.url}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        Open
                                      </a>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="bg-white h-full">
            <div className="sticky top-0 z-10 border-b border-border bg-white">
              <div className="px-4 sm:px-6 py-4 w-full flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-2xl sm:text-3xl font-bold text-foreground truncate">
                    {activeLesson?.data.title ?? "Choose a lesson"}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full bg-white"
                    onClick={() => {
                      setSidebarOpen((v) => !v);
                    }}
                  >
                    {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="h-full flex flex-col">
              <div className="flex-1 min-h-0 p-4 sm:p-6 overflow-hidden">
                {!activeLesson ? (
                  <div className="text-sm text-muted-foreground">Select a lesson to begin.</div>
                ) : Array.isArray(activeLesson.data.blocks) && activeLesson.data.blocks.length > 0 ? (
                  (() => {
                    const blocks = activeLesson.data.blocks;
                    const heroIdx = blocks.findIndex((b) => b?.type === "video" && typeof (b as { url?: string }).url === "string");
                    const hero = heroIdx >= 0 ? (blocks[heroIdx] as Extract<LessonBlock, { type: "video" }>) : null;
                    const heroUrl = (hero?.url ?? "").trim();
                    const heroYt = heroUrl ? maybeYouTubeId(heroUrl) : null;
                    const heroIsMp4 = heroUrl ? isProbablyVideoUrl(heroUrl) : false;

                    const remainingBlocks = heroIdx >= 0 ? blocks.filter((_, i) => i !== heroIdx) : blocks;
                    const fallbackText = (activeLesson.data.content ?? "").trim();

                    return (
                      <div className="h-full overflow-y-auto pr-1">
                        <div className="space-y-6">
                          <div className="w-full overflow-hidden rounded-none border border-border bg-black">
                            {heroYt ? (
                              <div className="aspect-video w-full">
                                <iframe
                                  className="h-full w-full"
                                  src={youTubeEmbedSrc(heroYt)}
                                  title={hero?.title ?? "YouTube video"}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  allowFullScreen
                                />
                              </div>
                            ) : heroIsMp4 ? (
                              <div className="aspect-video w-full">
                                <video className="h-full w-full" controls src={heroUrl} />
                              </div>
                            ) : heroUrl ? (
                              <div className="p-4">
                                <a className="text-sm text-primary hover:underline break-all" href={heroUrl} target="_blank" rel="noreferrer">
                                  {heroUrl}
                                </a>
                              </div>
                            ) : (
                              <div className="p-4 text-sm text-muted-foreground">No video yet.</div>
                            )}
                          </div>

                          {heroUrl && heroYt ? (
                            <a className="text-xs text-muted-foreground hover:underline" href={heroUrl} target="_blank" rel="noreferrer">
                              Open on YouTube
                            </a>
                          ) : null}

                          {remainingBlocks.length > 0 ? renderBlocks(remainingBlocks) : fallbackText ? renderLessonContent(fallbackText) : null}
                        </div>
                      </div>
                    );
                  })()
                ) : (activeLesson.data.content ?? "").trim() ? (
                  <div className="h-full overflow-y-auto pr-1">{renderLessonContent((activeLesson.data.content ?? "").trim())}</div>
                ) : (
                  <div className="h-full flex items-center">
                    <div className="text-sm text-muted-foreground">No content yet.</div>
                  </div>
                )}
              </div>

              <div className="border-t border-border bg-white px-4 sm:px-6 py-3">
                <div className="flex items-center justify-between gap-3">
                  <Button size="sm" variant="outline" className="rounded-full" disabled={!activeModule || !prevNext.prevId} onClick={() => void goPrev()}>
                    Previous
                  </Button>
                  <div className="text-xs text-muted-foreground truncate">
                    {upNextTitle ? `Up next: ${upNextTitle}` : "End of module"}
                  </div>
                  <Button size="sm" className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!activeModule || !activeLesson} onClick={() => void goNext()}>
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
