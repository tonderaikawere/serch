import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { firestore } from "@/lib/firebase";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";

function isFirestoreMissingIndexError(message: string) {
  return message.toLowerCase().includes("requires an index");
}

function friendlyFirestoreError(message: string) {
  if (isFirestoreMissingIndexError(message)) {
    return {
      title: "Setup needed",
      body: "Your database needs a Firestore index for this view. Your assessments will still load, but sorting may be limited.",
    };
  }
  return { title: "Something went wrong", body: message };
}

export default function StudentAssessments() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const hub = profile?.hub;
    const uid = profile?.uid;

    if (!hub || !uid) {
      setAssessments([]);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const base = query(collection(firestore, "assessments"), where("hub", "==", hub), where("studentUid", "==", uid), limit(200));
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
            score: typeof data.score === "number" ? data.score : null,
            instructorUid: data.instructorUid ?? null,
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
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.hub, profile?.uid]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return assessments;
    return assessments.filter((a) => {
      const title = (a.title ?? "").toLowerCase();
      const summary = (a.summary ?? "").toLowerCase();
      return title.includes(q) || summary.includes(q);
    });
  }, [assessments, searchTerm]);

  const openAssessment = useMemo(() => {
    if (!openId) return null;
    return assessments.find((a) => a.id === openId) ?? null;
  }, [assessments, openId]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Assessments</h1>
          <p className="text-muted-foreground mt-1">Your instructor feedback and scores.</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle>My assessments</CardTitle>
              <div className="w-full sm:w-auto sm:min-w-[280px]">
                <Input placeholder="Search assessments…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!profile?.hub && <div className="text-sm text-muted-foreground">Choose a hub in onboarding to view assessments.</div>}

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
                  const brief = (a.summary ?? "").trim().slice(0, 120);
                  return (
                    <div key={a.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">{a.title ?? "Assessment"}</div>
                          <div className="text-sm text-muted-foreground mt-2">
                            {brief ? `${brief}${(a.summary ?? "").trim().length > brief.length ? "…" : ""}` : "No overview yet."}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-sm text-muted-foreground whitespace-nowrap">
                            {typeof a.score === "number" ? `Score: ${a.score}` : ""}
                          </div>
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
  instructorUid: string | null;
  createdAt?: unknown;
};
