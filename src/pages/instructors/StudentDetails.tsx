import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Keyword = { term: string; intent: "informational" | "transactional" | "navigational" };

type PageBuilderState = {
  blocks?: Array<{ id: string; type: string; content: string; alt?: string }>;
  updatedAt?: unknown;
};

type MetadataWorkspace = {
  title?: string;
  description?: string;
  slug?: string;
  generatedHtml?: string;
  updatedAt?: unknown;
};

type AeoDraft = { id: string; question: string | null; answer: string | null; updatedAt?: unknown; createdAt?: unknown };

type StudentProfile = {
  displayName?: string | null;
  email?: string | null;
  hub?: string | null;
  createdAt?: unknown;
  points?: number;
};

type StudentEvent = {
  type?: string;
  label?: string;
  createdAt?: unknown;
  lessonId?: string;
  scenario?: string;
  meta?: Record<string, unknown>;
};

type AssessmentRow = {
  id: string;
  title: string | null;
  summary: string | null;
  score: number | null;
  createdAt?: unknown;
};

function formatMaybeDate(v: unknown) {
  if (!v) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
  }
  if (typeof v === "object" && v && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    const d = (v as { toDate: () => Date }).toDate();
    return d.toLocaleString();
  }
  return "—";
}

export default function InstructorStudentDetails() {
  const { studentId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [events, setEvents] = useState<Array<{ id: string; data: StudentEvent }>>([]);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [metadata, setMetadata] = useState<MetadataWorkspace | null>(null);
  const [pageBuilder, setPageBuilder] = useState<PageBuilderState | null>(null);
  const [aeoDrafts, setAeoDrafts] = useState<AeoDraft[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!studentId) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const studentRef = doc(firestore, "students", studentId);
        const studentSnap = await getDoc(studentRef);
        const studentData = (studentSnap.exists() ? (studentSnap.data() as StudentProfile) : null) ?? null;

        const eventsRef = collection(firestore, "students", studentId, "events");
        const eventsQ = query(eventsRef, orderBy("createdAt", "desc"), limit(100));
        let eventsSnap;
        try {
          eventsSnap = await getDocs(eventsQ);
        } catch {
          // If ordering field doesn't exist yet, fall back to unsorted.
          eventsSnap = await getDocs(eventsRef);
        }

        const nextEvents = eventsSnap.docs.map((d) => ({ id: d.id, data: d.data() as StudentEvent }));

        const kwSnap = await getDoc(doc(firestore, "students", studentId, "workspace", "keywords"));
        const kwData = kwSnap.exists() ? (kwSnap.data() as { keywords?: Keyword[] }) : null;
        const nextKeywords = Array.isArray(kwData?.keywords) ? kwData!.keywords : [];

        const mdSnap = await getDoc(doc(firestore, "students", studentId, "workspace", "metadata"));
        const mdData = mdSnap.exists() ? (mdSnap.data() as MetadataWorkspace) : null;

        const pbSnap = await getDoc(doc(firestore, "students", studentId, "workspace", "pageBuilder"));
        const pbData = pbSnap.exists() ? (pbSnap.data() as PageBuilderState) : null;

        const draftsRef = collection(firestore, "students", studentId, "aeoDrafts");
        let draftsSnap;
        try {
          draftsSnap = await getDocs(query(draftsRef, orderBy("updatedAt", "desc"), limit(10)));
        } catch {
          draftsSnap = await getDocs(query(draftsRef, limit(10)));
        }
        const nextDrafts: AeoDraft[] = draftsSnap.docs.map((d) => {
          const data = d.data() as { question?: string; answer?: string; updatedAt?: unknown; createdAt?: unknown };
          return {
            id: d.id,
            question: data.question ?? null,
            answer: data.answer ?? null,
            updatedAt: data.updatedAt,
            createdAt: data.createdAt,
          };
        });

        const assessRef = collection(firestore, "assessments");
        let assessSnap;
        try {
          assessSnap = await getDocs(
            query(assessRef, where("studentUid", "==", studentId), orderBy("createdAt", "desc"), limit(20)),
          );
        } catch {
          assessSnap = await getDocs(query(assessRef, where("studentUid", "==", studentId), limit(20)));
        }
        const nextAssessments: AssessmentRow[] = assessSnap.docs.map((d) => {
          const data = d.data() as { title?: string; summary?: string; score?: number; createdAt?: unknown };
          return {
            id: d.id,
            title: data.title ?? null,
            summary: data.summary ?? null,
            score: typeof data.score === "number" ? data.score : null,
            createdAt: data.createdAt,
          };
        });

        if (cancelled) return;
        setProfile(studentData);
        setEvents(nextEvents);
        setAssessments(nextAssessments);
        setKeywords(nextKeywords);
        setMetadata(mdData);
        setPageBuilder(pbData);
        setAeoDrafts(nextDrafts);
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
  }, [studentId]);

  const needsHelpSignals = useMemo(() => {
    const labels = events
      .map((e) => (e.data.label ?? e.data.type ?? "").toLowerCase())
      .filter(Boolean);

    const flags: string[] = [];
    if (labels.some((x) => x.includes("stuck") || x.includes("blocked"))) flags.push("Stuck/blocked");
    if (labels.some((x) => x.includes("quiz") && x.includes("fail"))) flags.push("Failed quiz");
    if (labels.some((x) => x.includes("help") || x.includes("support"))) flags.push("Requested help");
    return flags;
  }, [events]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Student</h1>
            <p className="text-muted-foreground mt-1">Profile, activity, and progress signals.</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/instructors/students">Back to My Students</Link>
          </Button>
        </div>

        {loading && <div className="text-sm text-muted-foreground">Loading…</div>}

        {!loading && error && <div className="text-sm text-muted-foreground break-words">{error}</div>}

        {!loading && !error && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Name:</span> {profile?.displayName ?? "—"}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Email:</span> {profile?.email ?? studentId ?? "—"}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Hub:</span> {profile?.hub ?? "—"}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Points:</span> {typeof profile?.points === "number" ? profile.points : "—"}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Needs help</CardTitle>
                </CardHeader>
                <CardContent>
                  {needsHelpSignals.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No signals yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {needsHelpSignals.map((x) => (
                        <div key={x} className="text-sm text-foreground">{x}</div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Workspace</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="font-medium text-foreground mb-2">Page Builder</div>
                    {Array.isArray(pageBuilder?.blocks) && pageBuilder!.blocks!.length > 0 ? (
                      <div className="rounded-lg border border-border p-4 bg-background">
                        <div className="space-y-3">
                          {pageBuilder!.blocks!.map((b) => (
                            <div key={b.id} className="text-sm">
                              <span className="text-muted-foreground">{String(b.type).toUpperCase()}:</span> {b.content}
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground mt-3">Updated: {formatMaybeDate(pageBuilder?.updatedAt)}</div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No Page Builder work saved yet.</div>
                    )}
                  </div>

                  <div>
                    <div className="font-medium text-foreground mb-2">Keywords</div>
                    {keywords.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No keywords saved yet.</div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {keywords.slice(0, 50).map((k, idx) => (
                          <div key={`${k.term}-${idx}`} className="text-xs rounded-full bg-muted px-3 py-1 text-foreground">
                            {k.term}
                            <span className="text-muted-foreground"> · {k.intent}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="font-medium text-foreground mb-2">Metadata</div>
                    {!metadata?.generatedHtml ? (
                      <div className="text-sm text-muted-foreground">No metadata saved yet.</div>
                    ) : (
                      <div className="rounded-lg border border-border p-4 bg-muted/20">
                        <div className="text-sm text-foreground">{metadata.title || "(no title)"}</div>
                        <div className="text-xs text-muted-foreground mt-1">/{metadata.slug || ""}</div>
                        <pre className="mt-3 text-xs overflow-auto max-h-[180px] whitespace-pre-wrap">{metadata.generatedHtml}</pre>
                        <div className="text-xs text-muted-foreground mt-3">Updated: {formatMaybeDate(metadata.updatedAt)}</div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="font-medium text-foreground mb-2">AEO drafts</div>
                    {aeoDrafts.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No AEO drafts yet.</div>
                    ) : (
                      <div className="space-y-3">
                        {aeoDrafts.map((d) => (
                          <div key={d.id} className="rounded-lg bg-muted/50 p-3">
                            <div className="text-sm font-medium text-foreground">{d.question ?? "Question"}</div>
                            {d.answer && <div className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{d.answer}</div>}
                            <div className="text-xs text-muted-foreground mt-2">Updated: {formatMaybeDate(d.updatedAt ?? d.createdAt)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Assessments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assessments.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No assessments yet.</div>
                  ) : (
                    assessments.map((a) => (
                      <div key={a.id} className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate">{a.title ?? "Assessment"}</div>
                            {a.summary && (
                              <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.summary}</div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground shrink-0">
                            {typeof a.score === "number" ? `Score: ${a.score}` : ""}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">{formatMaybeDate(a.createdAt)}</div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {events.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No activity yet.</div>
                  ) : (
                    events.map((e) => (
                      <div key={e.id} className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate">
                              {e.data.label ?? e.data.type ?? "Event"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{e.id}</div>
                          </div>
                          <div className="text-xs text-muted-foreground shrink-0">{formatMaybeDate(e.data.createdAt)}</div>
                        </div>
                        {(e.data.lessonId || e.data.scenario) && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {e.data.lessonId ? `Lesson: ${e.data.lessonId}` : ""}
                            {e.data.lessonId && e.data.scenario ? " • " : ""}
                            {e.data.scenario ? `Scenario: ${e.data.scenario}` : ""}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
