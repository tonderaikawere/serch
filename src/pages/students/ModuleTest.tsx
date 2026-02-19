import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { collection, doc, getDocs, increment, serverTimestamp, setDoc } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

type QuestionDoc = {
  prompt?: string;
  choices?: string[];
  correctIndex?: number;
};

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function StudentModuleTest() {
  const { profile } = useAuth();
  const { courseId, moduleId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Array<{ id: string; data: QuestionDoc }>>([]);

  const [seed, setSeed] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const uid = profile?.uid;

  useEffect(() => {
    let cancelled = false;
    if (!courseId || !moduleId) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const ref = collection(firestore, "courses", courseId, "modules", moduleId, "questions");
        const snap = await getDocs(ref);
        const next = snap.docs.map((d) => ({ id: d.id, data: d.data() as QuestionDoc }));
        if (!cancelled) setQuestions(next);
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
  }, [courseId, moduleId]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") {
        setSubmitted(false);
        setAnswers({});
        setSeed((s) => s + 1);
      }
    };
    window.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onVisibility);
    return () => {
      window.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onVisibility);
    };
  }, []);

  const selectedQuestions = useMemo(() => {
    const shuffled = shuffle(questions);
    return shuffled.slice(0, 25);
  }, [questions, seed]);

  const answeredCount = Object.keys(answers).length;

  const score = useMemo(() => {
    if (!submitted) return 0;
    let correct = 0;
    for (const q of selectedQuestions) {
      const chosen = answers[q.id];
      if (typeof chosen === "number" && chosen === q.data.correctIndex) correct += 1;
    }
    return correct;
  }, [answers, selectedQuestions, submitted]);

  const passed = submitted && score >= 20;

  async function submit() {
    let scoreNow = 0;
    for (const q of selectedQuestions) {
      const chosen = answers[q.id];
      if (typeof chosen === "number" && chosen === q.data.correctIndex) scoreNow += 1;
    }

    setSubmitted(true);

    if (!uid || !courseId || !moduleId) return;

    const progressRef = doc(firestore, "students", uid, "courseProgress", courseId);
    await setDoc(
      progressRef,
      {
        courseId,
        currentModuleId: moduleId,
        lastModuleTest: {
          moduleId,
          score: scoreNow,
          total: selectedQuestions.length,
          passed: scoreNow >= 20,
          submittedAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ).catch(() => {});
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Module Test</h1>
            <p className="text-muted-foreground mt-1">25 questions. Pass mark: 80% (20/25). Leaving the tab resets the test.</p>
          </div>
          {courseId && (
            <Button asChild variant="outline">
              <Link to={`/students/courses/${courseId}`}>Back to course</Link>
            </Button>
          )}
        </div>

        {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!loading && error && <div className="text-sm text-muted-foreground break-words">{error}</div>}

        {!loading && !error && questions.length < 25 && (
          <Card>
            <CardHeader>
              <CardTitle>Not ready</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">This module needs at least 25 questions to start the test.</div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && questions.length >= 25 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle>Questions</CardTitle>
                <div className="w-full sm:w-[240px]">
                  <Progress value={(answeredCount / 25) * 100} />
                  <div className="text-xs text-muted-foreground mt-2">{answeredCount}/25 answered</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedQuestions.map((q, idx) => (
                <div key={q.id} className="space-y-3 rounded-lg border border-border p-4">
                  <div className="font-medium text-foreground">{idx + 1}. {q.data.prompt ?? ""}</div>
                  <div className="grid gap-2">
                    {(q.data.choices ?? []).map((c, i) => {
                      const chosen = answers[q.id] === i;
                      const isCorrect = submitted && i === q.data.correctIndex;
                      const isWrongChoice = submitted && chosen && i !== q.data.correctIndex;
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={submitted}
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
                          className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                            chosen ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                          } ${isCorrect ? "border-success bg-success/10" : ""} ${isWrongChoice ? "border-destructive bg-destructive/10" : ""}`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm text-muted-foreground">
                  {submitted ? `Score: ${score}/25` : "Submit when ready."}
                  {submitted && (passed ? " (Passed)" : " (Failed)")}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSubmitted(false);
                      setAnswers({});
                      setSeed((s) => s + 1);
                    }}
                  >
                    Reset
                  </Button>
                  <Button onClick={() => void submit()} disabled={submitted || answeredCount < 25}>
                    Submit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
