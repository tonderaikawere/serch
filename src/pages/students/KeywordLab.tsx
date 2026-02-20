import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { firestore } from "@/lib/firebase";
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  Search,
  HelpCircle,
  ShoppingCart,
  Compass,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Keyword {
  term: string;
  intent: "informational" | "transactional" | "navigational";
  assigned?: string;
}

const intentIcons = {
  informational: HelpCircle,
  transactional: ShoppingCart,
  navigational: Compass,
};

const intentColors = {
  informational: "bg-info/10 text-info border-info/20",
  transactional: "bg-success/10 text-success border-success/20",
  navigational: "bg-warning/10 text-warning border-warning/20",
};

export default function KeywordLab() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState<Keyword | null>(null);

  const [assignedPage, setAssignedPage] = useState("");

  const [newTerm, setNewTerm] = useState("");
  const [newIntent, setNewIntent] = useState<Keyword["intent"]>("informational");

  const filteredKeywords = keywords.filter((k) =>
    k.term.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const uid = profile?.uid;

  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const lastCompletionRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    if (!uid) return;
    void (async () => {
      try {
        const ref = doc(firestore, "students", uid, "workspace", "keywords");
        const snap = await getDoc(ref);
        const data = snap.exists() ? (snap.data() as { keywords?: Keyword[]; score?: number; completed?: boolean }) : null;
        if (cancelled) return;
        if (Array.isArray(data?.keywords)) setKeywords(data!.keywords);
        if (typeof data?.score === "number") setScore(data.score);
        if (typeof data?.completed === "boolean") {
          setCompleted(data.completed);
          lastCompletionRef.current = data.completed;
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const computed = useMemo(() => {
    const counts = {
      informational: 0,
      transactional: 0,
      navigational: 0,
    } as Record<Keyword["intent"], number>;

    let assignedCount = 0;
    for (const k of keywords) {
      counts[k.intent] += 1;
      if (k.assigned && k.assigned.trim()) assignedCount += 1;
    }

    const hasCoverage = counts.informational >= 2 && counts.transactional >= 2 && counts.navigational >= 1;
    const hasAssignments = assignedCount >= 3;

    const checks = [
      { label: "At least 2 informational keywords", passed: counts.informational >= 2 },
      { label: "At least 2 transactional keywords", passed: counts.transactional >= 2 },
      { label: "At least 1 navigational keyword", passed: counts.navigational >= 1 },
      { label: "Assign at least 3 keywords to pages", passed: hasAssignments },
    ];
    const passed = checks.filter((c) => c.passed).length;
    const score = Math.round((passed / checks.length) * 100);
    const completed = hasCoverage && hasAssignments;
    return { checks, score, completed, counts, assignedCount };
  }, [keywords]);

  useEffect(() => {
    if (!uid) return;
    setScore(computed.score);
    setCompleted(computed.completed);

    const handle = window.setTimeout(() => {
      void setDoc(
        doc(firestore, "students", uid, "workspace", "keywords"),
        {
          keywords,
          score: computed.score,
          completed: computed.completed,
          completedAt: computed.completed ? serverTimestamp() : null,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ).catch(() => {});

      if (computed.completed && !lastCompletionRef.current) {
        lastCompletionRef.current = true;
        void addDoc(collection(firestore, "students", uid, "events"), {
          type: "keyword_lab_completed",
          label: "Keyword Lab completed",
          meta: { score: computed.score },
          createdAt: serverTimestamp(),
        }).catch(() => {});
      }
      if (!computed.completed) {
        lastCompletionRef.current = false;
      }
    }, 400);

    return () => {
      window.clearTimeout(handle);
    };
  }, [computed.completed, computed.score, keywords, uid]);

  const addKeyword = () => {
    const term = newTerm.trim();
    if (!term) return;
    const next: Keyword = { term, intent: newIntent };
    setKeywords((prev) => {
      const nextList = [next, ...prev].slice(0, 500);
      if (uid) {
        const workspaceRef = doc(firestore, "students", uid, "workspace", "keywords");
        void setDoc(
          workspaceRef,
          {
            keywords: nextList,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ).catch(() => {});

        void addDoc(collection(firestore, "students", uid, "events"), {
          type: "keyword_added",
          label: `Keyword added: ${term}`,
          intent: newIntent,
          term,
          createdAt: serverTimestamp(),
        }).catch(() => {});
      }
      return nextList;
    });
    setNewTerm("");
    setSelectedKeyword(next);
  };

  useEffect(() => {
    setAssignedPage(selectedKeyword?.assigned ?? "");
  }, [selectedKeyword?.assigned, selectedKeyword?.term]);

  function normalizePagePath(v: string) {
    const s = v.trim();
    if (!s) return "";
    if (s.startsWith("http://") || s.startsWith("https://")) {
      try {
        const u = new URL(s);
        return u.pathname || "/";
      } catch {
        return s;
      }
    }
    return s.startsWith("/") ? s : `/${s}`;
  }

  function assignSelectedKeyword(nextPath: string) {
    const uid = profile?.uid;
    if (!uid || !selectedKeyword) return;
    const path = normalizePagePath(nextPath);
    if (!path) return;

    setKeywords((prev) => {
      const idx = prev.findIndex((k) => k.term === selectedKeyword.term && k.intent === selectedKeyword.intent);
      if (idx < 0) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], assigned: path };
      return next;
    });

    setSelectedKeyword((prev) => (prev ? { ...prev, assigned: path } : prev));
    setAssignedPage(path);

    void addDoc(collection(firestore, "students", uid, "events"), {
      type: "keyword_assigned",
      label: `Keyword assigned: ${selectedKeyword.term}`,
      meta: {
        term: selectedKeyword.term,
        intent: selectedKeyword.intent,
        assigned: path,
      },
      createdAt: serverTimestamp(),
    }).catch(() => {});
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-8 overflow-x-hidden">
        {/* Header */}
        <header className="mb-8 animate-slide-up">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Keyword & Intent Lab
          </h1>
          <p className="text-muted-foreground">
            Research keywords, understand search intent, and assign them to your pages.
          </p>
        </header>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Keyword Research */}
          <Card className="lg:col-span-2 p-6 animate-slide-up min-w-0 overflow-x-hidden">
            <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center">
              <div className="relative w-full sm:flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search keywords or enter new term..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:flex-wrap w-full sm:w-auto min-w-0">
                <Input
                  placeholder="Add keyword…"
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  className="w-full sm:w-56"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant={newIntent === "informational" ? "default" : "outline"}
                    size="sm"
                    className="w-16 justify-center"
                    onClick={() => setNewIntent("informational")}
                  >
                    Info
                  </Button>
                  <Button
                    type="button"
                    variant={newIntent === "transactional" ? "default" : "outline"}
                    size="sm"
                    className="w-16 justify-center"
                    onClick={() => setNewIntent("transactional")}
                  >
                    Buy
                  </Button>
                  <Button
                    type="button"
                    variant={newIntent === "navigational" ? "default" : "outline"}
                    size="sm"
                    className="w-16 justify-center"
                    onClick={() => setNewIntent("navigational")}
                  >
                    Nav
                  </Button>
                </div>
                <Button
                  onClick={addKeyword}
                  disabled={!newTerm.trim()}
                  className="gradient-seo text-primary-foreground w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>

            {/* Keyword Table */}
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground w-1/2">
                      Keyword
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground w-1/4">
                      Intent
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground w-1/4">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKeywords.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-6 text-sm text-muted-foreground">
                        No keywords yet. Add your first keyword above.
                      </td>
                    </tr>
                  )}
                  {filteredKeywords.map((keyword, i) => {
                    const IntentIcon = intentIcons[keyword.intent];
                    return (
                      <tr
                        key={i}
                        className={cn(
                          "border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors",
                          selectedKeyword?.term === keyword.term && "bg-primary/5"
                        )}
                        onClick={() => setSelectedKeyword(keyword)}
                      >
                        <td className="p-3 min-w-0">
                          <span className="font-medium text-foreground truncate block">{keyword.term}</span>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className={intentColors[keyword.intent]}>
                            <IntentIcon className="w-3 h-3 mr-1" />
                            {keyword.intent}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedKeyword(keyword);
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Assign
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Keyword Clusters */}
            <Card className="p-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <h2 className="font-display font-bold text-lg text-foreground mb-4">
                Keyword Clusters
              </h2>
              <div className="text-sm text-muted-foreground">Clusters will appear once you start grouping keywords.</div>
            </Card>

            {/* Selected Keyword Details */}
            {selectedKeyword && (
              <Card className="p-6 animate-slide-up">
                <h2 className="font-display font-bold text-lg text-foreground mb-4">
                  Keyword Details
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Term</p>
                    <p className="font-medium text-foreground">{selectedKeyword.term}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Search Intent</p>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <Badge variant="outline" className={intentColors[selectedKeyword.intent]}>
                        {selectedKeyword.intent}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedKeyword.intent === "informational" &&
                          "Users want to learn or understand something."}
                        {selectedKeyword.intent === "transactional" &&
                          "Users are ready to take action or purchase."}
                        {selectedKeyword.intent === "navigational" &&
                          "Users are looking for a specific place or website."}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Entity Suggestions</p>
                    <div className="flex flex-wrap gap-2">
                      {["brand", "service", "location", "topic"].map((entity, i) => (
                        <Badge key={i} variant="secondary">
                          {entity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Assign to page</p>
                    <Input
                      placeholder="/pricing"
                      value={assignedPage}
                      onChange={(e) => setAssignedPage(e.target.value)}
                    />
                    <Button
                      className="w-full gradient-accent text-accent-foreground"
                      onClick={() => assignSelectedKeyword(assignedPage)}
                      disabled={!assignedPage.trim()}
                    >
                      Save assignment
                    </Button>
                    {selectedKeyword.assigned && (
                      <p className="text-xs text-muted-foreground">
                        Assigned to: <span className="text-foreground">{selectedKeyword.assigned}</span>
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Intent Legend */}
            <Card className="p-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <h2 className="font-display font-bold text-lg text-foreground mb-4">
                Search Intent Types
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-info mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Informational</p>
                    <p className="text-sm text-muted-foreground">Seeking knowledge or answers</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShoppingCart className="w-5 h-5 text-success mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Transactional</p>
                    <p className="text-sm text-muted-foreground">Ready to buy or take action</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Compass className="w-5 h-5 text-warning mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Navigational</p>
                    <p className="text-sm text-muted-foreground">Looking for specific location</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
