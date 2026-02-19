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
      updatedAt: serverTimestamp(),
    });
    setCourse((prev) => ({
      ...(prev ?? {}),
      title: courseTitle.trim(),
      description: courseDescription.trim(),
      published,
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

    const resourcesRef = collection(firestore, "courses", courseId, "resources");
    const created = await addDoc(resourcesRef, {
      title,
      description: newResourceDescription.trim(),
      url: newResourceUrl.trim(),
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
          content: newResourceContent.trim(),
        },
      },
      ...prev,
    ]);

    setNewResourceTitle("");
    setNewResourceDescription("");
    setNewResourceUrl("");
    setNewResourceContent("");
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
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                const ok = window.confirm("Delete this module?");
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
