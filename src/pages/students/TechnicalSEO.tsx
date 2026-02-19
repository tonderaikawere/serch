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
import { useState } from "react";

type PageStatus = {
  id: string;
  name: string;
  url: string;
  crawled: boolean;
  indexed: boolean;
  speed: number;
};

type BrokenLinkRow = { page: string; link: string; status: number };

export default function TechnicalSEO() {
  const [crawlBudget, setCrawlBudget] = useState([0]);
  const [pageSpeed, setPageSpeed] = useState([0]);
  const [mobileOptimized, setMobileOptimized] = useState(false);
  const [httpsEnabled, setHttpsEnabled] = useState(false);
  const [pages, setPages] = useState<PageStatus[]>([]);
  const [brokenLinks, setBrokenLinks] = useState<BrokenLinkRow[]>([]);

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

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Technical SEO</h1>
            <p className="text-muted-foreground mt-1">
              Track technical checks and document issues as you work.
            </p>
          </div>
          <Button disabled>
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
                    <div key={page.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${page.indexed ? "bg-success" : page.crawled ? "bg-warning" : "bg-destructive"}`} />
                      <div>
                        <p className="font-medium text-sm text-foreground">{page.name}</p>
                        <p className="text-xs text-muted-foreground">{page.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
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
                      <div className="w-16">
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
                    <div key={index} className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {link.page}
                        </p>
                        <p className="text-xs text-muted-foreground">{link.link}</p>
                      </div>
                      <Badge variant="destructive">{link.status}</Badge>
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
