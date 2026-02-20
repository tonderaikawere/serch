import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  Zap, 
  Smartphone, 
  Link2, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Globe,
  Server,
  Clock,
  RefreshCw
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { firestore } from "@/lib/firebase";
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

type PageStatus = {
  id: string;
  name: string;
  url: string;
  crawled: boolean;
  indexed: boolean;
  speed: number;
  reason?: string;
};

type BrokenLinkRow = { page: string; link: string; status: number };

export default function TechnicalSEO() {
  const { profile } = useAuth();
  const uid = profile?.uid ?? null;

  const [crawlBudget, setCrawlBudget] = useState([70]);
  const [pageSpeed, setPageSpeed] = useState([75]);
  const [mobileOptimized, setMobileOptimized] = useState(true);
  const [httpsEnabled, setHttpsEnabled] = useState(true);
  const [pages, setPages] = useState<PageStatus[]>([]);
  const [brokenLinks, setBrokenLinks] = useState<BrokenLinkRow[]>([]);
  const [lastRunAt, setLastRunAt] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const lastCompletionRef = useRef(false);

  async function persistWorkspace(next: {
    crawlBudget: number;
    pageSpeed: number;
    mobileOptimized: boolean;
    httpsEnabled: boolean;
    pages: PageStatus[];
    brokenLinks: BrokenLinkRow[];
    lastRunAt: number | null;
    score: number;
    completed: boolean;
  }) {
    if (!uid) return;
    await setDoc(
      doc(firestore, "students", uid, "workspace", "technical"),
      {
        ...next,
        updatedAt: serverTimestamp(),
        completedAt: next.completed ? serverTimestamp() : null,
      },
      { merge: true },
    ).catch(() => {});
  }

  async function logEvent(type: string, label: string, meta?: Record<string, unknown>) {
    if (!uid) return;
    await addDoc(collection(firestore, "students", uid, "events"), {
      type,
      label,
      meta: meta ?? {},
      createdAt: serverTimestamp(),
    }).catch(() => {});
  }

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    void (async () => {
      const ref = doc(firestore, "students", uid, "workspace", "technical");
      const snap = await getDoc(ref).catch(() => null);
      if (cancelled || !snap || !snap.exists()) return;
      const data = snap.data() as Partial<{
        crawlBudget: number;
        pageSpeed: number;
        mobileOptimized: boolean;
        httpsEnabled: boolean;
        pages: PageStatus[];
        brokenLinks: BrokenLinkRow[];
        lastRunAt: number | null;
        score: number;
        completed: boolean;
      }>;
      if (typeof data.crawlBudget === "number") setCrawlBudget([Math.max(0, Math.min(100, data.crawlBudget))]);
      if (typeof data.pageSpeed === "number") setPageSpeed([Math.max(0, Math.min(100, data.pageSpeed))]);
      if (typeof data.mobileOptimized === "boolean") setMobileOptimized(data.mobileOptimized);
      if (typeof data.httpsEnabled === "boolean") setHttpsEnabled(data.httpsEnabled);
      if (Array.isArray(data.pages)) setPages(data.pages);
      if (Array.isArray(data.brokenLinks)) setBrokenLinks(data.brokenLinks);
      if (typeof data.lastRunAt === "number" || data.lastRunAt === null) setLastRunAt(data.lastRunAt ?? null);
      if (typeof data.score === "number") setScore(data.score);
      if (typeof data.completed === "boolean") {
        setCompleted(data.completed);
        lastCompletionRef.current = data.completed;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const computedScore = useMemo(() => {
    let s = 0;
    s += Math.round(crawlBudget[0] * 0.2);
    s += Math.round(pageSpeed[0] * 0.5);
    s += mobileOptimized ? 15 : 0;
    s += httpsEnabled ? 15 : 0;
    s -= Math.min(30, brokenLinks.length * 10);
    return Math.max(0, Math.min(100, s));
  }, [brokenLinks.length, crawlBudget, httpsEnabled, mobileOptimized, pageSpeed]);

  useEffect(() => {
    setScore(computedScore);
    const nextCompleted = computedScore >= 80;
    setCompleted(nextCompleted);
    void persistWorkspace({
      crawlBudget: crawlBudget[0],
      pageSpeed: pageSpeed[0],
      mobileOptimized,
      httpsEnabled,
      pages,
      brokenLinks,
      lastRunAt,
      score: computedScore,
      completed: nextCompleted,
    });

    if (nextCompleted && !lastCompletionRef.current) {
      lastCompletionRef.current = true;
      void logEvent("technical_completed", "Technical SEO completed", { score: computedScore });
    }
    if (!nextCompleted) {
      lastCompletionRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedScore, crawlBudget, pageSpeed, mobileOptimized, httpsEnabled, pages, brokenLinks, lastRunAt, uid]);

  const getSpeedColor = (speed: number) => {
    if (speed >= 80) return "text-success";
    if (speed >= 60) return "text-warning";
    return "text-destructive";
  };

  const getSpeedBg = (speed: number) => {
    if (speed >= 80) return "bg-success";
    if (speed >= 60) return "bg-warning";
    return "bg-destructive";
  };

  const runChecks = () => {
    const crawlOk = crawlBudget[0] >= 50;
    const blogCrawled = crawlBudget[0] >= 40;
    const aboutCrawled = crawlBudget[0] >= 30;
    const pricingCrawled = crawlBudget[0] >= 50;

    const blogIndexed = crawlBudget[0] >= 50;
    const aboutIndexed = crawlBudget[0] >= 60;
    const pricingIndexed = crawlBudget[0] >= 70;

    const basePages: PageStatus[] = [
      { id: "home", name: "Home", url: "/", crawled: true, indexed: true, speed: pageSpeed[0] },
      {
        id: "blog",
        name: "Blog",
        url: "/blog",
        crawled: blogCrawled,
        indexed: blogIndexed,
        speed: Math.max(0, pageSpeed[0] - 5),
        reason: !blogCrawled
          ? "Low crawl budget: bots may not reach deep content."
          : !blogIndexed
            ? "Crawled but not indexed yet: budget/quality signals are too weak."
            : undefined,
      },
      {
        id: "about",
        name: "About",
        url: "/about",
        crawled: aboutCrawled,
        indexed: aboutIndexed,
        speed: Math.max(0, pageSpeed[0] - 10),
        reason: !aboutCrawled
          ? "Low crawl budget: important pages may be skipped."
          : !aboutIndexed
            ? "Crawled but not indexed yet: strengthen internal links and overall quality."
            : undefined,
      },
      {
        id: "pricing",
        name: "Pricing",
        url: "/pricing",
        crawled: pricingCrawled,
        indexed: pricingIndexed,
        speed: Math.max(0, pageSpeed[0] - 8),
        reason: !pricingCrawled
          ? "Low crawl budget: commercial pages may not be revisited often."
          : !pricingIndexed
            ? "Crawled but not indexed yet: improve performance and ensure the page is mobile-ready."
            : undefined,
      },
    ];

    const nextBroken: BrokenLinkRow[] = [];
    if (!httpsEnabled) {
      nextBroken.push({ page: "Home", link: "http://your-site.test/checkout", status: 301 });
    }
    if (pageSpeed[0] < 50) {
      nextBroken.push({ page: "Blog", link: "/images/hero.jpg", status: 404 });
    }
    if (!mobileOptimized) {
      nextBroken.push({ page: "Pricing", link: "/css/mobile.css", status: 404 });
    }

    let nextScore = 0;
    nextScore += Math.round(crawlBudget[0] * 0.2);
    nextScore += Math.round(pageSpeed[0] * 0.5);
    nextScore += mobileOptimized ? 15 : 0;
    nextScore += httpsEnabled ? 15 : 0;
    nextScore -= Math.min(30, nextBroken.length * 10);
    nextScore = Math.max(0, Math.min(100, nextScore));

    setPages(basePages);
    setBrokenLinks(nextBroken);
    const ts = Date.now();
    setLastRunAt(ts);
    void logEvent("technical_check_run", "Technical SEO checks run", {
      score: nextScore,
      brokenLinks: nextBroken.length,
      crawlBudget: crawlBudget[0],
      pageSpeed: pageSpeed[0],
      mobileOptimized,
      httpsEnabled,
      crawlOk,
    });
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Technical SEO Lab</h1>
            <p className="text-muted-foreground mt-1">
              Optimize technical factors that impact search engine crawling and ranking
            </p>
          </div>
          <Button onClick={runChecks} className="gradient-accent text-accent-foreground w-full sm:w-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Run Checks
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Server className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Crawl Budget</p>
                  <p className="text-xl font-bold text-foreground">{crawlBudget[0]}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Page Speed</p>
                  <p className={`text-xl font-bold ${getSpeedColor(pageSpeed[0])}`}>{pageSpeed[0]}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mobile Ready</p>
                  <p className="text-xl font-bold text-foreground">{mobileOptimized ? "Yes" : "No"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Broken Links</p>
                  <p className={`text-xl font-bold ${brokenLinks.length > 0 ? "text-destructive" : "text-success"}`}>
                    {brokenLinks.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Simulation Controls</CardTitle>
              <CardDescription>
                Adjust technical parameters to see their impact
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Crawl Budget */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Crawl Budget</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{crawlBudget[0]}%</span>
                </div>
                <Slider
                  value={crawlBudget}
                  onValueChange={setCrawlBudget}
                  max={100}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  How much of your site search engines will crawl per visit
                </p>
              </div>

              {/* Page Speed */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Page Speed Score</span>
                  </div>
                  <span className={`text-sm ${getSpeedColor(pageSpeed[0])}`}>{pageSpeed[0]}</span>
                </div>
                <Slider
                  value={pageSpeed}
                  onValueChange={setPageSpeed}
                  max={100}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  Simulated Core Web Vitals performance score
                </p>
              </div>

              {/* Toggles */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-primary" />
                    <div>
                      <span className="font-medium text-sm">Mobile Friendly</span>
                      <p className="text-xs text-muted-foreground">Responsive design enabled</p>
                    </div>
                  </div>
                  <Switch checked={mobileOptimized} onCheckedChange={setMobileOptimized} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    <div>
                      <span className="font-medium text-sm">HTTPS Enabled</span>
                      <p className="text-xs text-muted-foreground">Secure connection active</p>
                    </div>
                  </div>
                  <Switch checked={httpsEnabled} onCheckedChange={setHttpsEnabled} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Page Status */}
          <Card>
            <CardHeader>
              <CardTitle>Page Crawl Status</CardTitle>
              <CardDescription>
                Current indexing status of your pages
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pages.length === 0 ? (
                <div className="text-sm text-muted-foreground">No pages tracked yet.</div>
              ) : (
                <div className="space-y-3">
                  {pages.map((page) => (
                    <div key={page.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full ${page.indexed ? "bg-success" : page.crawled ? "bg-warning" : "bg-destructive"}`} />
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground">{page.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{page.url}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-1">
                          {page.crawled ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                          <span className="text-xs text-muted-foreground">Crawled</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {page.indexed ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                          <span className="text-xs text-muted-foreground">Indexed</span>
                        </div>
                        <div className="w-24 sm:w-16">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-medium ${getSpeedColor(page.speed)}`}>{page.speed}</span>
                          </div>
                          <Progress value={page.speed} className={`h-1.5 ${getSpeedBg(page.speed)}`} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Internal Linking Map */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                Internal Link Structure
              </CardTitle>
              <CardDescription>
                How your pages connect to each other
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Link structure insights will appear once page/link tracking is connected.
              </div>
            </CardContent>
          </Card>

          {/* Broken Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Broken Links
              </CardTitle>
              <CardDescription>
                Track broken links that affect crawling and user experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              {brokenLinks.length > 0 ? (
                <div className="space-y-3">
                  {brokenLinks.map((link, index) => (
                    <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground">{link.page}</p>
                        <p className="text-xs text-muted-foreground truncate">{link.link}</p>
                      </div>
                      <div className="flex items-center justify-end">
                        <Badge variant="destructive">{link.status}</Badge>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full mt-4" disabled>
                    Fix Broken Links
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
                  <p className="text-foreground font-medium">No broken links logged yet</p>
                  <p className="text-sm text-muted-foreground">Once you log issues, they'll show up here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Learning Tip */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-foreground">Technical SEO Learning Tip</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Search engines have limited resources to crawl your site. A higher crawl budget means more pages 
                  get discovered and indexed. Page speed, mobile-friendliness, and a clean internal link structure 
                  all contribute to how efficiently search engines can process your content.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
