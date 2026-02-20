import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, where } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { firestore } from "@/lib/firebase";

function isFirestoreMissingIndexError(message: string) {
  return message.toLowerCase().includes("requires an index");
}

function friendlyFirestoreError(message: string) {
  if (isFirestoreMissingIndexError(message)) {
    return {
      title: "Setup needed",
      body: "Your database needs a Firestore index for this view. The page will still load, but sorting may be limited.",
    };
  }
  return { title: "Something went wrong", body: message };
}

export default function InstructorAssessments() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);

  const [creating, setCreating] = useState(false);

  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [newStudentUid, setNewStudentUid] = useState<string>("");
  const [newTitle, setNewTitle] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [newScore, setNewScore] = useState<string>("");

  const [openId, setOpenId] = useState<string | null>(null);

  const [studentLookup, setStudentLookup] = useState<Record<string, StudentRow>>({});

  useEffect(() => {
    let cancelled = false;
    const hub = profile?.hub;
    if (!hub) {
      setAssessments([]);
      setLoading(false);
      return;
    }

    async function loadAssessments() {
      setLoading(true);
      setError(null);
      try {
        const base = query(collection(firestore, "assessments"), where("hub", "==", hub), limit(100));
        let snap;
        try {
          snap = await getDocs(query(base, orderBy("createdAt", "desc")));
        } catch {
          snap = await getDocs(base);
        }

        const next: AssessmentRow[] = snap.docs.map((d) => {
          const data = d.data() as AssessmentDoc;
          return {
            id: d.id,
            title: data.title ?? null,
            summary: data.summary ?? null,
            studentUid: data.studentUid ?? null,
            instructorUid: data.instructorUid ?? null,
            hub: data.hub ?? null,
            score: typeof data.score === "number" ? data.score : null,
            createdAt: data.createdAt,
          };
        });
        if (!cancelled) setAssessments(next);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAssessments();
    return () => {
      cancelled = true;
    };
  }, [profile?.hub]);

  useEffect(() => {
    let cancelled = false;
    const hub = profile?.hub;
    if (!hub) return;

    (async () => {
      setStudentsLoading(true);
      setStudentsError(null);
      try {
        const q = query(collection(firestore, "students"), where("hub", "==", hub));
        const snap = await getDocs(q);
        const next: StudentRow[] = snap.docs.map((d) => {
          const data = d.data() as { uid?: string; displayName?: string | null; email?: string | null; hub?: string | null };
          return {
            uid: data.uid ?? d.id,
            displayName: data.displayName ?? null,
            email: data.email ?? null,
            hub: data.hub ?? null,
          };
        });
        if (!cancelled) {
          setStudents(next);
          setStudentLookup(Object.fromEntries(next.map((s) => [s.uid, s])));
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setStudentsError(msg);
      } finally {
        if (!cancelled) setStudentsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.hub]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return assessments;
    return assessments.filter((a) => {
      const student = a.studentUid ? studentLookup[a.studentUid] : undefined;
      const title = (a.title ?? "").toLowerCase();
      const name = (student?.displayName ?? "").toLowerCase();
      const email = (student?.email ?? "").toLowerCase();
      return title.includes(q) || name.includes(q) || email.includes(q);
    });
  }, [assessments, searchTerm, studentLookup]);

  const openAssessment = useMemo(() => {
    if (!openId) return null;
    return assessments.find((a) => a.id === openId) ?? null;
  }, [assessments, openId]);

  async function createAssessment() {
    const hub = profile?.hub;
    const instructorUid = profile?.uid;
    if (!hub || !instructorUid) return;

    const studentUid = newStudentUid;
    const title = newTitle.trim();
    const summary = newSummary.trim();
    const scoreNumber = Number(newScore);
    const score = newScore.trim() === "" || Number.isNaN(scoreNumber) ? null : scoreNumber;

    if (!studentUid || !title) return;

    setCreating(true);
    try {
      if (studentUid === "__all__") {
        const hubStudents = students.filter((s) => s.hub === hub);
        await Promise.all(
          hubStudents.map((s) =>
            addDoc(collection(firestore, "assessments"), {
              hub,
              studentUid: s.uid,
              instructorUid,
              title,
              summary,
              score,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }),
          ),
        );
      } else {
        const created = await addDoc(collection(firestore, "assessments"), {
          hub,
          studentUid,
          instructorUid,
          title,
          summary,
          score,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setAssessments((prev) => [
          {
            id: created.id,
            hub,
            studentUid,
            instructorUid,
            title,
            summary,
            score,
            createdAt: Date.now(),
          },
          ...prev,
        ]);
      }
    } finally {
      setCreating(false);
    }

    setNewStudentUid("");
    setNewTitle("");
    setNewSummary("");
    setNewScore("");
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Assessments</h1>
          <p className="text-muted-foreground mt-1">Create and review student assessments.</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle>Assessments</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={!profile?.hub || studentsLoading || !!studentsError}>
                    Create assessment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New assessment</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Student</div>
                      <Select value={newStudentUid} onValueChange={setNewStudentUid}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a student" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">All students in hub</SelectItem>
                          {students.map((s) => (
                            <SelectItem key={s.uid} value={s.uid}>
                              {s.displayName ?? s.email ?? s.uid}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Title</div>
                      <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Assessment title" />
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Summary</div>
                      <Textarea
                        value={newSummary}
                        onChange={(e) => setNewSummary(e.target.value)}
                        placeholder="What did they do well? What needs improvement?"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Score (optional)</div>
                      <Input value={newScore} onChange={(e) => setNewScore(e.target.value)} placeholder="e.g. 82" />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button onClick={() => void createAssessment()} disabled={!newStudentUid || !newTitle.trim() || creating}>
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!profile?.hub && (
              <div className="text-sm text-muted-foreground">Choose a hub in onboarding to create assessments.</div>
            )}

            {profile?.hub && (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="text-sm text-muted-foreground">Hub: {profile.hub}</div>
                <div className="w-full max-w-sm">
                  <Input placeholder="Search by student or title…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
            )}

            {profile?.hub && loading && <div className="text-sm text-muted-foreground">Loading…</div>}
            {profile?.hub && !loading && error && (
              <Card className="border-border">
                <CardContent className="p-4 space-y-2">
                  <div className="font-medium text-foreground">{friendlyFirestoreError(error).title}</div>
                  <div className="text-sm text-muted-foreground">{friendlyFirestoreError(error).body}</div>
                </CardContent>
              </Card>
            )}

            {profile?.hub && !loading && !error && filtered.length === 0 && (
              <div className="text-sm text-muted-foreground">No assessments yet.</div>
            )}

            {profile?.hub && !loading && !error && filtered.length > 0 && (
              <div className="space-y-3">
                {filtered.map((a) => {
                  const student = a.studentUid ? studentLookup[a.studentUid] : undefined;
                  const brief = (a.summary ?? "").trim().slice(0, 120);
                  return (
                    <div key={a.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">{a.title ?? "Assessment"}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Sent to: {student?.displayName ?? student?.email ?? a.studentUid ?? "—"}
                          </div>
                          <div className="text-sm text-muted-foreground mt-2">
                            {brief ? `${brief}${(a.summary ?? "").trim().length > brief.length ? "…" : ""}` : "No overview yet."}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-sm text-muted-foreground">{typeof a.score === "number" ? `Score: ${a.score}` : ""}</div>
                          <Button type="button" size="sm" variant="outline" onClick={() => setOpenId(a.id)}>
                            Open
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Dialog open={!!openId} onOpenChange={(v) => (v ? null : setOpenId(null))}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{openAssessment?.title ?? "Assessment"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Sent to: {openAssessment?.studentUid ? (studentLookup[openAssessment.studentUid]?.displayName ?? studentLookup[openAssessment.studentUid]?.email ?? openAssessment.studentUid) : "—"}
                  </div>
                  {typeof openAssessment?.score === "number" ? (
                    <div className="text-sm text-muted-foreground">Score: {openAssessment.score}</div>
                  ) : null}
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {(openAssessment?.summary ?? "").trim() || "No report content yet."}
                  </div>
                  <div className="text-xs text-muted-foreground">ID: {openAssessment?.id ?? "—"}</div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

type StudentRow = {
  uid: string;
  displayName: string | null;
  email: string | null;
  hub: string | null;
};

type AssessmentDoc = {
  title?: string;
  summary?: string;
  score?: number;
  studentUid?: string;
  instructorUid?: string;
  hub?: string;
  createdAt?: unknown;
};

type AssessmentRow = {
  id: string;
  title: string | null;
  summary: string | null;
  score: number | null;
  studentUid: string | null;
  instructorUid: string | null;
  hub: string | null;
  createdAt?: unknown;
};
