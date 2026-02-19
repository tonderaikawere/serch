import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { firestore } from "@/lib/firebase";

type QuestionDoc = {
  prompt?: string;
  choices?: string[];
  correctIndex?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export default function InstructorModuleQuestions() {
  const { courseId, moduleId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Array<{ id: string; data: QuestionDoc }>>([]);

  const [prompt, setPrompt] = useState("");
  const [choiceA, setChoiceA] = useState("");
  const [choiceB, setChoiceB] = useState("");
  const [choiceC, setChoiceC] = useState("");
  const [choiceD, setChoiceD] = useState("");
  const [correct, setCorrect] = useState<0 | 1 | 2 | 3>(0);

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

  async function addQuestion() {
    if (!courseId || !moduleId) return;
    const p = prompt.trim();
    const choices = [choiceA, choiceB, choiceC, choiceD].map((x) => x.trim());
    if (!p || choices.some((x) => !x)) return;

    const ref = collection(firestore, "courses", courseId, "modules", moduleId, "questions");
    const created = await addDoc(ref, {
      prompt: p,
      choices,
      correctIndex: correct,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setQuestions((prev) => [
      { id: created.id, data: { prompt: p, choices, correctIndex: correct } },
      ...prev,
    ]);

    setPrompt("");
    setChoiceA("");
    setChoiceB("");
    setChoiceC("");
    setChoiceD("");
    setCorrect(0);
  }

  async function removeQuestion(questionId: string) {
    if (!courseId || !moduleId) return;
    await deleteDoc(doc(firestore, "courses", courseId, "modules", moduleId, "questions", questionId));
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Module Questions</h1>
            <p className="text-muted-foreground mt-1">Add questions for the 25-question module test.</p>
          </div>
          {courseId && (
            <Button asChild variant="outline">
              <Link to={`/instructors/courses/${courseId}`}>Back to course</Link>
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add question</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Prompt</Label>
              <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Question text" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Choice A</Label>
                <Input value={choiceA} onChange={(e) => setChoiceA(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Choice B</Label>
                <Input value={choiceB} onChange={(e) => setChoiceB(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Choice C</Label>
                <Input value={choiceC} onChange={(e) => setChoiceC(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Choice D</Label>
                <Input value={choiceD} onChange={(e) => setChoiceD(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Correct answer</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {[0, 1, 2, 3].map((i) => (
                  <Button key={i} type="button" variant={correct === i ? "default" : "outline"} onClick={() => setCorrect(i as 0 | 1 | 2 | 3)}>
                    {String.fromCharCode(65 + i)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Button onClick={() => void addQuestion()} disabled={!prompt.trim() || !choiceA.trim() || !choiceB.trim() || !choiceC.trim() || !choiceD.trim()}>
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Questions ({questions.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
            {!loading && error && <div className="text-sm text-muted-foreground break-words">{error}</div>}

            {!loading && !error && questions.length === 0 && (
              <div className="text-sm text-muted-foreground">No questions yet.</div>
            )}

            {!loading && !error && questions.length > 0 && (
              <div className="space-y-3">
                {questions.map((q) => (
                  <div key={q.id} className="rounded-lg border border-border p-4">
                    <div className="font-medium text-foreground">{q.data.prompt ?? ""}</div>
                    <div className="text-sm text-muted-foreground mt-2">
                      Correct: {typeof q.data.correctIndex === "number" ? String.fromCharCode(65 + q.data.correctIndex) : "—"}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2 space-y-1">
                      {(q.data.choices ?? []).map((c, idx) => (
                        <div key={idx}>{String.fromCharCode(65 + idx)}. {c}</div>
                      ))}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const ok = window.confirm("Delete this question?");
                          if (!ok) return;
                          void removeQuestion(q.id);
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
