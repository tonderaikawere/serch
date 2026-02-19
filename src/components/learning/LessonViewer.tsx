import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { lessonQuizzes, QuizQuestion } from "@/data/quizContent";
import { useSimulation } from "@/contexts/SimulationContext";
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  BookOpen,
  Lightbulb,
  Target,
  HelpCircle,
  XCircle
} from "lucide-react";

interface LessonStep {
  title: string;
  content: string;
  tip?: string;
  example?: string;
}

interface LessonViewerProps {
  lessonTitle: string;
  moduleTitle: string;
  moduleId?: string;
  lessonId?: string;
  steps: LessonStep[];
  onComplete: () => void;
  onBack: () => void;
}

export function LessonViewer({ 
  lessonTitle, 
  moduleTitle, 
  moduleId,
  lessonId,
  steps, 
  onComplete, 
  onBack 
}: LessonViewerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const { updateSeoScore, updateAeoScore, seoScore, aeoScore } = useSimulation();

  // Score boost mapping by module category
  const getScoreBoost = (quizAccuracy: number) => {
    const baseBoost = Math.round(quizAccuracy * 5); // 0-5 points based on quiz accuracy
    return Math.max(1, baseBoost);
  };

  const applyScoreBoost = (accuracy: number) => {
    const boost = getScoreBoost(accuracy);
    const isAeoModule = moduleId?.includes("aeo") || moduleId?.includes("structured-data");
    if (isAeoModule) {
      updateAeoScore(aeoScore + boost);
      updateSeoScore(seoScore + Math.ceil(boost / 2));
    } else {
      updateSeoScore(seoScore + boost);
      updateAeoScore(aeoScore + Math.ceil(boost / 2));
    }
  };

  const quizKey = moduleId && lessonId ? `${moduleId}/${lessonId}` : "";
  const quizQuestions: QuizQuestion[] = quizKey ? (lessonQuizzes[quizKey] || []) : [];
  const hasQuiz = quizQuestions.length > 0;

  const totalSteps = steps.length + (hasQuiz ? 1 : 0);
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (hasQuiz && !showQuiz) {
      setShowQuiz(true);
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (showQuiz) {
      setShowQuiz(false);
      setCurrentStep(steps.length - 1);
    } else if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSelectAnswer = (questionIdx: number, optionIdx: number) => {
    if (quizSubmitted) return;
    setQuizAnswers(prev => ({ ...prev, [questionIdx]: optionIdx }));
  };

  const handleSubmitQuiz = () => {
    setQuizSubmitted(true);
    const accuracy = quizQuestions.filter((q, i) => quizAnswers[i] === q.correctIndex).length / quizQuestions.length;
    applyScoreBoost(accuracy);
  };

  const allAnswered = quizQuestions.length > 0 && Object.keys(quizAnswers).length === quizQuestions.length;
  const correctCount = quizQuestions.filter((q, i) => quizAnswers[i] === q.correctIndex).length;
  const passed = correctCount >= Math.ceil(quizQuestions.length * 0.5);

  const step = !showQuiz ? steps[currentStep] : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">{moduleTitle}</p>
            <h1 className="text-2xl font-bold text-foreground">{lessonTitle}</h1>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm">
          {showQuiz ? "Quiz" : `Step ${currentStep + 1} of ${steps.length}`}
        </Badge>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
      </div>

      {/* Lesson Content */}
      {step && !showQuiz && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {step.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose prose-sm max-w-none text-foreground">
              <p className="text-base leading-relaxed whitespace-pre-line">
                {step.content}
              </p>
            </div>

            {step.tip && (
              <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-accent mb-1">Pro Tip</p>
                    <p className="text-sm text-muted-foreground">{step.tip}</p>
                  </div>
                </div>
              </div>
            )}

            {step.example && (
              <div className="p-4 bg-muted/50 border border-border rounded-lg">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground mb-1">Example</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {step.example}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quiz */}
      {showQuiz && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Knowledge Check
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {quizSubmitted && (
              <div className={`p-4 rounded-lg border ${
                passed 
                  ? "bg-success/10 border-success/20" 
                  : "bg-warning/10 border-warning/20"
              }`}>
                <p className="font-medium text-foreground">
                  {passed 
                    ? `🎉 Great job! You got ${correctCount}/${quizQuestions.length} correct.`
                    : `You got ${correctCount}/${quizQuestions.length}. Review the explanations below.`
                  }
                </p>
              </div>
            )}

            {quizQuestions.map((q, qIdx) => (
              <div key={qIdx} className="space-y-3">
                <p className="font-medium text-foreground">{qIdx + 1}. {q.question}</p>
                <div className="space-y-2">
                  {q.options.map((option, oIdx) => {
                    const isSelected = quizAnswers[qIdx] === oIdx;
                    const isCorrect = oIdx === q.correctIndex;
                    const showResult = quizSubmitted;

                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleSelectAnswer(qIdx, oIdx)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center gap-3 ${
                          showResult && isCorrect
                            ? "border-success bg-success/10"
                            : showResult && isSelected && !isCorrect
                              ? "border-destructive bg-destructive/10"
                              : isSelected
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-muted-foreground/50"
                        }`}
                      >
                        {showResult && isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                        )}
                        {showResult && isSelected && !isCorrect && (
                          <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                        )}
                        {!showResult && (
                          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                            isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                          }`} />
                        )}
                        <span className="text-sm text-foreground">{option}</span>
                      </button>
                    );
                  })}
                </div>
                {quizSubmitted && (
                  <p className="text-sm text-muted-foreground pl-7">
                    💡 {q.explanation}
                  </p>
                )}
              </div>
            ))}

            {!quizSubmitted && (
              <Button 
                onClick={handleSubmitQuiz} 
                disabled={!allAnswered}
                className="w-full"
              >
                Submit Answers
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button 
          variant="outline" 
          onClick={handlePrev}
          disabled={currentStep === 0 && !showQuiz}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-1">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => { setShowQuiz(false); setCurrentStep(index); }}
              className={`w-2 h-2 rounded-full transition-colors ${
                !showQuiz && index === currentStep 
                  ? "bg-primary" 
                  : index < currentStep || showQuiz
                    ? "bg-primary/50" 
                    : "bg-muted"
              }`}
            />
          ))}
          {hasQuiz && (
            <button
              className={`w-2 h-2 rounded-full transition-colors ${
                showQuiz ? "bg-primary" : "bg-muted"
              }`}
            />
          )}
        </div>

        {showQuiz ? (
          <Button 
            onClick={onComplete}
            disabled={!quizSubmitted || !passed}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Complete Lesson
          </Button>
        ) : (
          <Button onClick={handleNext}>
            {currentStep === steps.length - 1 && !hasQuiz ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete Lesson
              </>
            ) : (
              <>
                {currentStep === steps.length - 1 ? "Take Quiz" : "Next"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
