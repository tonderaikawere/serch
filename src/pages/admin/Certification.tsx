import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScoreRing } from "@/components/ui/score-ring";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { 
  Award, 
  Download, 
  Share2, 
  ExternalLink,
  CheckCircle2,
  FileText,
  Trophy,
  Star,
  Copy,
  Linkedin
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const skills = [
  { name: "Keyword Research", score: 85, level: "Advanced" },
  { name: "Content Structure", score: 92, level: "Expert" },
  { name: "Technical SEO", score: 78, level: "Intermediate" },
  { name: "Schema Markup", score: 88, level: "Advanced" },
  { name: "AEO Optimization", score: 72, level: "Intermediate" },
  { name: "Meta Optimization", score: 95, level: "Expert" },
];

const completedScenarios = [
  { name: "Local Business SEO", score: 85, date: "Jan 15, 2026" },
  { name: "E-commerce Optimization", score: 78, date: "Jan 22, 2026" },
  { name: "Blog Content Strategy", score: 92, date: "Feb 1, 2026" },
];

export default function Certification() {
  const overallScore = 82;
  const shareableLink = "https://seo-trainer.app/cert/abc123xyz";

  const [courses, setCourses] = useState<Array<{ id: string; title: string | null; modules: Array<{ id: string; title: string | null; order: number | null }> }>>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCoursesLoading(true);
      setCoursesError(null);
      try {
        const coursesSnap = await getDocs(collection(firestore, "courses"));
        const rows = await Promise.all(
          coursesSnap.docs.map(async (c) => {
            const cData = c.data() as { title?: string };
            const modulesRef = collection(firestore, "courses", c.id, "modules");
            let modulesSnap;
            try {
              modulesSnap = await getDocs(query(modulesRef, orderBy("order", "asc")));
            } catch {
              modulesSnap = await getDocs(modulesRef);
            }
            const modules = modulesSnap.docs.map((m) => {
              const mData = m.data() as { title?: string; order?: number };
              return { id: m.id, title: mData.title ?? null, order: typeof mData.order === "number" ? mData.order : null };
            });
            return { id: c.id, title: cData.title ?? null, modules };
          }),
        );
        if (!cancelled) setCourses(rows);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setCoursesError(msg);
      } finally {
        if (!cancelled) setCoursesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalModules = useMemo(() => courses.reduce((sum, c) => sum + c.modules.length, 0), [courses]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    toast({
      title: "Link copied!",
      description: "Share your certification with others.",
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Certification & Export</h1>
            <p className="text-muted-foreground mt-1">
              Your achievements and portfolio-ready case studies
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Export All
            </Button>
          </div>
        </div>

        {/* Certificate Preview */}
        <Card className="overflow-hidden">
          <div className="relative bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 p-8">
            {/* Decorative elements */}
            <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-primary/30" />
            <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-primary/30" />
            <div className="absolute bottom-4 left-4 w-16 h-16 border-b-2 border-l-2 border-primary/30" />
            <div className="absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 border-primary/30" />

            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full gradient-seo flex items-center justify-center shadow-glow-primary">
                  <Award className="w-10 h-10 text-primary-foreground" />
                </div>
              </div>
              
              <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">
                Certificate of Completion
              </p>
              <h2 className="text-3xl font-display font-bold text-foreground mb-2">
                SEO & AEO Professional
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                This certifies that <span className="font-semibold text-foreground">John Doe</span> has successfully completed
              </p>
              <p className="text-xl font-semibold text-primary mb-6">
                The SEO + AEO Training Simulation
              </p>

              <div className="flex justify-center gap-8 mb-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">{overallScore}%</p>
                  <p className="text-sm text-muted-foreground">Overall Score</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">3</p>
                  <p className="text-sm text-muted-foreground">Scenarios Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">12</p>
                  <p className="text-sm text-muted-foreground">Modules Finished</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1 text-accent mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`w-5 h-5 ${star <= 4 ? "fill-current" : ""}`} />
                ))}
              </div>

              <p className="text-sm text-muted-foreground">
                Issued on February 5, 2026
              </p>
            </div>
          </div>
          
          <CardContent className="p-4 bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ExternalLink className="w-4 h-4" />
              <span className="font-mono">{shareableLink}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCopyLink}>
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
              <Button variant="ghost" size="sm">
                <Linkedin className="w-4 h-4 mr-1" />
                LinkedIn
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Learning Modules
              </CardTitle>
              <CardDescription>The curriculum content included in your certificates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {coursesLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
              {!coursesLoading && coursesError && <div className="text-sm text-muted-foreground break-words">{coursesError}</div>}
              {!coursesLoading && !coursesError && courses.length === 0 && (
                <div className="text-sm text-muted-foreground">No courses found.</div>
              )}

              {!coursesLoading && !coursesError && courses.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">Total modules: {totalModules}</div>
                  {courses.map((c) => (
                    <div key={c.id} className="rounded-lg border border-border p-4">
                      <div className="font-medium text-foreground">{c.title ?? "Course"}</div>
                      <div className="text-xs text-muted-foreground mt-1">Modules: {c.modules.length}</div>
                      <div className="mt-3 grid sm:grid-cols-2 gap-2">
                        {c.modules.slice(0, 8).map((m) => (
                          <div key={m.id} className="rounded-lg bg-muted/30 p-2">
                            <div className="text-xs text-muted-foreground">Module {m.order ?? "—"}</div>
                            <div className="text-sm font-medium text-foreground truncate">{m.title ?? "Module"}</div>
                          </div>
                        ))}
                      </div>
                      {c.modules.length > 8 && (
                        <div className="text-xs text-muted-foreground mt-3">+{c.modules.length - 8} more modules</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skill Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Skill Breakdown
              </CardTitle>
              <CardDescription>Your proficiency in each SEO/AEO area</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {skills.map((skill) => (
                <div key={skill.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{skill.name}</span>
                    <Badge variant={
                      skill.level === "Expert" ? "default" :
                      skill.level === "Advanced" ? "secondary" : "outline"
                    }>
                      {skill.level}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={skill.score} className="flex-1 h-2" />
                    <span className="text-sm font-medium w-12 text-right">{skill.score}%</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Completed Scenarios */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                Completed Scenarios
              </CardTitle>
              <CardDescription>Your simulation history</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {completedScenarios.map((scenario, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <ScoreRing score={scenario.score} size={50} variant="seo" />
                    <div>
                      <p className="font-medium text-foreground">{scenario.name}</p>
                      <p className="text-sm text-muted-foreground">{scenario.date}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <FileText className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Export Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Export Options
            </CardTitle>
            <CardDescription>Download your achievements and case studies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="p-6 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all text-left group">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Award className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Certificate PDF</h3>
                <p className="text-sm text-muted-foreground">
                  High-resolution certificate for your portfolio
                </p>
              </button>

              <button className="p-6 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all text-left group">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Case Study Report</h3>
                <p className="text-sm text-muted-foreground">
                  Detailed analysis of your simulation work
                </p>
              </button>

              <button className="p-6 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all text-left group">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Trophy className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Achievement Badge</h3>
                <p className="text-sm text-muted-foreground">
                  Social media badge to showcase your skills
                </p>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
