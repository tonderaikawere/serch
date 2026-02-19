import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { firestore } from "@/lib/firebase";

type CourseRow = {
  id: string;
  title: string | null;
  description: string | null;
  published: boolean | null;
  updatedAt?: unknown;
  modulesCount?: number;
  resourcesCount?: number;
};

export default function InstructorCourses() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseRow[]>([]);

  const [seeding, setSeeding] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [seedProgress, setSeedProgress] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const snap = await getDocs(query(collection(firestore, "courses"), orderBy("updatedAt", "desc")));
        const next: CourseRow[] = await Promise.all(
          snap.docs.map(async (d) => {
            const data = d.data() as { title?: string; description?: string; published?: boolean; updatedAt?: unknown };
            const [modulesSnap, resourcesSnap] = await Promise.all([
              getDocs(collection(firestore, "courses", d.id, "modules")),
              getDocs(collection(firestore, "courses", d.id, "resources")),
            ]);
            return {
              id: d.id,
              title: data.title ?? null,
              description: data.description ?? null,
              published: typeof data.published === "boolean" ? data.published : null,
              updatedAt: data.updatedAt,
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

  async function createCourse() {
    const title = newTitle.trim();
    if (!title) return;
    const created = await addDoc(collection(firestore, "courses"), {
      title,
      description: newDescription.trim(),
      published: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setCourses((prev) => [
      {
        id: created.id,
        title,
        description: newDescription.trim(),
        published: false,
      },
      ...prev,
    ]);
    setNewTitle("");
    setNewDescription("");
  }

  async function deleteCourse(courseId: string) {
    await deleteDoc(doc(firestore, "courses", courseId));
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
  }

  type SeedCourse = {
    seedKey: string;
    order: number;
    title: string;
    description: string;
    moduleTheme: string;
    resources: Array<{ title: string; description: string; url: string }>;
  };

  const seedCourseMap: Record<string, Omit<SeedCourse, "description" | "resources"> & { description: string; resources: SeedCourse["resources"] }> = {
    "seo-foundations": {
      seedKey: "seo-foundations",
      order: 1,
      title: "SEO Foundations",
      description: "Core search concepts: crawling, indexing, ranking, and quality signals.",
      moduleTheme: "Foundations",
      resources: [
        {
          title: "Search Essentials",
          description: "Official documentation overview.",
          url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide",
        },
        {
          title: "Crawling & Indexing",
          description: "Overview of how indexing happens.",
          url: "https://developers.google.com/search/docs/crawling-indexing/overview",
        },
      ],
    },
    "keyword-intent": {
      seedKey: "keyword-intent",
      order: 2,
      title: "Keyword Research & Intent",
      description: "Build keyword maps and intent-driven content plans.",
      moduleTheme: "Keywords",
      resources: [
        {
          title: "Search quality rater guidelines",
          description: "Use as a mental model for quality.",
          url: "https://developers.google.com/search/blog/2022/07/quality-rater-guidelines-update",
        },
      ],
    },
    "onpage-content": {
      seedKey: "onpage-content",
      order: 3,
      title: "On-Page SEO & Content Structure",
      description: "Write and structure content for humans and machines.",
      moduleTheme: "On-Page",
      resources: [
        {
          title: "Create helpful content",
          description: "Guidance on helpful content.",
          url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
        },
      ],
    },
    "technical-seo": {
      seedKey: "technical-seo",
      order: 4,
      title: "Technical SEO",
      description: "Make your site crawlable, fast, indexable, and stable.",
      moduleTheme: "Technical",
      resources: [
        {
          title: "Technical SEO basics",
          description: "Crawling/indexing guidance.",
          url: "https://developers.google.com/search/docs/crawling-indexing",
        },
      ],
    },
    "metadata-serp": {
      seedKey: "metadata-serp",
      order: 5,
      title: "Metadata & SERP Optimization",
      description: "Titles, descriptions, canonicals, and SERP preview best practices.",
      moduleTheme: "Metadata",
      resources: [
        {
          title: "Control your snippets",
          description: "Snippet and meta guidance.",
          url: "https://developers.google.com/search/docs/appearance/snippet",
        },
      ],
    },
    "schema-entities": {
      seedKey: "schema-entities",
      order: 6,
      title: "Schema & Entities",
      description: "Structured data and entity understanding.",
      moduleTheme: "Schema",
      resources: [
        {
          title: "Structured data documentation",
          description: "Schema docs.",
          url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
        },
      ],
    },
    "aeo-fundamentals": {
      seedKey: "aeo-fundamentals",
      order: 7,
      title: "AEO Fundamentals",
      description: "Answer Engine Optimization: create content that AI can extract reliably.",
      moduleTheme: "AEO",
      resources: [
        {
          title: "Helpful content for AI extraction",
          description: "Practical writing guidance.",
          url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
        },
      ],
    },
    "seo-aeo-capstone": {
      seedKey: "seo-aeo-capstone",
      order: 8,
      title: "SEO + AEO Capstone",
      description: "Combine SEO and AEO into a single publish-ready page and strategy.",
      moduleTheme: "Capstone",
      resources: [
        {
          title: "Search appearance overview",
          description: "How results can appear.",
          url: "https://developers.google.com/search/docs/appearance",
        },
      ],
    },
  };

  function makeQuestionBank(topic: string, n: number) {
    return Array.from({ length: n }).map((_, i) => {
      const prompt = `${topic}: Question ${i + 1}`;
      const choices = [
        "Option A",
        "Option B",
        "Option C",
        "Option D",
      ];
      return { prompt, choices, correctIndex: 0 };
    });
  }

  function makeLessonsForModule(courseTitle: string, moduleTitle: string) {
    const lessons = Array.from({ length: 10 }).map((_, i) => {
      const n = i + 1;
      return {
        type: "lesson" as const,
        order: n,
        title: `${moduleTitle} - Lesson ${n}`,
        content: `Course: ${courseTitle}\nModule: ${moduleTitle}\n\nLesson ${n} content.`,
      };
    });

    const exercise = {
      type: "exercise" as const,
      order: 11,
      title: `${moduleTitle} - Exercise`,
      content: `Course: ${courseTitle}\nModule: ${moduleTitle}\n\nComplete the exercise for this module.`,
    };

    return [...lessons, exercise];
  }

  async function upgradeSeededCourses() {
    const ok = window.confirm(
      "This will backfill existing seeded courses to 20 modules, add lessons/exercises, and ensure question banks exist. Continue?",
    );
    if (!ok) return;

    setUpgrading(true);
    setSeedProgress("Finding seeded courses…");
    try {
      const coursesSnap = await getDocs(collection(firestore, "courses"));
      const seeded = coursesSnap.docs
        .map((d) => ({ id: d.id, data: d.data() as { seedKey?: string; title?: string; order?: number } }))
        .filter((c) => typeof c.data.seedKey === "string" && c.data.seedKey.length > 0);

      if (seeded.length === 0) {
        setSeedProgress("No seeded courses found.");
        return;
      }

      for (let idx = 0; idx < seeded.length; idx += 1) {
        const c = seeded[idx];
        const seedKey = c.data.seedKey as string;
        const meta = seedCourseMap[seedKey];
        const courseTitle = meta?.title ?? c.data.title ?? "Course";
        const moduleTheme = meta?.moduleTheme ?? "Module";

        setSeedProgress(`Upgrading ${idx + 1}/${seeded.length}: ${courseTitle}`);

        let batch = writeBatch(firestore);
        let ops = 0;
        const commitIfNeeded = async () => {
          if (ops === 0) return;
          await batch.commit();
          batch = writeBatch(firestore);
          ops = 0;
        };

        if (meta && typeof c.data.order !== "number") {
          batch.set(doc(firestore, "courses", c.id), { order: meta.order, updatedAt: serverTimestamp() }, { merge: true });
          ops += 1;
        }

        const modulesRef = collection(firestore, "courses", c.id, "modules");
        let modulesSnap;
        try {
          modulesSnap = await getDocs(query(modulesRef, orderBy("order", "asc")));
        } catch {
          modulesSnap = await getDocs(modulesRef);
        }

        const existingByOrder = new Map<number, { id: string; title: string | null }>();
        for (const d of modulesSnap.docs) {
          const data = d.data() as { order?: number; title?: string };
          if (typeof data.order === "number") existingByOrder.set(data.order, { id: d.id, title: data.title ?? null });
        }

        for (let m = 1; m <= 20; m += 1) {
          let moduleId = existingByOrder.get(m)?.id ?? null;
          const moduleTitle = `${moduleTheme} Module ${m}`;

          if (!moduleId) {
            const moduleRef = doc(modulesRef);
            moduleId = moduleRef.id;
            batch.set(moduleRef, {
              title: moduleTitle,
              description: `Module ${m} in ${courseTitle}.`,
              order: m,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            ops += 1;
          }

          // Lessons
          const lessonsRef = collection(firestore, "courses", c.id, "modules", moduleId, "lessons");
          let lessonsSnap;
          try {
            lessonsSnap = await getDocs(query(lessonsRef, orderBy("order", "asc")));
          } catch {
            lessonsSnap = await getDocs(lessonsRef);
          }

          const existingLessonOrders = new Set<number>();
          for (const ld of lessonsSnap.docs) {
            const ldata = ld.data() as { order?: number };
            if (typeof ldata.order === "number") existingLessonOrders.add(ldata.order);
          }

          const desiredLessons = makeLessonsForModule(courseTitle, moduleTitle);
          for (const lesson of desiredLessons) {
            if (existingLessonOrders.has(lesson.order)) continue;
            const lessonRef = doc(lessonsRef);
            batch.set(lessonRef, {
              type: lesson.type,
              order: lesson.order,
              title: lesson.title,
              content: lesson.content,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            ops += 1;
            if (ops >= 450) await commitIfNeeded();
          }

          // Module question bank
          const questionsRef = collection(firestore, "courses", c.id, "modules", moduleId, "questions");
          const qSnap = await getDocs(questionsRef);
          const missing = Math.max(0, 25 - qSnap.size);
          if (missing > 0) {
            const bank = makeQuestionBank(`${courseTitle} / ${moduleTitle}`, missing);
            for (const q of bank) {
              const qRef = doc(questionsRef);
              batch.set(qRef, {
                prompt: q.prompt,
                choices: q.choices,
                correctIndex: q.correctIndex,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              ops += 1;
              if (ops >= 450) await commitIfNeeded();
            }
          }
        }

        // Final questions
        const finalRef = collection(firestore, "courses", c.id, "final", "main", "questions");
        const finalSnap = await getDocs(finalRef);
        const finalMissing = Math.max(0, 25 - finalSnap.size);
        if (finalMissing > 0) {
          const bank = makeQuestionBank(`${courseTitle} / Final`, finalMissing);
          for (const q of bank) {
            const qRef = doc(finalRef);
            batch.set(qRef, {
              prompt: q.prompt,
              choices: q.choices,
              correctIndex: q.correctIndex,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            ops += 1;
            if (ops >= 450) await commitIfNeeded();
          }
        }

        await commitIfNeeded();
      }

      setSeedProgress("Upgrade complete. Reloading…");
      const snap = await getDocs(query(collection(firestore, "courses"), orderBy("updatedAt", "desc")));
      const next: CourseRow[] = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data() as { title?: string; description?: string; published?: boolean; updatedAt?: unknown };
          const [modulesSnap, resourcesSnap] = await Promise.all([
            getDocs(collection(firestore, "courses", d.id, "modules")),
            getDocs(collection(firestore, "courses", d.id, "resources")),
          ]);
          return {
            id: d.id,
            title: data.title ?? null,
            description: data.description ?? null,
            published: typeof data.published === "boolean" ? data.published : null,
            updatedAt: data.updatedAt,
            modulesCount: modulesSnap.size,
            resourcesCount: resourcesSnap.size,
          } satisfies CourseRow;
        }),
      );
      setCourses(next);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setUpgrading(false);
      setTimeout(() => setSeedProgress(null), 5000);
    }
  }

  async function seedStarterCurriculum() {
    const ok = window.confirm(
      "This will create 8 courses (modules + resources + module question banks + final questions) in Firestore. Continue?",
    );
    if (!ok) return;

    setSeeding(true);
    setSeedProgress("Preparing…");
    try {
      const seedCourses: SeedCourse[] = [
        {
          seedKey: "seo-foundations",
          order: 1,
          title: "SEO Foundations",
          description: "Core search concepts: crawling, indexing, ranking, and quality signals.",
          moduleTheme: "Foundations",
          resources: [
            {
              title: "Search Essentials",
              description: "Official documentation overview.",
              url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide",
            },
            {
              title: "Crawling & Indexing",
              description: "Overview of how indexing happens.",
              url: "https://developers.google.com/search/docs/crawling-indexing/overview",
            },
          ],
        },
        {
          seedKey: "keyword-intent",
          order: 2,
          title: "Keyword Research & Intent",
          description: "Build keyword maps and intent-driven content plans.",
          moduleTheme: "Keywords",
          resources: [
            {
              title: "Search quality rater guidelines",
              description: "Use as a mental model for quality.",
              url: "https://developers.google.com/search/blog/2022/07/quality-rater-guidelines-update",
            },
          ],
        },
        {
          seedKey: "onpage-content",
          order: 3,
          title: "On-Page SEO & Content Structure",
          description: "Write and structure content for humans and machines.",
          moduleTheme: "On-Page",
          resources: [
            {
              title: "Create helpful content",
              description: "Guidance on helpful content.",
              url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
            },
          ],
        },
        {
          seedKey: "technical-seo",
          order: 4,
          title: "Technical SEO",
          description: "Make your site crawlable, fast, indexable, and stable.",
          moduleTheme: "Technical",
          resources: [
            {
              title: "Technical SEO basics",
              description: "Crawling/indexing guidance.",
              url: "https://developers.google.com/search/docs/crawling-indexing",
            },
          ],
        },
        {
          seedKey: "metadata-serp",
          order: 5,
          title: "Metadata & SERP Optimization",
          description: "Titles, descriptions, canonicals, and SERP preview best practices.",
          moduleTheme: "Metadata",
          resources: [
            {
              title: "Control your snippets",
              description: "Snippet and meta guidance.",
              url: "https://developers.google.com/search/docs/appearance/snippet",
            },
          ],
        },
        {
          seedKey: "schema-entities",
          order: 6,
          title: "Schema & Entities",
          description: "Structured data and entity understanding.",
          moduleTheme: "Schema",
          resources: [
            {
              title: "Structured data documentation",
              description: "Schema docs.",
              url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
            },
          ],
        },
        {
          seedKey: "aeo-fundamentals",
          order: 7,
          title: "AEO Fundamentals",
          description: "Answer Engine Optimization: create content that AI can extract reliably.",
          moduleTheme: "AEO",
          resources: [
            {
              title: "Helpful content for AI extraction",
              description: "Practical writing guidance.",
              url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
            },
          ],
        },
        {
          seedKey: "seo-aeo-capstone",
          order: 8,
          title: "SEO + AEO Capstone",
          description: "Combine SEO and AEO into a single publish-ready page and strategy.",
          moduleTheme: "Capstone",
          resources: [
            {
              title: "Search appearance overview",
              description: "How results can appear.",
              url: "https://developers.google.com/search/docs/appearance",
            },
          ],
        },
      ];

      const existingSnap = await getDocs(collection(firestore, "courses"));
      const existingSeedKeys = new Set(
        existingSnap.docs
          .map((d) => (d.data() as { seedKey?: string }).seedKey)
          .filter((x): x is string => typeof x === "string" && x.length > 0),
      );

      const toCreate = seedCourses.filter((c) => !existingSeedKeys.has(c.seedKey));
      if (toCreate.length === 0) {
        setSeedProgress("Nothing to seed (already present). ");
        return;
      }

      for (let i = 0; i < toCreate.length; i += 1) {
        const c = toCreate[i];
        setSeedProgress(`Creating course ${i + 1}/${toCreate.length}: ${c.title}`);

        const courseRef = doc(collection(firestore, "courses"));
        const courseId = courseRef.id;

        await setDoc(courseRef, {
          seedKey: c.seedKey,
          order: c.order,
          title: c.title,
          description: c.description,
          published: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Write modules/lessons/resources/questions in batches (<= 500 ops each)
        let batch = writeBatch(firestore);
        let ops = 0;

        const commitIfNeeded = async () => {
          if (ops === 0) return;
          await batch.commit();
          batch = writeBatch(firestore);
          ops = 0;
        };

        for (let m = 0; m < 20; m += 1) {
          const moduleTitle = `${c.moduleTheme} Module ${m + 1}`;
          const moduleDescription = `Module ${m + 1} in ${c.title}.`;
          const moduleRef = doc(collection(firestore, "courses", courseId, "modules"));
          batch.set(moduleRef, {
            title: moduleTitle,
            description: moduleDescription,
            order: m + 1,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          ops += 1;

          const lessons = makeLessonsForModule(c.title, moduleTitle);
          for (const lesson of lessons) {
            const lessonRef = doc(collection(firestore, "courses", courseId, "modules", moduleRef.id, "lessons"));
            batch.set(lessonRef, {
              type: lesson.type,
              order: lesson.order,
              title: lesson.title,
              content: lesson.content,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            ops += 1;
            if (ops >= 450) await commitIfNeeded();
          }

          const bank = makeQuestionBank(`${c.title} / ${moduleTitle}`, 25);
          for (const q of bank) {
            const qRef = doc(collection(firestore, "courses", courseId, "modules", moduleRef.id, "questions"));
            batch.set(qRef, {
              prompt: q.prompt,
              choices: q.choices,
              correctIndex: q.correctIndex,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            ops += 1;
            if (ops >= 450) await commitIfNeeded();
          }
        }

        for (const r of c.resources) {
          const rRef = doc(collection(firestore, "courses", courseId, "resources"));
          batch.set(rRef, {
            title: r.title,
            description: r.description,
            url: r.url,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          ops += 1;
          if (ops >= 450) await commitIfNeeded();
        }

        const finalBank = makeQuestionBank(`${c.title} / Final`, 25);
        for (const q of finalBank) {
          const qRef = doc(collection(firestore, "courses", courseId, "final", "main", "questions"));
          batch.set(qRef, {
            prompt: q.prompt,
            choices: q.choices,
            correctIndex: q.correctIndex,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          ops += 1;
          if (ops >= 450) await commitIfNeeded();
        }

        await commitIfNeeded();
      }

      // Reload the list
      setSeedProgress("Seeding complete. Reloading…");
      const snap = await getDocs(query(collection(firestore, "courses"), orderBy("updatedAt", "desc")));
      const next: CourseRow[] = snap.docs.map((d) => {
        const data = d.data() as { title?: string; description?: string; published?: boolean; updatedAt?: unknown };
        return {
          id: d.id,
          title: data.title ?? null,
          description: data.description ?? null,
          published: typeof data.published === "boolean" ? data.published : null,
          updatedAt: data.updatedAt,
        };
      });
      setCourses(next);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSeeding(false);
      setTimeout(() => setSeedProgress(null), 5000);
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Courses</h1>
          <p className="text-muted-foreground mt-1">Manage courses for your hub.</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle>Courses</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => void seedStarterCurriculum()} disabled={seeding}>
                  {seeding ? "Seeding…" : "Seed 8 courses"}
                </Button>
                <Button variant="outline" onClick={() => void upgradeSeededCourses()} disabled={upgrading || seeding}>
                  {upgrading ? "Upgrading…" : "Upgrade seeded courses"}
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Create course</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>New course</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Title</div>
                        <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Course title" />
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Description</div>
                        <Textarea
                          value={newDescription}
                          onChange={(e) => setNewDescription(e.target.value)}
                          placeholder="What will students learn?"
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button onClick={() => void createCourse()} disabled={!newTitle.trim()}>
                        Create
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {seedProgress && <div className="text-xs text-muted-foreground">{seedProgress}</div>}
            {loading && <div className="text-sm text-muted-foreground">Loading…</div>}

            {!loading && error && <div className="text-sm text-muted-foreground break-words">{error}</div>}

            {!loading && !error && courses.length === 0 && (
              <div className="text-sm text-muted-foreground">No courses yet.</div>
            )}

            {!loading && !error && courses.length > 0 && (
              <div className="space-y-3">
                {courses.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start justify-between gap-4 rounded-lg border border-border p-4"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate">{c.title ?? "Untitled course"}</div>
                      {c.description && <div className="text-sm text-muted-foreground mt-1">{c.description}</div>}
                      <div className="text-xs text-muted-foreground mt-2">
                        {c.published ? "Published" : "Draft"} · Modules: {typeof c.modulesCount === "number" ? c.modulesCount : "—"} · Resources:{" "}
                        {typeof c.resourcesCount === "number" ? c.resourcesCount : "—"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">ID: {c.id}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/instructors/courses/${c.id}`}>Open</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const ok = window.confirm("Delete this course? This cannot be undone.");
                          if (!ok) return;
                          void deleteCourse(c.id);
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
    </DashboardLayout>
  );
}
