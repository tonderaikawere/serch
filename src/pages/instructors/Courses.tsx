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
  const [newThumbnailUrl, setNewThumbnailUrl] = useState("");
  const [newPromoVideoUrl, setNewPromoVideoUrl] = useState("");
  const [newLevel, setNewLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [newDurationHours, setNewDurationHours] = useState<number | "">("");
  const [newLearnersCount, setNewLearnersCount] = useState<number | "">("");
  const [newLikesCount, setNewLikesCount] = useState<number | "">("");
  const [newCertificateEnabled, setNewCertificateEnabled] = useState(true);

  const [newCourseWizardStep, setNewCourseWizardStep] = useState<1 | 2>(1);
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);
  const [importJson, setImportJson] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const moduleTitlesBySeedKey: Record<string, string[]> = {
    "seo-foundations": [
      "How Search Works",
      "Crawling & Discovery",
      "Indexing & Rendering",
      "Ranking Signals",
      "Search Intent Basics",
      "Site Architecture",
      "Internal Linking",
      "Content Quality & Trust",
      "Duplicate Content",
      "Thin Content Fixes",
      "International & Local Basics",
      "SERP Features Overview",
      "Sitemaps",
      "Robots & Meta Robots",
      "Canonical Basics",
      "Basic Analytics Reading",
      "SEO Workflow & QA",
      "Prioritization Framework",
      "Reporting for Stakeholders",
      "Foundations Review",
    ],
    "keyword-intent": [
      "Seed Keywords & Research Sources",
      "Query Types & Intent",
      "Keyword Difficulty (Practical)",
      "Topic Clusters",
      "Mapping Keywords to Pages",
      "Commercial vs Informational",
      "Competitor Gap Analysis",
      "SERP Analysis",
      "Long-tail Strategy",
      "Entity + Keyword Blending",
      "Content Brief Template",
      "Prioritizing Opportunities",
      "Tracking Keywords",
      "Avoiding Cannibalization",
      "Refresh vs Create",
      "Seasonality",
      "Local Keyword Research",
      "International Keywords",
      "Keyword Reporting",
      "Keyword Review",
    ],
    "onpage-content": [
      "Headings (H1-H6) Done Right",
      "Opening Paragraph (Direct Answer)",
      "Paragraph Structure & Readability",
      "Internal Links that Convert",
      "Image Alt Text",
      "FAQ Sections",
      "Content Updates & Refresh",
      "Topical Authority",
      "E-E-A-T Signals On-page",
      "Conversion Copy Basics",
      "Content Templates",
      "Avoiding Fluff",
      "Linking to Sources",
      "Content QA Checklist",
      "Snippet Optimization",
      "Featured Snippets",
      "People Also Ask",
      "Content Pruning",
      "Publishing Workflow",
      "On-page Review",
    ],
    "technical-seo": [
      "HTTP Status Codes",
      "Robots.txt",
      "Noindex & Meta Robots",
      "Canonical Tags",
      "XML Sitemaps",
      "Redirects (301/302)",
      "Crawl Budget",
      "Core Web Vitals",
      "Image Optimization",
      "JavaScript SEO Basics",
      "Pagination",
      "Faceted Navigation",
      "Duplicate URL Patterns",
      "Mobile-first Indexing",
      "HTTPS & Security",
      "Structured Data Validation",
      "Log File Thinking (Conceptual)",
      "Technical QA Process",
      "Issue Prioritization",
      "Technical Review",
    ],
    "metadata-serp": [
      "Title Tag Strategy",
      "Meta Description Strategy",
      "Slug / URL Best Practices",
      "Indexing Controls",
      "Canonical Strategy",
      "OpenGraph Basics",
      "Twitter Cards",
      "Template Systems",
      "SERP Testing",
      "CTR Improvement",
      "Avoiding Over-optimization",
      "Brand vs Keyword",
      "Page Type Templates",
      "Pagination Metadata",
      "Duplicate Metadata Fix",
      "Hreflang Basics",
      "Snippet Control",
      "Schema + Snippet Synergy",
      "Metadata QA",
      "Metadata Review",
    ],
    "schema-entities": [
      "Why Schema Matters",
      "Organization Schema",
      "Article Schema",
      "FAQ Schema",
      "Product Schema",
      "Breadcrumb Schema",
      "LocalBusiness Schema",
      "Entity Basics",
      "Entity Relationships",
      "Knowledge Panels",
      "Schema Testing Tools",
      "Avoiding Schema Spam",
      "Linking Entities On-page",
      "Citations & References",
      "SameAs Strategy",
      "Author Entities",
      "Content-to-Entity Mapping",
      "Structured Data QA",
      "Schema Maintenance",
      "Schema Review",
    ],
    "aeo-fundamentals": [
      "What is AEO?",
      "Answer-first Writing",
      "Definitions & Glossaries",
      "Bullets, Tables, Lists",
      "FAQ Patterns",
      "Entity-based Answers",
      "Sources & Citations",
      "Avoiding Hallucinations",
      "Snippets & Extraction",
      "Context Windows",
      "Conversation Queries",
      "Comparisons",
      "How-to Content",
      "Tool/Checklist Content",
      "Measuring AEO",
      "AEO + SEO Alignment",
      "Optimizing Existing Pages",
      "AEO QA",
      "AEO Publishing",
      "AEO Review",
    ],
    "seo-aeo-capstone": [
      "Choose a Capstone Topic",
      "Keyword Map + Entity Map",
      "Outline + Information Architecture",
      "Draft: Answer-first Intro",
      "Draft: Helpful Sections",
      "Add FAQs + Schema",
      "Internal Links Plan",
      "Metadata Finalization",
      "Technical QA",
      "Proof & Trust Signals",
      "Publish Checklist",
      "Measure Results",
      "Iterate based on Data",
      "Create a Case Study",
      "Portfolio Packaging",
      "Stakeholder Summary",
      "Capstone Review",
      "Final Exam Prep",
      "Final Exam",
      "Graduation",
    ],
  };

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
      thumbnailUrl: newThumbnailUrl.trim(),
      promoVideoUrl: newPromoVideoUrl.trim(),
      level: newLevel,
      durationHours: typeof newDurationHours === "number" ? newDurationHours : null,
      learnersCount: typeof newLearnersCount === "number" ? newLearnersCount : null,
      likesCount: typeof newLikesCount === "number" ? newLikesCount : null,
      certificateEnabled: newCertificateEnabled,
      published: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setCreatedCourseId(created.id);
    setNewCourseWizardStep(2);

    setCourses((prev) => [
      {
        id: created.id,
        title,
        description: newDescription.trim(),
        published: false,
      },
      ...prev,
    ]);
  }

  type ImportedLesson = {
    title: string;
    order?: number;
    type?: "lesson" | "exercise";
    content?: string;
    blocks?: LessonBlock[];
  };

  type ImportedModule = {
    title: string;
    description?: string;
    order?: number;
    lessons?: ImportedLesson[];
    questions?: Array<{ prompt: string; choices: string[]; correctIndex: number }>;
  };

  type ImportedResource = {
    title: string;
    description?: string;
    url?: string;
    content?: string;
    blocks?: LessonBlock[];
  };

  type ImportedCourseJson = {
    course?: {
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
    modules?: ImportedModule[];
    resources?: ImportedResource[];
    finalQuestions?: Array<{ prompt: string; choices: string[]; correctIndex: number }>;
  };

  async function importCourseJsonToFirestore(courseId: string, rawJson: string) {
    const text = rawJson.trim();
    if (!text) return;

    let parsed: ImportedCourseJson;
    try {
      parsed = JSON.parse(text) as ImportedCourseJson;
    } catch (e) {
      throw new Error("Invalid JSON.");
    }

    // Course doc update (merge)
    const coursePatch = parsed.course ?? {};
    await setDoc(
      doc(firestore, "courses", courseId),
      {
        ...coursePatch,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    let batch = writeBatch(firestore);
    let ops = 0;
    const commitIfNeeded = async () => {
      if (ops === 0) return;
      await batch.commit();
      batch = writeBatch(firestore);
      ops = 0;
    };

    const modules = Array.isArray(parsed.modules) ? parsed.modules : [];
    for (let mi = 0; mi < modules.length; mi += 1) {
      const m = modules[mi];
      const moduleRef = doc(collection(firestore, "courses", courseId, "modules"));
      batch.set(moduleRef, {
        title: m.title,
        description: m.description ?? "",
        order: typeof m.order === "number" ? m.order : mi + 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      ops += 1;
      if (ops >= 450) await commitIfNeeded();

      const lessons = Array.isArray(m.lessons) ? m.lessons : [];
      for (let li = 0; li < lessons.length; li += 1) {
        const l = lessons[li];
        const lessonRef = doc(collection(firestore, "courses", courseId, "modules", moduleRef.id, "lessons"));
        batch.set(lessonRef, {
          title: l.title,
          order: typeof l.order === "number" ? l.order : li + 1,
          type: l.type ?? "lesson",
          blocks: Array.isArray(l.blocks) ? l.blocks : null,
          content: l.content ?? "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        ops += 1;
        if (ops >= 450) await commitIfNeeded();
      }

      const questions = Array.isArray(m.questions) ? m.questions : [];
      for (const q of questions) {
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

    const resources = Array.isArray(parsed.resources) ? parsed.resources : [];
    for (const r of resources) {
      const rRef = doc(collection(firestore, "courses", courseId, "resources"));
      batch.set(rRef, {
        title: r.title,
        description: r.description ?? "",
        url: r.url ?? "",
        blocks: Array.isArray(r.blocks) ? r.blocks : null,
        content: r.content ?? "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      ops += 1;
      if (ops >= 450) await commitIfNeeded();
    }

    const finalQuestions = Array.isArray(parsed.finalQuestions) ? parsed.finalQuestions : [];
    for (const q of finalQuestions) {
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

  function resetNewCourseWizard() {
    setNewCourseWizardStep(1);
    setCreatedCourseId(null);
    setImportJson("");
    setImportError(null);
    setImporting(false);
    setNewTitle("");
    setNewDescription("");
    setNewThumbnailUrl("");
    setNewPromoVideoUrl("");
    setNewLevel("beginner");
    setNewDurationHours("");
    setNewLearnersCount("");
    setNewLikesCount("");
    setNewCertificateEnabled(true);
  }

  async function deleteCourse(courseId: string) {
    await deleteDoc(doc(firestore, "courses", courseId));
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
  }

  async function backfillFirstTwoCourseMedia() {
    const ok = window.confirm("This will set course card images + promo videos for the first two seeded courses (SEO Foundations and Keyword Research). Continue?");
    if (!ok) return;

    setUpgrading(true);
    setSeedProgress("Backfilling media for first two courses…");
    try {
      const snap = await getDocs(collection(firestore, "courses"));
      const seeded = snap.docs.map((d) => ({ id: d.id, data: d.data() as { seedKey?: string } }));

      const targets = ["seo-foundations", "keyword-intent"] as const;
      for (const seedKey of targets) {
        const row = seeded.find((c) => c.data.seedKey === seedKey) ?? null;
        const meta = seedCourseMap[seedKey];
        if (!row || !meta) continue;
        await setDoc(
          doc(firestore, "courses", row.id),
          {
            thumbnailUrl: meta.thumbnailUrl ?? null,
            promoVideoUrl: meta.promoVideoUrl ?? null,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      setSeedProgress("Media backfill complete.");
    } catch {
      setSeedProgress("Media backfill failed.");
    } finally {
      setUpgrading(false);
    }
  }

  async function backfillSeededCourseVideos() {
    const ok = window.confirm(
      "This will update ALL seeded courses to use the latest promo video URLs and will rewrite lesson/resource video blocks to match. Continue?",
    );
    if (!ok) return;

    setUpgrading(true);
    setSeedProgress("Backfilling seeded course videos…");
    try {
      const snap = await getDocs(collection(firestore, "courses"));
      const seeded = snap.docs.map((d) => ({ id: d.id, data: d.data() as { seedKey?: string } }));
      const targets = seeded
        .map((c) => ({ courseId: c.id, seedKey: c.data.seedKey ?? null }))
        .filter((c): c is { courseId: string; seedKey: string } => typeof c.seedKey === "string" && c.seedKey.length > 0)
        .filter((c) => Boolean(seedCourseMap[c.seedKey]));

      for (let idx = 0; idx < targets.length; idx += 1) {
        const t = targets[idx];
        const meta = seedCourseMap[t.seedKey];
        if (!meta) continue;

        setSeedProgress(`Backfilling videos ${idx + 1}/${targets.length}: ${meta.title}`);

        let batch = writeBatch(firestore);
        let ops = 0;
        const commitIfNeeded = async () => {
          if (ops === 0) return;
          await batch.commit();
          batch = writeBatch(firestore);
          ops = 0;
        };

        batch.set(
          doc(firestore, "courses", t.courseId),
          {
            promoVideoUrl: meta.promoVideoUrl ?? null,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        ops += 1;

        const modulesRef = collection(firestore, "courses", t.courseId, "modules");
        const modulesSnap = await getDocs(modulesRef);
        for (const m of modulesSnap.docs) {
          const lessonsRef = collection(firestore, "courses", t.courseId, "modules", m.id, "lessons");
          const lessonsSnap = await getDocs(lessonsRef);
          for (const l of lessonsSnap.docs) {
            const ldata = l.data() as { blocks?: LessonBlock[] };
            const blocks = Array.isArray(ldata.blocks) ? ldata.blocks : [];
            if (blocks.length === 0) continue;
            const nextBlocks = blocks.map((b) => {
              if (!b || typeof b !== "object" || !("type" in b)) return b;
              if (b.type !== "video") return b;
              return { ...b, url: meta.promoVideoUrl ?? b.url };
            });
            batch.set(doc(lessonsRef, l.id), { blocks: nextBlocks, updatedAt: serverTimestamp() }, { merge: true });
            ops += 1;
            if (ops >= 450) await commitIfNeeded();
          }
        }

        const resourcesRef = collection(firestore, "courses", t.courseId, "resources");
        const resourcesSnap = await getDocs(resourcesRef);
        for (const r of resourcesSnap.docs) {
          const rdata = r.data() as { blocks?: LessonBlock[] };
          const blocks = Array.isArray(rdata.blocks) ? rdata.blocks : [];
          if (blocks.length === 0) continue;
          const nextBlocks = blocks.map((b) => {
            if (!b || typeof b !== "object" || !("type" in b)) return b;
            if (b.type !== "video") return b;
            return { ...b, url: meta.promoVideoUrl ?? b.url };
          });
          batch.set(doc(resourcesRef, r.id), { blocks: nextBlocks, updatedAt: serverTimestamp() }, { merge: true });
          ops += 1;
          if (ops >= 450) await commitIfNeeded();
        }

        await commitIfNeeded();
      }

      setSeedProgress("Video backfill complete.");
    } catch {
      setSeedProgress("Video backfill failed.");
    } finally {
      setUpgrading(false);
    }
  }

  async function rewriteSeededLessonContentDetailed() {
    const ok = window.confirm(
      "This will OVERWRITE lesson titles/content/blocks for ALL seeded courses using the latest detailed curriculum template. Continue?",
    );
    if (!ok) return;

    setUpgrading(true);
    setSeedProgress("Rewriting seeded lesson content…");
    try {
      const snap = await getDocs(collection(firestore, "courses"));
      const seeded = snap.docs
        .map((d) => ({ id: d.id, data: d.data() as { seedKey?: string; title?: string } }))
        .filter((c) => typeof c.data.seedKey === "string" && c.data.seedKey.length > 0);

      const targets = seeded
        .map((c) => ({ courseId: c.id, seedKey: c.data.seedKey as string, fallbackTitle: c.data.title ?? "Course" }))
        .filter((c) => Boolean(seedCourseMap[c.seedKey]));

      for (let idx = 0; idx < targets.length; idx += 1) {
        const t = targets[idx];
        const meta = seedCourseMap[t.seedKey];
        const courseTitle = meta?.title ?? t.fallbackTitle;
        const moduleTheme = meta?.moduleTheme ?? "Module";

        setSeedProgress(`Rewriting ${idx + 1}/${targets.length}: ${courseTitle}`);

        const modulesRef = collection(firestore, "courses", t.courseId, "modules");
        let modulesSnap;
        try {
          modulesSnap = await getDocs(query(modulesRef, orderBy("order", "asc")));
        } catch {
          modulesSnap = await getDocs(modulesRef);
        }

        for (const m of modulesSnap.docs) {
          const mdata = m.data() as { title?: string; order?: number };
          const moduleOrder = typeof mdata.order === "number" ? mdata.order : null;
          const plannedTitle = moduleOrder ? moduleTitlesBySeedKey[t.seedKey]?.[moduleOrder - 1] : null;
          const moduleTitle = plannedTitle ?? mdata.title ?? `${moduleTheme} Module`;

          const desired = makeLessonsForModule(courseTitle, moduleTitle, {
            heroVideoUrl: meta?.promoVideoUrl ?? null,
            heroImageUrl: meta?.thumbnailUrl ?? null,
          });

          const lessonsRef = collection(firestore, "courses", t.courseId, "modules", m.id, "lessons");
          let lessonsSnap;
          try {
            lessonsSnap = await getDocs(query(lessonsRef, orderBy("order", "asc")));
          } catch {
            lessonsSnap = await getDocs(lessonsRef);
          }

          const existingByOrder = new Map<number, { id: string }>();
          for (const l of lessonsSnap.docs) {
            const ldata = l.data() as { order?: number };
            if (typeof ldata.order === "number") existingByOrder.set(ldata.order, { id: l.id });
          }

          let batch = writeBatch(firestore);
          let ops = 0;
          const commitIfNeeded = async () => {
            if (ops === 0) return;
            await batch.commit();
            batch = writeBatch(firestore);
            ops = 0;
          };

          for (const lesson of desired) {
            const existing = existingByOrder.get(lesson.order) ?? null;
            const targetRef = existing ? doc(lessonsRef, existing.id) : doc(lessonsRef);
            batch.set(
              targetRef,
              {
                type: lesson.type,
                order: lesson.order,
                title: lesson.title,
                blocks: lesson.blocks ?? null,
                content: lesson.content,
                updatedAt: serverTimestamp(),
              },
              { merge: true },
            );
            ops += 1;
            if (ops >= 450) await commitIfNeeded();
          }

          await commitIfNeeded();
        }

        await setDoc(doc(firestore, "courses", t.courseId), { updatedAt: serverTimestamp() }, { merge: true });
      }

      setSeedProgress("Rewrite complete.");
    } catch {
      setSeedProgress("Rewrite failed.");
    } finally {
      setUpgrading(false);
      setTimeout(() => setSeedProgress(null), 5000);
    }
  }

  type SeedCourse = {
    seedKey: string;
    order: number;
    title: string;
    description: string;
    moduleTheme: string;
    thumbnailUrl?: string;
    promoVideoUrl?: string;
    level?: "beginner" | "intermediate" | "advanced";
    durationHours?: number;
    learnersCount?: number;
    likesCount?: number;
    certificateEnabled?: boolean;
    resources: Array<{ title: string; description: string; url: string; content: string }>;
  };

  type LessonBlock =
    | { type: "text"; markdown: string }
    | { type: "image"; url: string; caption?: string }
    | { type: "video"; url: string; title?: string }
    | { type: "link"; url: string; title?: string; description?: string }
    | { type: "divider" };

  const seedCourseMap: Record<string, Omit<SeedCourse, "description" | "resources"> & { description: string; resources: SeedCourse["resources"] }> = {
    "seo-foundations": {
      seedKey: "seo-foundations",
      order: 1,
      title: "SEO Foundations",
      description: "Core search concepts: crawling, indexing, ranking, and quality signals.",
      moduleTheme: "Foundations",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1556155092-490a1ba16284?auto=format&fit=crop&w=1200&q=80",
      promoVideoUrl: "https://www.youtube.com/watch?v=jwgnwtQcSWQ",
      resources: [
        {
          title: "Search Essentials",
          description: "Official documentation overview.",
          url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide",
          content:
            "Learning goal: understand what SEO is and how search engines work.\n\nKey ideas:\n- Crawling: discovery via links and sitemaps\n- Indexing: processing content into a searchable database\n- Ranking: ordering results by relevance + quality\n\nPractical checklist:\n1) Make sure pages are reachable via internal links\n2) Use clear titles and headings\n3) Provide helpful content that matches search intent\n4) Avoid thin/duplicate pages\n\nMini exercise:\nWrite a 1-paragraph summary explaining crawling vs indexing in your own words.",
        },
        {
          title: "Crawling & Indexing",
          description: "Overview of how indexing happens.",
          url: "https://developers.google.com/search/docs/crawling-indexing/overview",
          content:
            "Learning goal: understand how search engines discover and process content.\n\nKey concepts:\n- Crawling: following links to discover new content\n- Indexing: processing content into a searchable database\n- Rendering: executing JavaScript to see the final page\n\nPractical checklist:\n1) Ensure pages are crawlable\n2) Optimize images and videos\n3) Use schema markup for entities\n\nMini exercise:\nList 3 ways to improve crawling and indexing for a new page.",
        },
      ],
    },
    "keyword-intent": {
      seedKey: "keyword-intent",
      order: 2,
      title: "Keyword Research & Intent",
      description: "Build keyword maps and intent-driven content plans.",
      moduleTheme: "Keywords",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
      promoVideoUrl: "https://www.youtube.com/watch?v=gEWkYTPSEjs",
      resources: [
        {
          title: "Search quality rater guidelines",
          description: "Use as a mental model for quality.",
          url: "https://static.googleusercontent.com/media/guidelines.raterhub.com/en//searchqualityevaluatorguidelines.pdf",
          content:
            "Learning goal: understand what high-quality content looks like.\n\nFocus areas:\n- E-E-A-T: experience, expertise, authoritativeness, trust\n- Purpose: pages should have a helpful purpose\n- Main content quality: depth, accuracy, and clarity\n\nPractical checklist:\n1) Add clear author/brand signals\n2) Cite sources where appropriate\n3) Match the query intent (informational vs transactional)\n\nMini exercise:\nPick a page you own and list 3 improvements to increase trust.",
        },
      ],
    },
    "onpage-content": {
      seedKey: "onpage-content",
      order: 3,
      title: "On-Page SEO & Content Structure",
      description: "Write and structure content for humans and machines.",
      moduleTheme: "On-Page",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
      promoVideoUrl: "https://www.youtube.com/watch?v=bGPB-rtxt-I",
      resources: [
        {
          title: "Create helpful content",
          description: "Guidance on helpful content.",
          url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
          content:
            "Learning goal: write content that serves the user, not the algorithm.\n\nStructure template:\n1) What the user wants (intent)\n2) Answer directly (summary)\n3) Explain step-by-step\n4) Add examples\n5) Add FAQs\n\nMini exercise:\nRewrite a paragraph to be clearer, shorter, and more actionable.",
        },
        {
          title: "Content structure best practices",
          description: "Headings, paragraphs, and more.",
          url: "https://developers.google.com/search/docs/fundamentals/content-structure",
          content:
            "Learning goal: organize content for readability and accessibility.\n\nKey concepts:\n- Headings (H1-H6)\n- Paragraphs and line length\n- Images and alt text\n- Internal linking\n\nPractical checklist:\n1) Use a clear H1 heading\n2) Break up long paragraphs\n3) Add alt text to images\n\nMini exercise:\nImprove the content structure of a page you own.",
        },
      ],
    },
    "technical-seo": {
      seedKey: "technical-seo",
      order: 4,
      title: "Technical SEO",
      description: "Make your site crawlable, fast, indexable, and stable.",
      moduleTheme: "Technical",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80",
      promoVideoUrl: "https://www.youtube.com/watch?v=am4g0hXAA8Q",
      resources: [
        {
          title: "Technical SEO basics",
          description: "Crawling/indexing guidance.",
          url: "https://developers.google.com/search/docs/crawling-indexing/overview",
          content:
            "Learning goal: ensure search engines can access and understand your site.\n\nKey checks:\n- Robots.txt allows important pages\n- Pages return correct HTTP codes (200 for OK)\n- Canonical tags are consistent\n- Noindex only where required\n- Mobile-friendly and fast\n\nMini exercise:\nList 5 technical issues that could block indexing.",
        },
        {
          title: "Page speed optimization",
          description: "Improve user experience and search rankings.",
          url: "https://developers.google.com/search/docs/advanced/guidelines/page-speed",
          content:
            "Learning goal: optimize page speed for better user experience and search rankings.\n\nKey concepts:\n- PageSpeed Insights\n- Optimize images and videos\n- Minify and compress files\n- Leverage browser caching\n\nPractical checklist:\n1) Test page speed with PSI\n2) Compress images and videos\n3) Minify and compress files\n\nMini exercise:\nImprove the page speed of a slow page you own.",
        },
      ],
    },
    "metadata-serp": {
      seedKey: "metadata-serp",
      order: 5,
      title: "Metadata & SERP Optimization",
      description: "Titles, descriptions, canonicals, and SERP preview best practices.",
      moduleTheme: "Metadata",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
      promoVideoUrl: "https://www.youtube.com/watch?v=am4g0hXAA8Q",
      resources: [
        {
          title: "Control your snippets",
          description: "Snippet and meta guidance.",
          url: "https://developers.google.com/search/docs/appearance/snippet",
          content:
            "Learning goal: write strong titles and descriptions that win clicks.\n\nTitle rules:\n- Put primary keyword early\n- Be specific and truthful\n- 50–60 characters is a good target\n\nDescription rules:\n- 140–160 characters\n- Include value + proof + next step\n\nMini exercise:\nWrite 3 title + description pairs for one page targeting 3 different intents.",
        },
        {
          title: "Canonicalization and hreflang",
          description: "Dealing with duplicate content.",
          url: "https://developers.google.com/search/docs/advanced/guidelines/canonicalization",
          content:
            "Learning goal: understand how to handle duplicate content issues.\n\nKey concepts:\n- Canonical tags\n- Hreflang tags\n- 301 redirects\n\nPractical checklist:\n1) Use canonical tags for duplicates\n2) Use hreflang tags for translations\n3) Set up 301 redirects for moved pages\n\nMini exercise:\nIdentify and fix duplicate content issues on a site you own.",
        },
      ],
    },
    "schema-entities": {
      seedKey: "schema-entities",
      order: 6,
      title: "Schema & Entities",
      description: "Structured data and entity understanding.",
      moduleTheme: "Schema",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1526374870839-e155464bb9b2?auto=format&fit=crop&w=1200&q=80",
      promoVideoUrl: "https://www.youtube.com/watch?v=yTG0nbPgUss",
      resources: [
        {
          title: "Structured data documentation",
          description: "Schema docs.",
          url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
          content:
            "Learning goal: understand how schema helps search engines and AI models interpret content.\n\nCommon schema types:\n- Article\n- FAQPage\n- Product\n- Organization\n\nMini exercise:\nDraft a simple JSON-LD FAQ schema with 3 questions and answers.",
        },
        {
          title: "Entity optimization",
          description: "Improve entity understanding and search visibility.",
          url: "https://developers.google.com/search/docs/advanced/guidelines/entity-optimization",
          content:
            "Learning goal: optimize entities for better search visibility.\n\nKey concepts:\n- Entity types\n- Entity properties\n- Entity relationships\n\nPractical checklist:\n1) Identify key entities on your site\n2) Use schema markup for entities\n3) Build high-quality entity relationships\n\nMini exercise:\nImprove entity optimization for a key entity on a site you own.",
        },
      ],
    },
    "aeo-fundamentals": {
      seedKey: "aeo-fundamentals",
      order: 7,
      title: "AEO Fundamentals",
      description: "Answer Engine Optimization: create content that AI can extract reliably.",
      moduleTheme: "AEO",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80",
      promoVideoUrl: "https://www.youtube.com/watch?v=jwgnwtQcSWQ",
      resources: [
        {
          title: "Helpful content for AI extraction",
          description: "Practical writing guidance.",
          url: "https://developers.google.com/search/blog/2022/08/helpful-content-update",
          content:
            "Learning goal: create content that answer engines can extract.\n\nFormat patterns that work:\n- Direct answer first\n- Bullet lists\n- Tables for comparisons\n- Clear definitions\n\nMini exercise:\nWrite a definition + 5-bullet breakdown for a topic in your niche.",
        },
        {
          title: "AEO best practices",
          description: "Optimize content for answer engines.",
          url: "https://developers.google.com/search/docs/advanced/guidelines/aeo",
          content:
            "Learning goal: optimize content for answer engines.\n\nKey concepts:\n- Answer boxes\n- Featured snippets\n- Entity-based answers\n\nPractical checklist:\n1) Use direct answers\n2) Use bullet lists and tables\n3) Optimize for entity-based answers\n\nMini exercise:\nImprove AEO for a key page on a site you own.",
        },
      ],
    },
    "seo-aeo-capstone": {
      seedKey: "seo-aeo-capstone",
      order: 8,
      title: "SEO + AEO Capstone",
      description: "Combine SEO and AEO into a single publish-ready page and strategy.",
      moduleTheme: "Capstone",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1200&q=80",
      promoVideoUrl: "https://www.youtube.com/watch?v=bGPB-rtxt-I",
      resources: [
        {
          title: "Search appearance overview",
          description: "How results can appear.",
          url: "https://developers.google.com/search/docs/appearance/overview",
          content:
            "Learning goal: understand the different SERP features and how to optimize for them.\n\nExamples:\n- Featured snippets\n- People Also Ask\n- Rich results\n\nMini exercise:\nPick one SERP feature and write a content outline optimized for it.",
        },
        {
          title: "SEO and AEO strategy",
          description: "Combine SEO and AEO for maximum impact.",
          url: "https://developers.google.com/search/docs/advanced/guidelines/seo-aeo-strategy",
          content:
            "Learning goal: combine SEO and AEO for maximum impact.\n\nKey concepts:\n- SEO and AEO overlap\n- Content strategy\n- Technical optimization\n\nPractical checklist:\n1) Conduct keyword research\n2) Create high-quality content\n3) Optimize technical SEO\n\nMini exercise:\nDevelop a comprehensive SEO and AEO strategy for a site you own.",
        },
      ],
    },
  };

  function makeQuestionBank(topic: string, n: number) {
    const bank = [
      {
        prompt: `${topic}: What is the main purpose of a title tag?`,
        choices: [
          "Describe the page topic for users and search engines",
          "Replace the H1 on the page",
          "Block a page from indexing",
          "Increase server speed",
        ],
        correctIndex: 0,
      },
      {
        prompt: `${topic}: Which directive prevents a page from being indexed?`,
        choices: [
          "meta name=robots content=noindex",
          "meta name=viewport",
          "rel=canonical",
          "alt text",
        ],
        correctIndex: 0,
      },
      {
        prompt: `${topic}: What does a canonical tag help with?`,
        choices: [
          "Telling search engines which URL is the preferred version",
          "Making a page load faster",
          "Creating internal links automatically",
          "Generating an XML sitemap",
        ],
        correctIndex: 0,
      },
      {
        prompt: `${topic}: Which is the best first step when a page is not ranking at all?`,
        choices: [
          "Confirm it is indexed and accessible (status, robots, noindex)",
          "Add 50 keywords to the footer",
          "Remove headings",
          "Change the website colors",
        ],
        correctIndex: 0,
      },
      {
        prompt: `${topic}: Which internal linking practice is best?`,
        choices: [
          "Link from relevant pages using descriptive anchor text",
          "Link every page to every page",
          "Use only 'click here' anchors",
          "Hide links in images only",
        ],
        correctIndex: 0,
      },
      {
        prompt: `${topic}: In keyword research, what does intent describe?`,
        choices: [
          "What the user wants to achieve with the query",
          "How long the keyword is",
          "The number of ads on the SERP",
          "The color of the search results",
        ],
        correctIndex: 0,
      },
      {
        prompt: `${topic}: Which is a strong example of a helpful opening paragraph?`,
        choices: [
          "A direct answer followed by brief context",
          "A long story before addressing the topic",
          "A paragraph full of repeated keywords",
          "A paragraph with no subject",
        ],
        correctIndex: 0,
      },
      {
        prompt: `${topic}: Which is most likely to harm crawlability?`,
        choices: [
          "Blocking important sections in robots.txt",
          "Using clear navigation",
          "Having a sitemap",
          "Using internal links",
        ],
        correctIndex: 0,
      },
      {
        prompt: `${topic}: What is the goal of Core Web Vitals?`,
        choices: [
          "Measure real-user loading, responsiveness, and visual stability",
          "Replace meta descriptions",
          "Generate schema markup automatically",
          "Increase keyword density",
        ],
        correctIndex: 0,
      },
      {
        prompt: `${topic}: Which content pattern is best for AEO?`,
        choices: [
          "Direct answer first, then bullets and examples",
          "Hide the answer at the bottom",
          "Write only marketing slogans",
          "Avoid definitions",
        ],
        correctIndex: 0,
      },
    ];

    return Array.from({ length: n }).map((_, i) => {
      const q = bank[i % bank.length];
      return { prompt: q.prompt, choices: q.choices, correctIndex: q.correctIndex };
    });
  }

  function makeLessonsForModule(
    courseTitle: string,
    moduleTitle: string,
    media?: { heroVideoUrl?: string | null; heroImageUrl?: string | null },
  ) {
    const topics = [
      "Key concepts & definitions",
      "How it works (step-by-step)",
      "Common mistakes to avoid",
      "Practical checklist",
      "Examples you can copy",
      "How to validate your work",
      "Optimization techniques",
      "Troubleshooting",
      "Mini case study",
      "Summary & next actions",
    ];

    const referenceLinks = [
      "https://developers.google.com/search/docs/fundamentals/seo-starter-guide",
      "https://developers.google.com/search/docs/crawling-indexing/overview",
      "https://developers.google.com/search/docs/appearance/snippet",
      "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
      "https://web.dev/learn-core-web-vitals/",
      "https://schema.org/",
      "https://developers.google.com/search/blog",
      "https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview",
      "https://developers.google.com/search/docs/appearance/structured-data",
      "https://developers.google.com/search/docs/appearance/page-experience",
    ];

    const lessons = Array.from({ length: 10 }).map((_, i) => {
      const n = i + 1;
      const heading = topics[i] ?? `Lesson ${n}`;
      const heroVideo =
        (media?.heroVideoUrl ?? "").trim() || "https://www.youtube.com/watch?v=Y4rImdZ3FVc";
      const heroImage =
        (media?.heroImageUrl ?? "").trim() ||
        "https://images.unsplash.com/photo-1454165205744-3b78555e5572?auto=format&fit=crop&w=1600&q=80";
      const secondaryImage =
        "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1600&q=80";

      const refUrl = referenceLinks[i % referenceLinks.length] ?? "https://developers.google.com/search/docs";
      const blocks: LessonBlock[] = [
        {
          type: "text",
          markdown:
            `Learning outcomes\n\n` +
            `- Define the key terms for: **${heading}**.\n` +
            `- Apply a step-by-step method to improve one page.\n` +
            `- Validate your result using at least one check.\n\n` +
            `You are in: **${courseTitle}**.\n` +
            `Module: **${moduleTitle}**.\n` +
            `Lesson focus: **${heading}**.\n\n` +
            `Direct answer\n\n` +
            `In practice, **${heading.toLowerCase()}** matters because it changes how search engines and users understand your page. The goal is to make the next action obvious: what to change, where to change it, and how to confirm it worked.`,
        },
        { type: "divider" },
        { type: "video", url: heroVideo, title: "Watch: Quick concept primer" },
        { type: "divider" },
        { type: "image", url: heroImage, caption: "Use this as your checklist reference while learning." },
        { type: "image", url: secondaryImage, caption: "Example context you can adapt to your own website." },
        {
          type: "text",
          markdown:
            `Step-by-step\n\n` +
            `1) Pick one target page (URL)\n` +
            `2) Write the page intent in 8 words\n` +
            `3) Find the main section where **${heading.toLowerCase()}** applies\n` +
            `4) Make one improvement (small + measurable)\n` +
            `5) Re-read the page: does the first 10 seconds make sense?\n\n` +
            `Common mistakes\n\n` +
            `- Doing 10 changes at once (can’t measure impact)\n` +
            `- Optimizing for keywords but ignoring clarity\n` +
            `- No validation step (you never confirm)\n\n` +
            `Examples\n\n` +
            `- Before: "We offer many services"\n` +
            `  After: "We help you fix crawl and indexing issues in 7 days"\n\n` +
            `Validation\n\n` +
            `- Check page rendering and the key elements you changed\n` +
            `- Confirm links work and headings match the intent\n\n` +
            `Mini assignment\n\n` +
            `Write 5 bullet points explaining what you changed and why.`,
        },
        { type: "divider" },
        { type: "link", url: refUrl, title: "Reference (read next)", description: `Use this reference to deepen: ${heading}` },
      ];
      return {
        type: "lesson" as const,
        order: n,
        title: `${moduleTitle} - ${heading}`,
        blocks,
        content:
          `Learning Outcomes\n` +
          `- Define key terms for: ${heading}\n` +
          `- Apply a step-by-step improvement\n` +
          `- Validate the result\n\n` +
          `Lesson\n` +
          `Course: ${courseTitle}\n` +
          `Module: ${moduleTitle}\n` +
          `Focus: ${heading}\n\n` +
          `Step-by-step\n` +
          `1) Pick one target page (URL)\n` +
          `2) Write the page intent in 8 words\n` +
          `3) Improve one element related to: ${heading}\n` +
          `4) Re-check clarity and structure\n\n` +
          `Mini assignment\n` +
          `Write 5 bullets explaining what you changed and how you validated it.\n\n` +
          `Reference\n` +
          `${refUrl}`,
      };
    });

    const exercise = {
      type: "exercise" as const,
      order: 11,
      title: `${moduleTitle} - Exercise`,
      blocks: [
        {
          type: "text",
          markdown:
            `Exercise\n\n` +
            `Goal: apply what you learned in **${moduleTitle}**.\n\n` +
            `Tasks\n\n` +
            `1) Pick one page/topic\n` +
            `2) Write a title + meta description\n` +
            `3) Draft an outline with headings\n` +
            `4) Create 3 internal links and 1 FAQ block\n\n` +
            `Completion rule\n\n` +
            `Mark this exercise complete only when you can explain your choices in 60 seconds.`,
        },
      ],
      content:
        `Exercise (submit to yourself)\n\n` +
        `Goal: apply what you learned in ${moduleTitle}.\n\n` +
        `Tasks\n` +
        `1) Pick one page/topic\n` +
        `2) Write a title + meta description\n` +
        `3) Draft an outline with headings\n` +
        `4) Create 3 internal links and 1 FAQ block\n\n` +
        `Completion rule\n` +
        `Mark this exercise complete only when you can explain your choices in 60 seconds.`,
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
          const plannedTitle = moduleTitlesBySeedKey[seedKey]?.[m - 1] ?? `${moduleTheme} Module ${m}`;
          const moduleTitle = plannedTitle;

          if (!moduleId) {
            const moduleRef = doc(modulesRef);
            moduleId = moduleRef.id;
            batch.set(moduleRef, {
              title: moduleTitle,
              description: `Learning outcomes and practice for: ${moduleTitle}.`,
              order: m,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            ops += 1;
          } else {
            const existingTitle = existingByOrder.get(m)?.title ?? null;
            if (existingTitle && existingTitle.endsWith(`Module ${m}`)) {
              batch.set(
                doc(firestore, "courses", c.id, "modules", moduleId),
                {
                  title: moduleTitle,
                  description: `Learning outcomes and practice for: ${moduleTitle}.`,
                  updatedAt: serverTimestamp(),
                },
                { merge: true },
              );
              ops += 1;
            }
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

          const desiredLessons = makeLessonsForModule(courseTitle, moduleTitle, {
            heroVideoUrl: meta?.promoVideoUrl ?? null,
            heroImageUrl: meta?.thumbnailUrl ?? null,
          });
          for (const lesson of desiredLessons) {
            const existing = lessonsSnap.docs.find((d) => (d.data() as { order?: number }).order === lesson.order) ?? null;
            if (!existing) {
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
              continue;
            }

            const existingData = existing.data() as { title?: string; content?: string };
            const existingTitle = existingData.title ?? "";
            const existingContent = existingData.content ?? "";
            const looksLikePlaceholder =
              existingTitle.includes(" - Lesson ") ||
              existingContent.includes("Lesson") && existingContent.includes("content.");
            if (looksLikePlaceholder) {
              batch.set(
                doc(lessonsRef, existing.id),
                {
                  title: lesson.title,
                  content: lesson.content,
                  updatedAt: serverTimestamp(),
                },
                { merge: true },
              );
              ops += 1;
              if (ops >= 450) await commitIfNeeded();
            }
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

          // Module resources
          if (meta?.resources && Array.isArray(meta.resources) && meta.resources.length > 0) {
            const modResourcesRef = collection(firestore, "courses", c.id, "modules", moduleId, "resources");
            const existingSnap = await getDocs(modResourcesRef);
            const existingTitles = new Set(
              existingSnap.docs.map((d) => (d.data() as { title?: string }).title ?? "").filter((t) => t.trim().length > 0),
            );

            for (const r of meta.resources) {
              const title = (r.title ?? "").trim();
              if (!title || existingTitles.has(title)) continue;
              const rRef = doc(modResourcesRef);
              const resourceBlocks: LessonBlock[] = [
                { type: "text", markdown: `Summary\n\n${r.content}` },
                { type: "divider" },
                {
                  type: "image",
                  url:
                    meta.thumbnailUrl ??
                    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80",
                  caption: "Resource visual",
                },
                {
                  type: "video",
                  url: meta.promoVideoUrl ?? "https://www.youtube.com/watch?v=jwgnwtQcSWQ",
                  title: "Watch",
                },
                r.url ? { type: "link", url: r.url, title: "Open resource", description: r.description } : { type: "divider" },
              ];
              batch.set(
                rRef,
                {
                  title,
                  description: r.description ?? "",
                  url: r.url ?? "",
                  blocks: resourceBlocks,
                  content: r.content ?? "",
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                },
                { merge: true },
              );
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
          thumbnailUrl: seedCourseMap["seo-foundations"].thumbnailUrl,
          promoVideoUrl: seedCourseMap["seo-foundations"].promoVideoUrl,
          level: "beginner",
          durationHours: 3,
          learnersCount: 11748,
          likesCount: 71,
          certificateEnabled: true,
          resources: [
            {
              title: "Search Essentials",
              description: "Official documentation overview.",
              url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide",
              content:
                "Learning goal: understand what SEO is and how search engines work.\n\nKey ideas:\n- Crawling: discovery via links and sitemaps\n- Indexing: processing content into a searchable database\n- Ranking: ordering results by relevance + quality\n\nMini exercise:\nExplain crawling vs indexing in 2 sentences.",
            },
            {
              title: "Crawling & Indexing",
              description: "Overview of how indexing happens.",
              url: "https://developers.google.com/search/docs/crawling-indexing/overview",
              content:
                "Learning goal: learn what can prevent indexing.\n\nChecklist:\n1) Page returns 200\n2) Not blocked by robots.txt\n3) Not set to noindex\n4) Canonical points to itself\n\nMini exercise:\nList 5 reasons a page may not be indexed.",
            },
          ],
        },
        {
          seedKey: "keyword-intent",
          order: 2,
          title: "Keyword Research & Intent",
          description: "Build keyword maps and intent-driven content plans.",
          moduleTheme: "Keywords",
          thumbnailUrl: seedCourseMap["keyword-intent"].thumbnailUrl,
          promoVideoUrl: seedCourseMap["keyword-intent"].promoVideoUrl,
          level: "beginner",
          durationHours: 3,
          learnersCount: 22477,
          likesCount: 233,
          certificateEnabled: true,
          resources: [
            {
              title: "Search quality rater guidelines",
              description: "Use as a mental model for quality.",
              url: "https://developers.google.com/search/blog/2022/07/quality-rater-guidelines-update",
              content:
                "Learning goal: understand E-E-A-T signals.\n\nPractice:\n- Add clear author and about info\n- Add sources where needed\n- Improve clarity and usefulness\n\nMini exercise:\nWrite 3 changes you would make to increase trust on one page.",
            },
          ],
        },
        {
          seedKey: "onpage-content",
          order: 3,
          title: "On-Page SEO & Content Structure",
          description: "Write and structure content for humans and machines.",
          moduleTheme: "On-Page",
          thumbnailUrl: seedCourseMap["onpage-content"].thumbnailUrl,
          promoVideoUrl: seedCourseMap["onpage-content"].promoVideoUrl,
          level: "intermediate",
          durationHours: 4,
          learnersCount: 16323,
          likesCount: 125,
          certificateEnabled: true,
          resources: [
            {
              title: "Create helpful content",
              description: "Guidance on helpful content.",
              url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
              content:
                "Learning goal: write content that solves a user problem.\n\nTemplate:\n1) Direct answer\n2) Steps\n3) Examples\n4) FAQ\n\nMini exercise:\nRewrite a paragraph to be shorter and clearer.",
            },
          ],
        },
        {
          seedKey: "technical-seo",
          order: 4,
          title: "Technical SEO",
          description: "Make your site crawlable, fast, indexable, and stable.",
          moduleTheme: "Technical",
          thumbnailUrl: seedCourseMap["technical-seo"].thumbnailUrl,
          promoVideoUrl: seedCourseMap["technical-seo"].promoVideoUrl,
          level: "intermediate",
          durationHours: 4,
          learnersCount: 9050,
          likesCount: 180,
          certificateEnabled: true,
          resources: [
            {
              title: "Technical SEO basics",
              description: "Crawling/indexing guidance.",
              url: "https://developers.google.com/search/docs/crawling-indexing",
              content:
                "Learning goal: understand the technical blockers.\n\nChecklist:\n- Robots\n- HTTP status\n- Canonicals\n- Sitemaps\n- Mobile + speed\n\nMini exercise:\nName 3 technical issues and how to diagnose them.",
            },
          ],
        },
        {
          seedKey: "metadata-serp",
          order: 5,
          title: "Metadata & SERP Optimization",
          description: "Titles, descriptions, canonicals, and SERP preview best practices.",
          moduleTheme: "Metadata",
          thumbnailUrl: seedCourseMap["metadata-serp"].thumbnailUrl,
          promoVideoUrl: seedCourseMap["metadata-serp"].promoVideoUrl,
          level: "beginner",
          durationHours: 2,
          learnersCount: 6100,
          likesCount: 96,
          certificateEnabled: true,
          resources: [
            {
              title: "Control your snippets",
              description: "Snippet and meta guidance.",
              url: "https://developers.google.com/search/docs/appearance/snippet",
              content:
                "Learning goal: write titles/descriptions that earn clicks.\n\nRules:\n- Title: 50–60 chars\n- Description: 120–160 chars\n\nMini exercise:\nWrite 3 titles + descriptions for the same page for different intents.",
            },
          ],
        },
        {
          seedKey: "schema-entities",
          order: 6,
          title: "Schema & Entities",
          description: "Structured data and entity understanding.",
          moduleTheme: "Schema",
          thumbnailUrl: seedCourseMap["schema-entities"].thumbnailUrl,
          promoVideoUrl: seedCourseMap["schema-entities"].promoVideoUrl,
          level: "intermediate",
          durationHours: 3,
          learnersCount: 4200,
          likesCount: 88,
          certificateEnabled: true,
          resources: [
            {
              title: "Structured data documentation",
              description: "Schema docs.",
              url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
              content:
                "Learning goal: understand what schema is and when to use it.\n\nMini exercise:\nDraft 3 FAQ Q&A pairs that could be turned into FAQ schema.",
            },
          ],
        },
        {
          seedKey: "aeo-fundamentals",
          order: 7,
          title: "AEO Fundamentals",
          description: "Answer Engine Optimization: create content that AI can extract reliably.",
          moduleTheme: "AEO",
          thumbnailUrl: seedCourseMap["aeo-fundamentals"].thumbnailUrl,
          promoVideoUrl: seedCourseMap["aeo-fundamentals"].promoVideoUrl,
          level: "intermediate",
          durationHours: 3,
          learnersCount: 5200,
          likesCount: 140,
          certificateEnabled: true,
          resources: [
            {
              title: "Helpful content for AI extraction",
              description: "Practical writing guidance.",
              url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
              content:
                "Learning goal: write AI-extractable answers.\n\nPatterns:\n- Direct answer first\n- Bullets\n- Tables\n\nMini exercise:\nWrite a definition + 5 bullets for one topic.",
            },
          ],
        },
        {
          seedKey: "seo-aeo-capstone",
          order: 8,
          title: "SEO + AEO Capstone",
          description: "Combine SEO and AEO into a single publish-ready page and strategy.",
          moduleTheme: "Capstone",
          thumbnailUrl: seedCourseMap["seo-aeo-capstone"].thumbnailUrl,
          promoVideoUrl: seedCourseMap["seo-aeo-capstone"].promoVideoUrl,
          level: "advanced",
          durationHours: 5,
          learnersCount: 3000,
          likesCount: 60,
          certificateEnabled: true,
          resources: [
            {
              title: "Search appearance overview",
              description: "How results can appear.",
              url: "https://developers.google.com/search/docs/appearance",
              content:
                "Learning goal: understand SERP features.\n\nMini exercise:\nPick one SERP feature and outline content optimized for it.",
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
          thumbnailUrl: c.thumbnailUrl ?? null,
          promoVideoUrl: c.promoVideoUrl ?? null,
          level: c.level ?? null,
          durationHours: typeof c.durationHours === "number" ? c.durationHours : null,
          learnersCount: typeof c.learnersCount === "number" ? c.learnersCount : null,
          likesCount: typeof c.likesCount === "number" ? c.likesCount : null,
          certificateEnabled: c.certificateEnabled === true,
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

          const lessons = makeLessonsForModule(c.title, moduleTitle, {
            heroVideoUrl: c.promoVideoUrl ?? null,
            heroImageUrl: c.thumbnailUrl ?? null,
          });
          for (const lesson of lessons) {
            const lessonRef = doc(collection(firestore, "courses", courseId, "modules", moduleRef.id, "lessons"));
            batch.set(lessonRef, {
              type: lesson.type,
              order: lesson.order,
              title: lesson.title,
              blocks: lesson.blocks ?? null,
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

          // Module resources (copy course resources into every module)
          for (const r of c.resources) {
            const rRef = doc(collection(firestore, "courses", courseId, "modules", moduleRef.id, "resources"));
            const resourceBlocks: LessonBlock[] = [
              { type: "text", markdown: `Summary\n\n${r.content}` },
              { type: "divider" },
              {
                type: "image",
                url:
                  c.thumbnailUrl ??
                  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80",
                caption: "Resource visual",
              },
              { type: "video", url: c.promoVideoUrl ?? "https://www.youtube.com/watch?v=jwgnwtQcSWQ", title: "Watch" },
              r.url ? { type: "link", url: r.url, title: "Open resource", description: r.description } : { type: "divider" },
            ];
            batch.set(rRef, {
              title: r.title,
              description: r.description,
              url: r.url,
              blocks: resourceBlocks,
              content: r.content,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            ops += 1;
            if (ops >= 450) await commitIfNeeded();
          }
        }

        for (const r of c.resources) {
          const rRef = doc(collection(firestore, "courses", courseId, "resources"));
          const resourceBlocks: LessonBlock[] = [
            { type: "text", markdown: `Summary\n\n${r.content}` },
            { type: "divider" },
            { type: "image", url: c.thumbnailUrl ?? "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80", caption: "Resource visual" },
            { type: "video", url: c.promoVideoUrl ?? "https://www.youtube.com/watch?v=Y4rImdZ3FVc", title: "Watch" },
            r.url ? { type: "link", url: r.url, title: "Open resource", description: r.description } : { type: "divider" },
          ];
          batch.set(rRef, {
            title: r.title,
            description: r.description,
            url: r.url,
            blocks: resourceBlocks,
            content: r.content,
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
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" onClick={() => void seedStarterCurriculum()} disabled={seeding}>
                  {seeding ? "Seeding…" : "Seed 8 courses"}
                </Button>
                <Button variant="outline" onClick={() => void upgradeSeededCourses()} disabled={upgrading || seeding}>
                  {upgrading ? "Upgrading…" : "Upgrade seeded courses"}
                </Button>
                <Button
                  variant="outline"
                  disabled={upgrading || seeding}
                  onClick={() => {
                    void rewriteSeededLessonContentDetailed();
                  }}
                >
                  Rewrite lessons (detailed)
                </Button>
                <Button
                  variant="outline"
                  disabled={upgrading || seeding}
                  onClick={() => {
                    void backfillSeededCourseVideos();
                  }}
                >
                  Backfill videos (all)
                </Button>
                <Button
                  variant="outline"
                  disabled={upgrading || seeding}
                  onClick={() => {
                    void backfillFirstTwoCourseMedia();
                  }}
                >
                  Backfill media (first 2)
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Create course</Button>
                  </DialogTrigger>
                  <DialogContent
                    onInteractOutside={() => {
                      resetNewCourseWizard();
                    }}
                    onEscapeKeyDown={() => {
                      resetNewCourseWizard();
                    }}
                  >
                    <DialogHeader>
                      <DialogTitle>New course</DialogTitle>
                    </DialogHeader>

                    {newCourseWizardStep === 1 && (
                      <>
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

                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Image URL (course card)</div>
                            <Input
                              value={newThumbnailUrl}
                              onChange={(e) => setNewThumbnailUrl(e.target.value)}
                              placeholder="https://..."
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Promo video URL</div>
                            <Input
                              value={newPromoVideoUrl}
                              onChange={(e) => setNewPromoVideoUrl(e.target.value)}
                              placeholder="https://www.youtube.com/watch?v=..."
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="text-sm text-muted-foreground">Level</div>
                              <select
                                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={newLevel}
                                onChange={(e) => setNewLevel(e.target.value as "beginner" | "intermediate" | "advanced")}
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
                                value={newDurationHours}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (!v) return setNewDurationHours("");
                                  const n = Number(v);
                                  if (!Number.isFinite(n)) return;
                                  setNewDurationHours(n);
                                }}
                                placeholder="3"
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="text-sm text-muted-foreground">Learners</div>
                              <Input
                                inputMode="numeric"
                                value={newLearnersCount}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (!v) return setNewLearnersCount("");
                                  const n = Number(v);
                                  if (!Number.isFinite(n)) return;
                                  setNewLearnersCount(n);
                                }}
                                placeholder="11748"
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="text-sm text-muted-foreground">Likes</div>
                              <Input
                                inputMode="numeric"
                                value={newLikesCount}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (!v) return setNewLikesCount("");
                                  const n = Number(v);
                                  if (!Number.isFinite(n)) return;
                                  setNewLikesCount(n);
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
                            <input
                              type="checkbox"
                              checked={newCertificateEnabled}
                              onChange={(e) => setNewCertificateEnabled(e.target.checked)}
                            />
                          </div>
                        </div>

                        <DialogFooter>
                          <Button
                            onClick={() => {
                              void createCourse();
                            }}
                            disabled={!newTitle.trim()}
                          >
                            Next
                          </Button>
                        </DialogFooter>
                      </>
                    )}

                    {newCourseWizardStep === 2 && createdCourseId && (
                      <>
                        <div className="space-y-3">
                          <div className="text-sm text-muted-foreground">
                            Course created. Add content now or import a JSON file to populate modules, lessons, resources, exercises, and tests.
                          </div>

                          <div className="rounded-lg border border-border p-3">
                            <div className="text-xs text-muted-foreground">Course ID</div>
                            <div className="text-sm font-medium text-foreground break-all">{createdCourseId}</div>
                          </div>

                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Import JSON</div>
                            <Textarea
                              value={importJson}
                              onChange={(e) => setImportJson(e.target.value)}
                              placeholder='{"course": {"published": true}, "modules": [...], "resources": [...], "finalQuestions": [...]}'
                              className="min-h-[180px] font-mono text-xs"
                            />
                            {importError ? <div className="text-sm text-destructive">{importError}</div> : null}
                          </div>
                        </div>

                        <DialogFooter>
                          <Button asChild variant="outline">
                            <Link to={`/instructors/courses/${createdCourseId}`}>Open editor</Link>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              resetNewCourseWizard();
                            }}
                          >
                            Done
                          </Button>
                          <Button
                            disabled={importing || !importJson.trim()}
                            onClick={() => {
                              void (async () => {
                                setImportError(null);
                                setImporting(true);
                                try {
                                  await importCourseJsonToFirestore(createdCourseId, importJson);
                                  await setDoc(
                                    doc(firestore, "courses", createdCourseId),
                                    { published: true, updatedAt: serverTimestamp() },
                                    { merge: true },
                                  );
                                  setImportJson("");
                                } catch (e) {
                                  const msg = e instanceof Error ? e.message : String(e);
                                  setImportError(msg);
                                } finally {
                                  setImporting(false);
                                }
                              })();
                            }}
                          >
                            {importing ? "Importing…" : "Import JSON"}
                          </Button>
                        </DialogFooter>
                      </>
                    )}
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
