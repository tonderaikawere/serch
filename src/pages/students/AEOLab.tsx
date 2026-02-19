import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScoreRing } from "@/components/ui/score-ring";
import { useAuth } from "@/contexts/AuthContext";
import { firestore } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { 
  MessageSquare, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Target,
  Lightbulb,
  Bot,
  FileText
} from "lucide-react";
import { useState } from "react";

const targetQuestions = [
  { id: 1, question: "What is SEO?", intent: "Informational", difficulty: "Easy", selected: false },
  { id: 2, question: "How do I improve Core Web Vitals?", intent: "Informational", difficulty: "Medium", selected: false },
  { id: 3, question: "What is structured data and why does it matter?", intent: "Informational", difficulty: "Hard", selected: false },
  { id: 4, question: "How do I choose the right keyword for a page?", intent: "Commercial", difficulty: "Medium", selected: false },
  { id: 5, question: "What is AEO and how is it different from SEO?", intent: "Informational", difficulty: "Easy", selected: false },
];

const clarityChecks = [
  { label: "Direct answer in first sentence", passed: true },
  { label: "Answer length optimal (40-60 words)", passed: true },
  { label: "No jargon or complex terms", passed: false },
  { label: "Factual and verifiable", passed: true },
  { label: "Structured with clear formatting", passed: false },
];

export default function AEOLab() {
  const { profile } = useAuth();
  const [questions, setQuestions] = useState(targetQuestions);
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [aeoScore, setAeoScore] = useState(72);

  const selectedQuestionText = selectedQuestion
    ? questions.find((q) => q.id === selectedQuestion)?.question ?? null
    : null;

  const saveDraft = async () => {
    const uid = profile?.uid;
    if (!uid || !selectedQuestionText || !answer.trim()) return;

    await addDoc(collection(firestore, "students", uid, "aeoDrafts"), {
      question: selectedQuestionText,
      answer: answer.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(firestore, "students", uid, "events"), {
      type: "aeo_draft_saved",
      label: "AEO draft saved",
      question: selectedQuestionText,
      createdAt: serverTimestamp(),
    });
  };

  const toggleQuestion = (id: number) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, selected: !q.selected } : q
    ));
    setSelectedQuestion(id);
  };

  const selectedCount = questions.filter(q => q.selected).length;
  const passedChecks = clarityChecks.filter(c => c.passed).length;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">AEO Question & Answer Lab</h1>
            <p className="text-muted-foreground mt-1">
              Optimize your content for AI answer engines
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ScoreRing score={aeoScore} label="AEO Score" variant="aeo" size={80} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Target Questions */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Target Questions
              </CardTitle>
              <CardDescription>
                Select questions to optimize for AI extraction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {questions.map((q) => (
                <div
                  key={q.id}
                  onClick={() => toggleQuestion(q.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    q.selected 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{q.question}</p>
                    {q.selected && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">{q.intent}</Badge>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        q.difficulty === "Easy" ? "text-success border-success" :
                        q.difficulty === "Medium" ? "text-warning border-warning" :
                        "text-destructive border-destructive"
                      }`}
                    >
                      {q.difficulty}
                    </Badge>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground text-center pt-2">
                {selectedCount} question{selectedCount !== 1 ? "s" : ""} selected
              </p>
            </CardContent>
          </Card>

          {/* Answer Editor */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Answer Editor
              </CardTitle>
              <CardDescription>
                {selectedQuestion 
                  ? `Crafting answer for: "${questions.find(q => q.id === selectedQuestion)?.question}"`
                  : "Select a question to start crafting your answer"
                }
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Textarea
                placeholder="Write a clear, concise answer that AI engines can easily extract..."
                className="min-h-[200px] resize-none"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {answer.split(/\s+/).filter(Boolean).length} words
                </span>
                <span className={`${
                  answer.length > 0 && answer.length < 200 ? "text-success" :
                  answer.length >= 200 && answer.length < 400 ? "text-warning" :
                  answer.length >= 400 ? "text-destructive" : "text-muted-foreground"
                }`}>
                  {answer.length}/400 characters
                </span>
              </div>

              <div className="flex gap-3">
                <Button className="flex-1">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze Answer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    void saveDraft().catch(() => {});
                  }}
                  disabled={!selectedQuestion || !answer.trim()}
                >
                  Save Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Clarity Checker */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                Answer Clarity Checker
              </CardTitle>
              <CardDescription>
                Automated checks for AI-friendly content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {clarityChecks.map((check, index) => (
                  <div key={index} className="flex items-center gap-3">
                    {check.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive" />
                    )}
                    <span className={`text-sm ${check.passed ? "text-foreground" : "text-muted-foreground"}`}>
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Clarity Score</span>
                  <span className="text-sm text-muted-foreground">{passedChecks}/{clarityChecks.length} passed</span>
                </div>
                <Progress value={(passedChecks / clarityChecks.length) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* AI Extraction Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                AI Extraction Preview
              </CardTitle>
              <CardDescription>
                How AI answer engines might display your content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full gradient-aeo flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">AI Answer</p>
                    <p className="text-sm text-muted-foreground">
                      {answer || "Your optimized answer will appear here as it might be displayed by an AI answer engine..."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-warning" />
                  Improvement Suggestions
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                    Consider starting with a direct, factual statement
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                    Add structured data markup for better extraction
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                    Include relevant entities and keywords naturally
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feedback Panel */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-foreground">AEO Learning Tip</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  AI answer engines prefer concise, factual responses that directly address the query. 
                  Structure your content with the most important information first, and avoid unnecessary 
                  filler words. The goal is to provide value in the first 40-60 words.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
