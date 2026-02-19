import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LessonViewer } from "@/components/learning/LessonViewer";
import { lessonContent, getLessonContent, getModuleProgress } from "@/data/lessonContent";
import { useSimulation } from "@/contexts/SimulationContext";
import { cn } from "@/lib/utils";
import { 
  BookOpen, 
  Play, 
  CheckCircle2, 
  Clock, 
  Target,
  Search,
  FileText,
  Bot,
  Code,
  Zap,
  ArrowRight,
  LucideIcon
} from "lucide-react";

interface ModuleConfig {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  duration: string;
  lessonIds: { id: string; title: string; duration: string }[];
}

const moduleConfigs: ModuleConfig[] = [
  {
    id: "search-fundamentals",
    title: "Search Fundamentals",
    description: "Understand how search engines discover, crawl, and index web content",
    icon: Search,
    duration: "15 min",
    lessonIds: [
      { id: "how-search-engines-work", title: "How Search Engines Work", duration: "5 min" },
      { id: "crawling-indexing-explained", title: "Crawling & Indexing Explained", duration: "5 min" },
      { id: "the-ranking-process", title: "The Ranking Process", duration: "5 min" },
    ],
  },
  {
    id: "keywords-intent",
    title: "Keywords & Search Intent",
    description: "Master keyword research and understand what users really want",
    icon: Target,
    duration: "20 min",
    lessonIds: [
      { id: "keywords-vs-entities", title: "Keywords vs Entities", duration: "5 min" },
      { id: "understanding-search-intent", title: "Understanding Search Intent", duration: "5 min" },
      { id: "informational-vs-transactional", title: "Informational vs Transactional Queries", duration: "5 min" },
      { id: "building-keyword-clusters", title: "Building Keyword Clusters", duration: "5 min" },
    ],
  },
  {
    id: "content-structure",
    title: "Content Structure & Hierarchy",
    description: "Learn to structure content for both users and search engines",
    icon: FileText,
    duration: "15 min",
    lessonIds: [
      { id: "heading-hierarchy", title: "Heading Hierarchy (H1-H6)", duration: "5 min" },
      { id: "content-readability", title: "Content Readability", duration: "5 min" },
      { id: "internal-linking-strategy", title: "Internal Linking Strategy", duration: "5 min" },
    ],
  },
  {
    id: "aeo-fundamentals",
    title: "AEO Fundamentals",
    description: "Optimize content for AI-powered answer engines",
    icon: Bot,
    duration: "20 min",
    lessonIds: [
      { id: "what-is-aeo", title: "What is Answer Engine Optimization?", duration: "5 min" },
      { id: "how-ai-extracts-answers", title: "How AI Extracts Answers", duration: "5 min" },
      { id: "writing-for-featured-snippets", title: "Writing for Featured Snippets", duration: "5 min" },
      { id: "faq-qa-optimization", title: "FAQ & Q&A Optimization", duration: "5 min" },
    ],
  },
  {
    id: "structured-data",
    title: "Structured Data & Schema",
    description: "Help search engines understand your content with schema markup",
    icon: Code,
    duration: "15 min",
    lessonIds: [
      { id: "intro-to-schema", title: "Introduction to Schema.org", duration: "5 min" },
      { id: "faq-schema", title: "FAQ Schema Implementation", duration: "5 min" },
      { id: "article-product-schema", title: "Article & Product Schema", duration: "5 min" },
    ],
  },
  {
    id: "technical-seo",
    title: "Technical SEO Essentials",
    description: "Master the technical aspects that affect search performance",
    icon: Zap,
    duration: "20 min",
    lessonIds: [
      { id: "page-speed-cwv", title: "Page Speed & Core Web Vitals", duration: "5 min" },
      { id: "mobile-first-indexing", title: "Mobile-First Indexing", duration: "5 min" },
      { id: "crawl-budget-optimization", title: "Crawl Budget Optimization", duration: "5 min" },
      { id: "fixing-technical-issues", title: "Fixing Common Technical Issues", duration: "5 min" },
    ],
  },
];

export default function LearningModules() {
  const { completedLessons, completeLesson } = useSimulation();
  const [activeLesson, setActiveLesson] = useState<{ moduleId: string; lessonId: string } | null>(null);

  const getNextIncompleteLesson = () => {
    for (const module of moduleConfigs) {
      for (const lesson of module.lessonIds) {
        const fullId = `${module.id}/${lesson.id}`;
        if (!completedLessons.includes(fullId)) {
          const content = getLessonContent(module.id, lesson.id);
          if (content) {
            return { moduleId: module.id, lessonId: lesson.id, title: lesson.title };
          }
        }
      }
    }
    return null;
  };

  const calculateModuleProgress = (moduleId: string, lessonIds: { id: string }[]) => {
    const completed = lessonIds.filter(l => 
      completedLessons.includes(`${moduleId}/${l.id}`)
    ).length;
    return Math.round((completed / lessonIds.length) * 100);
  };

  const totalProgress = Math.round(
    moduleConfigs.reduce((acc, m) => acc + calculateModuleProgress(m.id, m.lessonIds), 0) / moduleConfigs.length
  );

  const nextLesson = getNextIncompleteLesson();
  const nextFullId = nextLesson ? `${nextLesson.moduleId}/${nextLesson.lessonId}` : null;

  const handleStartLesson = (moduleId: string, lessonId: string) => {
    const content = getLessonContent(moduleId, lessonId);
    if (content) {
      setActiveLesson({ moduleId, lessonId });
    }
  };

  const handleCompleteLesson = () => {
    if (activeLesson) {
      completeLesson(`${activeLesson.moduleId}/${activeLesson.lessonId}`);
      setActiveLesson(null);
    }
  };

  // Show lesson viewer if a lesson is active
  if (activeLesson) {
    const content = getLessonContent(activeLesson.moduleId, activeLesson.lessonId);
    if (content) {
      return (
        <DashboardLayout>
          <div className="p-6">
            <LessonViewer
              lessonTitle={content.lesson.title}
              moduleTitle={content.module.title}
              moduleId={activeLesson.moduleId}
              lessonId={activeLesson.lessonId}
              steps={content.lesson.steps}
              onComplete={handleCompleteLesson}
              onBack={() => setActiveLesson(null)}
            />
          </div>
        </DashboardLayout>
      );
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Learning Modules</h1>
            <p className="text-muted-foreground mt-1">
              Master SEO & AEO concepts through bite-sized lessons
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Overall Progress</p>
              <p className="text-2xl font-bold text-primary">{totalProgress}%</p>
            </div>
            <div className="w-24">
              <Progress value={totalProgress} className="h-2" />
            </div>
          </div>
        </div>

        {/* Quick Start */}
        {nextLesson && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl gradient-seo flex items-center justify-center">
                    <Play className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Continue Learning</h3>
                    <p className="text-sm text-muted-foreground">
                      Pick up where you left off: "{nextLesson.title}"
                    </p>
                  </div>
                </div>
                <Button onClick={() => handleStartLesson(nextLesson.moduleId, nextLesson.lessonId)}>
                  Resume Lesson
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Module List */}
        <div className="grid gap-4">
          {moduleConfigs.map((module) => {
            const progress = calculateModuleProgress(module.id, module.lessonIds);
            return (
              <Card key={module.id} className="overflow-hidden">
                <Accordion type="single" collapsible>
                  <AccordionItem value={module.id} className="border-0">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          progress === 100 
                            ? "bg-success/20" 
                            : progress > 0 
                              ? "gradient-seo" 
                              : "bg-muted"
                        }`}>
                          {progress === 100 ? (
                            <CheckCircle2 className="w-6 h-6 text-success" />
                          ) : (
                            <module.icon className={`w-6 h-6 ${
                              progress > 0 ? "text-primary-foreground" : "text-muted-foreground"
                            }`} />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{module.title}</h3>
                            {progress === 100 && (
                              <Badge variant="default" className="bg-success text-success-foreground">
                                Completed
                              </Badge>
                            )}
                            {progress > 0 && progress < 100 && (
                              <Badge variant="secondary">In Progress</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{module.description}</p>
                        </div>
                        <div className="flex items-center gap-4 mr-4">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {module.duration}
                          </div>
                          <div className="w-24">
                            <Progress value={progress} className="h-2" />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {progress}%
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="px-6 pb-4 space-y-2">
                        {module.lessonIds.map((lesson, index) => {
                          const isCompleted = completedLessons.includes(`${module.id}/${lesson.id}`);
                          const hasContent = !!getLessonContent(module.id, lesson.id);
                          const fullId = `${module.id}/${lesson.id}`;
                          const isLocked = !isCompleted && !!nextFullId && fullId !== nextFullId;
                          return (
                            <div
                              key={lesson.id}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-lg transition-colors",
                                isLocked ? "bg-muted/20" : "bg-muted/30 hover:bg-muted/50",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                  isCompleted ? "bg-success" : "border-2 border-muted-foreground/30"
                                }`}>
                                  {isCompleted ? (
                                    <CheckCircle2 className="w-4 h-4 text-success-foreground" />
                                  ) : (
                                    <span className="text-xs text-muted-foreground">{index + 1}</span>
                                  )}
                                </div>
                                <span className={isCompleted ? "text-muted-foreground" : "text-foreground"}>
                                  {lesson.title}
                                </span>
                                {!hasContent && (
                                  <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                                )}
                                {hasContent && isLocked && (
                                  <Badge variant="outline" className="text-xs">Locked</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-muted-foreground">{lesson.duration}</span>
                                <Button 
                                  variant={isCompleted ? "ghost" : "default"} 
                                  size="sm"
                                  disabled={!hasContent || isLocked}
                                  onClick={() => handleStartLesson(module.id, lesson.id)}
                                >
                                  {isCompleted ? "Review" : "Start"}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            );
          })}
        </div>

        {/* Learning Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Learning Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium text-foreground mb-2">Theory + Practice</h4>
                <p className="text-sm text-muted-foreground">
                  Complete lessons then immediately apply concepts in the Page Builder
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium text-foreground mb-2">Focus on Intent</h4>
                <p className="text-sm text-muted-foreground">
                  Always consider what users are really searching for, not just keywords
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium text-foreground mb-2">Test & Iterate</h4>
                <p className="text-sm text-muted-foreground">
                  Use the Search Simulation to see how changes affect rankings
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
