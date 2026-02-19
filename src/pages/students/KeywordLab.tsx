import { useEffect, useState } from "react";
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

  const [newTerm, setNewTerm] = useState("");
  const [newIntent, setNewIntent] = useState<Keyword["intent"]>("informational");

  const filteredKeywords = keywords.filter((k) =>
    k.term.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const uid = profile?.uid;

  useEffect(() => {
    let cancelled = false;
    if (!uid) return;
    void (async () => {
      try {
        const ref = doc(firestore, "students", uid, "workspace", "keywords");
        const snap = await getDoc(ref);
        const data = snap.exists() ? (snap.data() as { keywords?: Keyword[] }) : null;
        if (!cancelled && Array.isArray(data?.keywords)) setKeywords(data!.keywords);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

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

  return (
    <DashboardLayout>
      <div className="p-8">
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
          <Card className="lg:col-span-2 p-6 animate-slide-up">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search keywords or enter new term..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <Input
                  placeholder="Add keyword…"
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  className="w-56"
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={newIntent === "informational" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewIntent("informational")}
                  >
                    Info
                  </Button>
                  <Button
                    type="button"
                    variant={newIntent === "transactional" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewIntent("transactional")}
                  >
                    Buy
                  </Button>
                  <Button
                    type="button"
                    variant={newIntent === "navigational" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewIntent("navigational")}
                  >
                    Nav
                  </Button>
                </div>
                <Button onClick={addKeyword} disabled={!newTerm.trim()} className="gradient-seo text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>

            {/* Keyword Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      Keyword
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      Intent
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
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
                        <td className="p-3">
                          <span className="font-medium text-foreground">{keyword.term}</span>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className={intentColors[keyword.intent]}>
                            <IntentIcon className="w-3 h-3 mr-1" />
                            {keyword.intent}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Button variant="outline" size="sm">
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
                  <Button className="w-full gradient-accent text-accent-foreground">
                    Assign to Page
                  </Button>
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
