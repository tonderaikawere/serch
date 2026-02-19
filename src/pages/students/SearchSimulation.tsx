import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bot,
  Search,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Eye,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { firestore } from "@/lib/firebase";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";

type StudentEvent = {
  type?: string;
  label?: string;
  createdAt?: unknown;
  meta?: Record<string, unknown>;
};

function createdAtToMillis(v: unknown): number | null {
  if (!v) return null;
  if (typeof v === "number") return v;
  if (typeof v === "object" && v && "toMillis" in v && typeof (v as { toMillis: () => number }).toMillis === "function") {
    return (v as { toMillis: () => number }).toMillis();
  }
  if (typeof v === "object" && v && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate().getTime();
  }
  return null;
}

function formatMaybeDate(v: unknown) {
  const ms = createdAtToMillis(v);
  if (ms == null) return "—";
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export default function SearchSimulation() {
  const [selectedTab, setSelectedTab] = useState("crawl");
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<Array<{ id: string; data: StudentEvent }>>([]);

  useEffect(() => {
    let cancelled = false;
    const uid = profile?.uid;
    if (!uid) {
      setEvents([]);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const eventsRef = collection(firestore, "students", uid, "events");
        let snap;
        try {
          snap = await getDocs(query(eventsRef, orderBy("createdAt", "desc"), limit(50)));
        } catch {
          snap = await getDocs(eventsRef);
        }
        const next = snap.docs.map((d) => ({ id: d.id, data: d.data() as StudentEvent }));
        if (!cancelled) setEvents(next);
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
  }, [profile?.uid]);

  const crawlEvents = useMemo(() => {
    return events.filter((e) => {
      const t = (e.data.type ?? e.data.label ?? "").toLowerCase();
      return t.includes("crawl") || t.includes("index") || t.includes("search");
    });
  }, [events]);

  const aiEvents = useMemo(() => {
    return events.filter((e) => {
      const t = (e.data.type ?? e.data.label ?? "").toLowerCase();
      return t.includes("ai") || t.includes("aeo") || t.includes("answer");
    });
  }, [events]);

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <header className="mb-8 animate-slide-up">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Search Engine Simulation
          </h1>
          <p className="text-muted-foreground">
            Watch how search engines and AI systems interact with your simulated website.
          </p>
        </header>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="crawl" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search Bot
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              AI Engine
            </TabsTrigger>
          </TabsList>

          {/* Search Bot Tab */}
          <TabsContent value="crawl" className="space-y-6 animate-fade-in">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Crawl Activity */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display font-bold text-xl text-foreground">
                    Bot Activity Log
                  </h2>
                  <Button variant="outline" size="sm" disabled>
                    <Zap className="w-4 h-4 mr-2" />
                    Trigger Crawl
                  </Button>
                </div>
                {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
                {!loading && error && <div className="text-sm text-muted-foreground break-words">{error}</div>}
                {!loading && !error && crawlEvents.length === 0 && (
                  <div className="text-sm text-muted-foreground">No bot activity events yet.</div>
                )}
                {!loading && !error && crawlEvents.length > 0 && (
                  <div className="space-y-3">
                    {crawlEvents.map((ev) => (
                      <div key={ev.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", "bg-info/10")}>
                            <Eye className="w-4 h-4 text-info" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{ev.data.label ?? ev.data.type ?? "Event"}</p>
                            <p className="text-sm text-muted-foreground truncate">{ev.id}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant="outline" className="bg-info/10 text-info">
                            event
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">{formatMaybeDate(ev.data.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Rankings */}
              <Card className="p-6">
                <h2 className="font-display font-bold text-xl text-foreground mb-6">
                  Ranking Movements
                </h2>
                <div className="text-sm text-muted-foreground">
                  Ranking movement data isn't available yet.
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* AI Engine Tab */}
          <TabsContent value="ai" className="space-y-6 animate-fade-in">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* AI Extraction Log */}
              <Card className="p-6">
                <h2 className="font-display font-bold text-xl text-foreground mb-6">
                  AI Answer Extraction
                </h2>
                {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
                {!loading && error && <div className="text-sm text-muted-foreground break-words">{error}</div>}
                {!loading && !error && aiEvents.length === 0 && (
                  <div className="text-sm text-muted-foreground">No AI extraction events yet.</div>
                )}
                {!loading && !error && aiEvents.length > 0 && (
                  <div className="space-y-3">
                    {aiEvents.map((ev) => (
                      <div key={ev.id} className="p-4 rounded-lg border border-border bg-muted/30">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-foreground truncate">{ev.data.label ?? ev.data.type ?? "Event"}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatMaybeDate(ev.data.createdAt)}</p>
                          </div>
                          <Badge variant="outline" className="bg-muted text-muted-foreground">event</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Improvement Suggestions */}
              <Card className="p-6">
                <h2 className="font-display font-bold text-xl text-foreground mb-6">
                  AEO Improvements
                </h2>
                <div className="text-sm text-muted-foreground">
                  Improvements will appear here once your activity events include AEO feedback.
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
