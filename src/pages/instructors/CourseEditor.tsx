import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";

type CourseDoc = {
  title?: string;
  description?: string;
  level?: "beginner" | "intermediate" | "advanced";
  topic?: "seo" | "aeo" | "seo+aeo";
  thumbnailUrl?: string;
  promoVideoUrl?: string;
  durationHours?: number;
  learnersCount?: number;
  likesCount?: number;
  certificateEnabled?: boolean;
  published?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type ModuleDoc = {
  title?: string;
  description?: string;
  content?: string;
  order?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type ResourceDoc = {
  title?: string;
  description?: string;
  url?: string;
  content?: string;
  blocks?: LessonBlock[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

type LessonBlock =
  | { type: "text"; markdown: string }
  | { type: "image"; url: string; caption?: string }
  | { type: "video"; url: string; title?: string }
  | { type: "link"; url: string; title?: string; description?: string }
  | { type: "divider" };

type LessonDoc = {
  title?: string;
  type?: "lesson" | "exercise";
  order?: number;
  content?: string;
  blocks?: LessonBlock[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

type StudentProgressRow = {
  uid: string;
  displayName: string | null;
  email: string | null;
  currentModuleId: string | null;
  currentLessonId: string | null;
  completedLessonsCount: number;
  courseCompleted: boolean;
  updatedAt?: unknown;
};

export default function InstructorCourseEditor() {
  const { profile } = useAuth();
  const { courseId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [course, setCourse] = useState<CourseDoc | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [published, setPublished] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [promoVideoUrl, setPromoVideoUrl] = useState("");
  const [level, setLevel] = useState<CourseDoc["level"]>("beginner");
  const [durationHours, setDurationHours] = useState<number | "">("");
  const [learnersCount, setLearnersCount] = useState<number | "">("");
  const [likesCount, setLikesCount] = useState<number | "">("");
  const [certificateEnabled, setCertificateEnabled] = useState(true);

  const [modules, setModules] = useState<Array<{ id: string; data: ModuleDoc }>>([]);
  const [resources, setResources] = useState<Array<{ id: string; data: ResourceDoc }>>([]);

  const [studentProgress, setStudentProgress] = useState<StudentProgressRow[]>([]);

  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleDescription, setNewModuleDescription] = useState("");
  const [newModuleContent, setNewModuleContent] = useState("");

  const [newResourceTitle, setNewResourceTitle] = useState("");
  const [newResourceDescription, setNewResourceDescription] = useState("");
  const [newResourceUrl, setNewResourceUrl] = useState("");
  const [newResourceContent, setNewResourceContent] = useState("");
  const [newResourceBlocks, setNewResourceBlocks] = useState<LessonBlock[]>([]);

  const [newLessonModuleId, setNewLessonModuleId] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonType, setNewLessonType] = useState<LessonDoc["type"]>("lesson");
  const [newLessonOrder, setNewLessonOrder] = useState<number | "">("");
  const [newLessonContent, setNewLessonContent] = useState("");
  const [newLessonBlocks, setNewLessonBlocks] = useState<LessonBlock[]>([]);

  function moveBlock<T>(arr: T[], from: number, to: number) {
    if (from < 0 || from >= arr.length) return arr;
    if (to < 0 || to >= arr.length) return arr;
    const next = [...arr];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    return next;
  }

  function defaultBlock(type: LessonBlock["type"]): LessonBlock {
    if (type === "text") return { type: "text", markdown: "" };
    if (type === "image") return { type: "image", url: "", caption: "" };
    if (type === "video") return { type: "video", url: "", title: "" };
    if (type === "link") return { type: "link", url: "", title: "", description: "" };
    return { type: "divider" };
  }

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

        if (cancelled) return;
        setCourse(courseData);
        setCourseTitle(courseData?.title ?? "");
        setCourseDescription(courseData?.description ?? "");
        setPublished(courseData?.published === true);
        setThumbnailUrl(courseData?.thumbnailUrl ?? "");
        setPromoVideoUrl(courseData?.promoVideoUrl ?? "");
        setLevel(courseData?.level ?? "beginner");
        setDurationHours(typeof courseData?.durationHours === "number" ? courseData!.durationHours! : "");
        setLearnersCount(typeof courseData?.learnersCount === "number" ? courseData!.learnersCount! : "");
        setLikesCount(typeof courseData?.likesCount === "number" ? courseData!.likesCount! : "");
        setCertificateEnabled(courseData?.certificateEnabled !== false);
        setModules(modulesSnap.docs.map((d) => ({ id: d.id, data: d.data() as ModuleDoc })));
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

  const nextModuleOrder = useMemo(() => {
    const max = modules.reduce((m, x) => Math.max(m, typeof x.data.order === "number" ? x.data.order : 0), 0);
    return max + 1;
  }, [modules]);

  async function saveCourse() {
    if (!courseId) return;
    await updateDoc(doc(firestore, "courses", courseId), {
      title: courseTitle.trim(),
      description: courseDescription.trim(),
      published,
      thumbnailUrl: thumbnailUrl.trim(),
      promoVideoUrl: promoVideoUrl.trim(),
      level: level ?? null,
      durationHours: typeof durationHours === "number" ? durationHours : null,
      learnersCount: typeof learnersCount === "number" ? learnersCount : null,
      likesCount: typeof likesCount === "number" ? likesCount : null,
      certificateEnabled,
      updatedAt: serverTimestamp(),
    });
    setCourse((prev) => ({
      ...(prev ?? {}),
      title: courseTitle.trim(),
      description: courseDescription.trim(),
      published,
      thumbnailUrl: thumbnailUrl.trim(),
      promoVideoUrl: promoVideoUrl.trim(),
      level: level ?? null,
      durationHours: typeof durationHours === "number" ? durationHours : null,
      learnersCount: typeof learnersCount === "number" ? learnersCount : null,
      likesCount: typeof likesCount === "number" ? likesCount : null,
      certificateEnabled,
    }));
  }

  async function addModule() {
    if (!courseId) return;
    const title = newModuleTitle.trim();
    if (!title) return;

    const modulesRef = collection(firestore, "courses", courseId, "modules");
    const created = await addDoc(modulesRef, {
      title,
      description: newModuleDescription.trim(),
      content: newModuleContent.trim(),
      order: nextModuleOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setModules((prev) => [
      ...prev,
      {
        id: created.id,
        data: {
          title,
          description: newModuleDescription.trim(),
          content: newModuleContent.trim(),
          order: nextModuleOrder,
        },
      },
    ]);

    setNewModuleTitle("");
    setNewModuleDescription("");
    setNewModuleContent("");
  }

  async function deleteModule(moduleId: string) {
    if (!courseId) return;
    await deleteDoc(doc(firestore, "courses", courseId, "modules", moduleId));
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
  }

  async function addResource() {
    if (!courseId) return;
    const title = newResourceTitle.trim();
    if (!title) return;

    const blocks = newResourceBlocks.length > 0 ? newResourceBlocks : null;

    const resourcesRef = collection(firestore, "courses", courseId, "resources");
    const created = await addDoc(resourcesRef, {
      title,
      description: newResourceDescription.trim(),
      url: newResourceUrl.trim(),
      blocks,
      content: newResourceContent.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setResources((prev) => [
      {
        id: created.id,
        data: {
          title,
          description: newResourceDescription.trim(),
          url: newResourceUrl.trim(),
          blocks: blocks ?? undefined,
          content: newResourceContent.trim(),
        },
      },
      ...prev,
    ]);

    setNewResourceTitle("");
    setNewResourceDescription("");
    setNewResourceUrl("");
    setNewResourceContent("");
    setNewResourceBlocks([]);
  }

  async function addLesson() {
    if (!courseId) return;
    if (!newLessonModuleId) return;
    const title = newLessonTitle.trim();
    if (!title) return;

    const blocks = newLessonBlocks.length > 0 ? newLessonBlocks : null;
    const order = typeof newLessonOrder === "number" ? newLessonOrder : 1;

    await addDoc(collection(firestore, "courses", courseId, "modules", newLessonModuleId, "lessons"), {
      title,
      type: newLessonType ?? "lesson",
      order,
      blocks,
      content: newLessonContent.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setNewLessonTitle("");
    setNewLessonType("lesson");
    setNewLessonOrder("");
    setNewLessonContent("");
    setNewLessonBlocks([]);
    setNewLessonModuleId(null);
  }

  async function deleteResource(resourceId: string) {
    if (!courseId) return;
    await deleteDoc(doc(firestore, "courses", courseId, "resources", resourceId));
    setResources((prev) => prev.filter((r) => r.id !== resourceId));
  }

  useEffect(() => {
    let cancelled = false;
    const hub = profile?.hub;
    if (!courseId || !hub) {
      setStudentProgress([]);
      return;
    }

    (async () => {
      try {
        const studentsSnap = await getDocs(query(collection(firestore, "students"), where("hub", "==", hub)));
        const studentRows = studentsSnap.docs.map((d) => {
          const data = d.data() as { uid?: string; displayName?: string | null; email?: string | null };
          return { uid: data.uid ?? d.id, displayName: data.displayName ?? null, email: data.email ?? null };
        });

        const progressDocs = await Promise.all(
          studentRows.map(async (s) => {
            const pSnap = await getDoc(doc(firestore, "students", s.uid, "courseProgress", courseId));
            const pData = pSnap.exists()
              ? (pSnap.data() as {
                  currentModuleId?: string;
                  currentLessonId?: string;
                  completedLessonIds?: string[];
                  courseCompleted?: boolean;
                  updatedAt?: unknown;
                })
              : null;
            return {
              uid: s.uid,
              displayName: s.displayName,
              email: s.email,
              currentModuleId: pData?.currentModuleId ?? null,
              currentLessonId: pData?.currentLessonId ?? null,
              completedLessonsCount: Array.isArray(pData?.completedLessonIds) ? pData!.completedLessonIds!.length : 0,
              courseCompleted: pData?.courseCompleted === true,
              updatedAt: pData?.updatedAt,
            } satisfies StudentProgressRow;
          }),
        );

        const filtered = progressDocs.filter((p) => p.currentModuleId != null || p.completedLessonsCount > 0 || p.courseCompleted);
        if (!cancelled) setStudentProgress(filtered);
      } catch {
        if (!cancelled) setStudentProgress([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [courseId, profile?.hub]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Course</h1>
            <p className="text-muted-foreground mt-1">Edit course details and modules.</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/instructors/courses">Back to courses</Link>
          </Button>
        </div>

        {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!loading && error && <div className="text-sm text-muted-foreground break-words">{error}</div>}

        {!loading && !error && !course && (
          <Card>
            <CardHeader>
              <CardTitle>Course not found</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">This course does not exist or you don't have access.</div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && course && (
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Title</div>
                  <Input value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} placeholder="Course title" />
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Description</div>
                  <Textarea
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    placeholder="What will students learn?"
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Course card image URL</div>
                  <Input
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Promo video URL (YouTube/Vimeo/MP4)</div>
                  <Input
                    value={promoVideoUrl}
                    onChange={(e) => setPromoVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Level</div>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={level ?? "beginner"}
                      onChange={(e) => setLevel(e.target.value as CourseDoc["level"])}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Duration (hours)</div>
                    <Input
                      inputMode="numeric"
                      value={durationHours}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return setDurationHours("");
                        const n = Number(v);
                        if (!Number.isFinite(n)) return;
                        setDurationHours(n);
                      }}
                      placeholder="3"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Learners</div>
                    <Input
                      inputMode="numeric"
                      value={learnersCount}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return setLearnersCount("");
                        const n = Number(v);
                        if (!Number.isFinite(n)) return;
                        setLearnersCount(n);
                      }}
                      placeholder="11748"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Likes</div>
                    <Input
                      inputMode="numeric"
                      value={likesCount}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return setLikesCount("");
                        const n = Number(v);
                        if (!Number.isFinite(n)) return;
                        setLikesCount(n);
                      }}
                      placeholder="71"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">Certificate</div>
                    <div className="text-xs text-muted-foreground">Show certificate badge on the course card.</div>
                  </div>
                  <Switch checked={certificateEnabled} onCheckedChange={setCertificateEnabled} />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">Published</div>
                    <div className="text-xs text-muted-foreground">
                      {published ? "Visible to students" : "Hidden from students"}
                    </div>
                  </div>
                  <Switch checked={published} onCheckedChange={setPublished} />
                </div>

                <div className="flex items-center justify-end">
                  <Button onClick={() => void saveCourse()} disabled={!courseTitle.trim()}>
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Student Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  {studentProgress.length} student{studentProgress.length === 1 ? "" : "s"} currently active in this course.
                </div>
                {studentProgress.length > 0 && (
                  <div className="space-y-2">
                    {studentProgress.map((p) => {
                      const moduleTitle = modules.find((m) => m.id === p.currentModuleId)?.data.title ?? "—";
                      return (
                        <div key={p.uid} className="rounded-lg border border-border p-3">
                          <div className="font-medium text-foreground truncate">{p.displayName ?? "Unnamed student"}</div>
                          <div className="text-sm text-muted-foreground truncate">{p.email ?? p.uid}</div>
                          <div className="text-sm text-muted-foreground mt-2">Module: {moduleTitle}</div>
                          <div className="text-sm text-muted-foreground">Lessons completed: {p.completedLessonsCount}</div>
                          <div className="text-sm text-muted-foreground">Course: {p.courseCompleted ? "Completed" : "In progress"}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Modules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">{modules.length} modules</div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">Add module</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>New module</DialogTitle>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">Title</div>
                          <Input
                            value={newModuleTitle}
                            onChange={(e) => setNewModuleTitle(e.target.value)}
                            placeholder="Module title"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">Description</div>
                          <Textarea
                            value={newModuleDescription}
                            onChange={(e) => setNewModuleDescription(e.target.value)}
                            placeholder="Short description"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">Content</div>
                          <Textarea
                            value={newModuleContent}
                            onChange={(e) => setNewModuleContent(e.target.value)}
                            placeholder="Lesson content (text)"
                            className="min-h-[160px]"
                          />
                        </div>
                      </div>

                      <DialogFooter>
                        <Button onClick={() => void addModule()} disabled={!newModuleTitle.trim()}>
                          Create
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {modules.length === 0 && <div className="text-sm text-muted-foreground">No modules yet.</div>}

                {modules.length > 0 && (
                  <div className="space-y-3">
                    {modules.map((m) => (
                      <div key={m.id} className="rounded-lg border border-border p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate">{m.data.title ?? "Module"}</div>
                            {m.data.description && (
                              <div className="text-sm text-muted-foreground mt-1">{m.data.description}</div>
                            )}
                            {typeof m.data.order === "number" && (
                              <div className="text-xs text-muted-foreground mt-2">Order: {m.data.order}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link to={`/instructors/courses/${courseId}/modules/${m.id}/questions`}>Questions</Link>
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setNewLessonModuleId(m.id);
                                  }}
                                >
                                  Add lesson
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>New lesson</DialogTitle>
                                </DialogHeader>

                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <div className="text-sm text-muted-foreground">Title</div>
                                    <Input value={newLessonTitle} onChange={(e) => setNewLessonTitle(e.target.value)} placeholder="Lesson title" />
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <div className="text-sm text-muted-foreground">Type</div>
                                      <select
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={newLessonType ?? "lesson"}
                                        onChange={(e) => setNewLessonType(e.target.value as LessonDoc["type"])}
                                      >
                                        <option value="lesson">Lesson</option>
                                        <option value="exercise">Exercise</option>
                                      </select>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="text-sm text-muted-foreground">Order</div>
                                      <Input
                                        inputMode="numeric"
                                        value={newLessonOrder}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          if (!v) return setNewLessonOrder("");
                                          const n = Number(v);
                                          if (!Number.isFinite(n)) return;
                                          setNewLessonOrder(n);
                                        }}
                                        placeholder="1"
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="text-sm text-muted-foreground">Blocks</div>
                                    <div className="rounded-lg border border-border p-3 space-y-3">
                                      <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div className="text-xs text-muted-foreground">Add and reorder content blocks (text, image, video, link).</div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setNewLessonBlocks((prev) => [...prev, defaultBlock("video")])}
                                          >
                                            Add video
                                          </Button>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setNewLessonBlocks((prev) => [...prev, defaultBlock("image")])}
                                          >
                                            Add image
                                          </Button>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setNewLessonBlocks((prev) => [...prev, defaultBlock("text")])}
                                          >
                                            Add text
                                          </Button>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setNewLessonBlocks((prev) => [...prev, defaultBlock("link")])}
                                          >
                                            Add link
                                          </Button>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setNewLessonBlocks((prev) => [...prev, defaultBlock("divider")])}
                                          >
                                            Divider
                                          </Button>
                                        </div>
                                      </div>

                                      {newLessonBlocks.length === 0 ? (
                                        <div className="text-xs text-muted-foreground">No blocks yet.</div>
                                      ) : (
                                        <div className="space-y-3">
                                          {newLessonBlocks.map((b, idx) => (
                                            <div key={idx} className="rounded-md border border-border p-3 space-y-2">
                                              <div className="flex items-center justify-between gap-3">
                                                <div className="text-xs font-medium text-foreground">{b.type.toUpperCase()}</div>
                                                <div className="flex items-center gap-2">
                                                  <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setNewLessonBlocks((prev) => moveBlock(prev, idx, idx - 1))}
                                                    disabled={idx === 0}
                                                  >
                                                    Up
                                                  </Button>
                                                  <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setNewLessonBlocks((prev) => moveBlock(prev, idx, idx + 1))}
                                                    disabled={idx === newLessonBlocks.length - 1}
                                                  >
                                                    Down
                                                  </Button>
                                                  <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => setNewLessonBlocks((prev) => prev.filter((_, i) => i !== idx))}
                                                  >
                                                    Remove
                                                  </Button>
                                                </div>
                                              </div>

                                              {b.type === "text" ? (
                                                <Textarea
                                                  value={b.markdown}
                                                  onChange={(e) =>
                                                    setNewLessonBlocks((prev) =>
                                                      prev.map((x, i) => (i === idx ? { ...x, markdown: e.target.value } : x)),
                                                    )
                                                  }
                                                  placeholder="Write lesson text…"
                                                  className="min-h-[120px]"
                                                />
                                              ) : null}

                                              {b.type === "image" ? (
                                                <div className="space-y-2">
                                                  <Input
                                                    value={b.url}
                                                    onChange={(e) =>
                                                      setNewLessonBlocks((prev) =>
                                                        prev.map((x, i) => (i === idx ? { ...x, url: e.target.value } : x)),
                                                      )
                                                    }
                                                    placeholder="Image URL"
                                                  />
                                                  <Input
                                                    value={b.caption ?? ""}
                                                    onChange={(e) =>
                                                      setNewLessonBlocks((prev) =>
                                                        prev.map((x, i) => (i === idx ? { ...x, caption: e.target.value } : x)),
                                                      )
                                                    }
                                                    placeholder="Caption (optional)"
                                                  />
                                                </div>
                                              ) : null}

                                              {b.type === "video" ? (
                                                <div className="space-y-2">
                                                  <Input
                                                    value={b.url}
                                                    onChange={(e) =>
                                                      setNewLessonBlocks((prev) =>
                                                        prev.map((x, i) => (i === idx ? { ...x, url: e.target.value } : x)),
                                                      )
                                                    }
                                                    placeholder="Video URL (YouTube / MP4)"
                                                  />
                                                  <Input
                                                    value={b.title ?? ""}
                                                    onChange={(e) =>
                                                      setNewLessonBlocks((prev) =>
                                                        prev.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)),
                                                      )
                                                    }
                                                    placeholder="Title (optional)"
                                                  />
                                                </div>
                                              ) : null}

                                              {b.type === "link" ? (
                                                <div className="space-y-2">
                                                  <Input
                                                    value={b.url}
                                                    onChange={(e) =>
                                                      setNewLessonBlocks((prev) =>
                                                        prev.map((x, i) => (i === idx ? { ...x, url: e.target.value } : x)),
                                                      )
                                                    }
                                                    placeholder="Link URL"
                                                  />
                                                  <Input
                                                    value={b.title ?? ""}
                                                    onChange={(e) =>
                                                      setNewLessonBlocks((prev) =>
                                                        prev.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)),
                                                      )
                                                    }
                                                    placeholder="Title (optional)"
                                                  />
                                                  <Input
                                                    value={b.description ?? ""}
                                                    onChange={(e) =>
                                                      setNewLessonBlocks((prev) =>
                                                        prev.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)),
                                                      )
                                                    }
                                                    placeholder="Description (optional)"
                                                  />
                                                </div>
                                              ) : null}

                                              {b.type === "divider" ? (
                                                <div className="text-xs text-muted-foreground">Divider</div>
                                              ) : null}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="text-sm text-muted-foreground">Fallback content (text)</div>
                                    <Textarea
                                      value={newLessonContent}
                                      onChange={(e) => setNewLessonContent(e.target.value)}
                                      placeholder="Optional plain text fallback"
                                      className="min-h-[120px]"
                                    />
                                  </div>
                                </div>

                                <DialogFooter>
                                  <Button
                                    onClick={() => void addLesson()}
                                    disabled={!newLessonTitle.trim() || !newLessonModuleId}
                                  >
                                    Create
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                const ok = window.confirm("Delete this module? Lessons inside will also be removed by Firestore delete rules.");
                                if (!ok) return;
                                void deleteModule(m.id);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>

                        {m.data.content && (
                          <>
                            <Separator className="my-4" />
                            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{m.data.content}</div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Final Exam</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">Final exam is strict: 25 questions, 80% pass mark, 3 attempts.</div>
                {courseId && (
                  <Button asChild variant="outline">
                    <Link to={`/instructors/courses/${courseId}/final/questions`}>Manage final questions</Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <CardTitle>Resources</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">Add resource</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>New resource</DialogTitle>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">Title</div>
                          <Input value={newResourceTitle} onChange={(e) => setNewResourceTitle(e.target.value)} placeholder="Resource title" />
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">Description</div>
                          <Textarea
                            value={newResourceDescription}
                            onChange={(e) => setNewResourceDescription(e.target.value)}
                            placeholder="Short description"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">URL</div>
                          <Input value={newResourceUrl} onChange={(e) => setNewResourceUrl(e.target.value)} placeholder="https://" />
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">Content</div>
                          <Textarea
                            value={newResourceContent}
                            onChange={(e) => setNewResourceContent(e.target.value)}
                            placeholder="Write the resource content students will read inside the course"
                            className="min-h-[180px]"
                          />
                        </div>
                      </div>

                      <DialogFooter>
                        <Button onClick={() => void addResource()} disabled={!newResourceTitle.trim()}>
                          Create
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {resources.length === 0 && <div className="text-sm text-muted-foreground">No resources yet.</div>}
                {resources.length > 0 && (
                  <div className="space-y-3">
                    {resources.map((r) => (
                      <div key={r.id} className="rounded-lg border border-border p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate">{r.data.title ?? "Resource"}</div>
                            {r.data.description && (
                              <div className="text-sm text-muted-foreground mt-1">{r.data.description}</div>
                            )}
                            {r.data.url && (
                              <div className="text-sm mt-2">
                                <a className="text-primary hover:underline break-all" href={r.data.url} target="_blank" rel="noreferrer">
                                  {r.data.url}
                                </a>
                              </div>
                            )}
                            {r.data.content && (
                              <>
                                <Separator className="my-4" />
                                <div className="text-sm text-muted-foreground whitespace-pre-wrap">{r.data.content}</div>
                              </>
                            )}
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              const ok = window.confirm("Delete this resource?");
                              if (!ok) return;
                              void deleteResource(r.id);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
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
