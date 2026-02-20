import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { firestore } from "@/lib/firebase";
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { 
  FileText, 
  Link2, 
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Globe,
  Search,
  Copy
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export default function MetadataEditor() {
  const { profile } = useAuth();
  const uid = profile?.uid ?? null;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [indexable, setIndexable] = useState(true);
  const [canonicalEnabled, setCanonicalEnabled] = useState(true);
  const [canonicalUrl, setCanonicalUrl] = useState("");

  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const lastCompletionRef = useRef(false);

  const titleLength = title.length;
  const descriptionLength = description.length;
  const titlePixels = title.length * 6; // Rough approximation

  const getTitleStatus = () => {
    if (titleLength === 0) return { status: "empty", color: "text-muted-foreground" };
    if (titleLength < 30) return { status: "Too short", color: "text-warning" };
    if (titleLength > 60) return { status: "Too long", color: "text-destructive" };
    return { status: "Optimal", color: "text-success" };
  };

  const getDescriptionStatus = () => {
    if (descriptionLength === 0) return { status: "empty", color: "text-muted-foreground" };
    if (descriptionLength < 120) return { status: "Too short", color: "text-warning" };
    if (descriptionLength > 160) return { status: "Too long", color: "text-destructive" };
    return { status: "Optimal", color: "text-success" };
  };

  const titleStatus = getTitleStatus();
  const descStatus = getDescriptionStatus();

  const validationChecks = [
    { label: "Title tag present", passed: title.length > 0 },
    { label: "Title length optimal (30-60 chars)", passed: titleLength >= 30 && titleLength <= 60 },
    { label: "Meta description present", passed: description.length > 0 },
    { label: "Description length optimal (120-160 chars)", passed: descriptionLength >= 120 && descriptionLength <= 160 },
    { label: "URL is SEO-friendly", passed: slug.length > 0 && !slug.includes(" ") },
    { label: "Page is indexable", passed: indexable },
    {
      label: "Canonical URL is valid (when enabled)",
      passed: !canonicalEnabled || (() => {
        if (!canonicalUrl.trim()) return false;
        try {
          const u = new URL(canonicalUrl.trim());
          return u.protocol === "https:" || u.protocol === "http:";
        } catch {
          return false;
        }
      })(),
    },
  ];

  const passedChecks = validationChecks.filter(c => c.passed).length;

  const generatedHtml = `<title>${title}</title>\n<meta name="description" content="${description}" />\n${
    !indexable ? '<meta name="robots" content="noindex" />' : ""
  }\n${canonicalEnabled && canonicalUrl ? `<link rel="canonical" href="${canonicalUrl}" />` : ""}`;

  const logEvent = (type: string, label: string) => {
    if (!uid) return;
    void addDoc(collection(firestore, "students", uid, "events"), {
      type,
      label,
      createdAt: serverTimestamp(),
    }).catch(() => {});
  };

  const computedScore = useMemo(() => {
    if (validationChecks.length === 0) return 0;
    return Math.round((passedChecks / validationChecks.length) * 100);
  }, [passedChecks, validationChecks.length]);

  const computedCompleted = useMemo(() => {
    return validationChecks.length > 0 && passedChecks === validationChecks.length;
  }, [passedChecks, validationChecks.length]);

  const suggestions = useMemo(() => {
    const list: Array<{ label: string; suggestion: string }> = [];

    if (title.length === 0) {
      list.push({ label: "Title tag present", suggestion: "Add a clear page title (include your primary keyword near the start)." });
    } else if (titleLength < 30) {
      list.push({ label: "Title length optimal (30-60 chars)", suggestion: "Expand the title to 30–60 characters to better describe the page." });
    } else if (titleLength > 60) {
      list.push({ label: "Title length optimal (30-60 chars)", suggestion: "Shorten the title to under 60 characters to avoid truncation in results." });
    }

    if (description.length === 0) {
      list.push({ label: "Meta description present", suggestion: "Write a meta description summarizing the page value and include a simple call-to-action." });
    } else if (descriptionLength < 120) {
      list.push({ label: "Description length optimal (120-160 chars)", suggestion: "Expand the description to 120–160 characters to improve snippet quality." });
    } else if (descriptionLength > 160) {
      list.push({ label: "Description length optimal (120-160 chars)", suggestion: "Trim the description to under 160 characters to avoid truncation." });
    }

    if (slug.length === 0) {
      list.push({ label: "URL is SEO-friendly", suggestion: "Add a short slug using lowercase words separated by hyphens (e.g. \"technical-seo-checklist\")." });
    } else if (slug.includes(" ")) {
      list.push({ label: "URL is SEO-friendly", suggestion: "Remove spaces from the slug; use hyphens instead." });
    }

    if (!indexable) {
      list.push({ label: "Page is indexable", suggestion: "Enable indexing unless this page is intentionally private/temporary." });
    }

    if (canonicalEnabled) {
      const url = canonicalUrl.trim();
      let ok = false;
      if (url) {
        try {
          const u = new URL(url);
          ok = u.protocol === "https:" || u.protocol === "http:";
        } catch {
          ok = false;
        }
      }
      if (!ok) {
        list.push({ label: "Canonical URL is valid (when enabled)", suggestion: "Enter a valid canonical URL starting with https:// (recommended)." });
      }
    }

    return list;
  }, [canonicalEnabled, canonicalUrl, description.length, descriptionLength, indexable, slug, title.length, titleLength]);

  async function persistWorkspace(next: {
    title: string;
    description: string;
    slug: string;
    indexable: boolean;
    canonicalEnabled: boolean;
    canonicalUrl: string;
    generatedHtml: string;
    score: number;
    completed: boolean;
  }) {
    if (!uid) return;
    await setDoc(
      doc(firestore, "students", uid, "workspace", "metadata"),
      {
        ...next,
        updatedAt: serverTimestamp(),
        completedAt: next.completed ? serverTimestamp() : null,
      },
      { merge: true },
    ).catch(() => {});
  }

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    void (async () => {
      const ref = doc(firestore, "students", uid, "workspace", "metadata");
      const snap = await getDoc(ref).catch(() => null);
      if (cancelled || !snap || !snap.exists()) return;
      const data = snap.data() as Partial<{
        title: string;
        description: string;
        slug: string;
        indexable: boolean;
        canonicalEnabled: boolean;
        canonicalUrl: string;
        score: number;
        completed: boolean;
      }>;
      if (typeof data.title === "string") setTitle(data.title);
      if (typeof data.description === "string") setDescription(data.description);
      if (typeof data.slug === "string") setSlug(data.slug);
      if (typeof data.indexable === "boolean") setIndexable(data.indexable);
      if (typeof data.canonicalEnabled === "boolean") setCanonicalEnabled(data.canonicalEnabled);
      if (typeof data.canonicalUrl === "string") setCanonicalUrl(data.canonicalUrl);
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

  useEffect(() => {
    setScore(computedScore);
    setCompleted(computedCompleted);

    const handle = window.setTimeout(() => {
      void persistWorkspace({
        title,
        description,
        slug,
        indexable,
        canonicalEnabled,
        canonicalUrl,
        generatedHtml,
        score: computedScore,
        completed: computedCompleted,
      });

      if (computedCompleted && !lastCompletionRef.current) {
        lastCompletionRef.current = true;
        logEvent("metadata_completed", "Metadata Editor completed");
      }
      if (!computedCompleted) {
        lastCompletionRef.current = false;
      }
    }, 500);

    return () => {
      window.clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, slug, indexable, canonicalEnabled, canonicalUrl, generatedHtml, computedScore, computedCompleted, uid]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Metadata & URL Editor</h1>
          <p className="text-muted-foreground mt-1">
            Optimize your page titles, descriptions, and URLs for search engines
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title Tag */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5 text-primary" />
                  Title Tag
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Page Title</Label>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${titleStatus.color}`}>{titleStatus.status}</span>
                      <span className="text-xs text-muted-foreground">{titleLength}/60</span>
                    </div>
                  </div>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter your page title..."
                    className={titleLength > 60 ? "border-destructive" : ""}
                  />
                  <Progress 
                    value={Math.min((titleLength / 60) * 100, 100)} 
                    className={`h-1.5 ${titleLength > 60 ? "[&>div]:bg-destructive" : titleLength >= 30 ? "[&>div]:bg-success" : "[&>div]:bg-warning"}`}
                  />
                </div>

                {/* Pixel Preview */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Pixel width preview (~{titlePixels}px / 580px max)</p>
                  <div className="bg-background rounded border border-border p-2 overflow-hidden">
                    <p className="text-primary text-base font-medium truncate" style={{ maxWidth: "580px" }}>
                      {title || "Your title will appear here..."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Meta Description */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search className="w-5 h-5 text-primary" />
                  Meta Description
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Description</Label>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${descStatus.color}`}>{descStatus.status}</span>
                      <span className="text-xs text-muted-foreground">{descriptionLength}/160</span>
                    </div>
                  </div>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Write a compelling meta description..."
                    className={`min-h-[80px] ${descriptionLength > 160 ? "border-destructive" : ""}`}
                  />
                  <Progress 
                    value={Math.min((descriptionLength / 160) * 100, 100)} 
                    className={`h-1.5 ${descriptionLength > 160 ? "[&>div]:bg-destructive" : descriptionLength >= 120 ? "[&>div]:bg-success" : "[&>div]:bg-warning"}`}
                  />
                </div>
              </CardContent>
            </Card>

            {/* URL Slug */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Link2 className="w-5 h-5 text-primary" />
                  URL Slug
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>URL Path</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">https://example.com/</span>
                    <Input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                      placeholder="page-url-slug"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use lowercase letters, numbers, and hyphens only
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Indexing Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="w-5 h-5 text-primary" />
                  Indexing Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Allow Indexing</p>
                    <p className="text-xs text-muted-foreground">
                      {indexable ? "Search engines can index this page" : "Page will have noindex directive"}
                    </p>
                  </div>
                  <Switch checked={indexable} onCheckedChange={setIndexable} />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Canonical URL</p>
                    <p className="text-xs text-muted-foreground">
                      {canonicalEnabled ? "Specify the preferred URL version" : "No canonical tag"}
                    </p>
                  </div>
                  <Switch checked={canonicalEnabled} onCheckedChange={setCanonicalEnabled} />
                </div>

                {canonicalEnabled && (
                  <div className="space-y-2">
                    <Label>Canonical URL</Label>
                    <Input
                      value={canonicalUrl}
                      onChange={(e) => setCanonicalUrl(e.target.value)}
                      placeholder="https://example.com/preferred-url"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview & Validation */}
          <div className="space-y-6">
            {/* SERP Preview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Eye className="w-5 h-5 text-primary" />
                  SERP Preview
                </CardTitle>
                <CardDescription>How your page may appear in search results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-card rounded-lg border border-border">
                  <p className="text-xs text-success mb-1">
                    https://example.com/{slug || "page-url"}
                  </p>
                  <p className="text-primary text-lg font-medium hover:underline cursor-pointer mb-1 line-clamp-1">
                    {title || "Page Title"}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {description || "Your meta description will appear here. Write a compelling summary to increase click-through rates."}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Validation */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Validation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {validationChecks.map((check, index) => (
                  <div key={index} className="flex items-center gap-3">
                    {check.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                    )}
                    <span className={`text-sm ${check.passed ? "text-foreground" : "text-muted-foreground"}`}>
                      {check.label}
                    </span>
                  </div>
                ))}

                {suggestions.length > 0 && (
                  <div className="pt-3 border-t border-border space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      Fix Suggestions
                    </div>
                    <div className="space-y-2">
                      {suggestions.map((s) => (
                        <div key={`${s.label}-${s.suggestion}`} className="text-xs text-muted-foreground">
                          <span className="text-foreground">{s.label}:</span> {s.suggestion}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={!computedCompleted}
                  onClick={() => {
                    void navigator.clipboard?.writeText(generatedHtml);
                    const uid = profile?.uid;
                    if (uid) {
                      void setDoc(
                        doc(firestore, "students", uid, "workspace", "metadata"),
                        {
                          title,
                          description,
                          slug,
                          indexable,
                          canonicalEnabled,
                          canonicalUrl,
                          generatedHtml,
                          updatedAt: serverTimestamp(),
                        },
                        { merge: true },
                      ).catch(() => {});
                    }
                    logEvent("metadata_copied", "Generated metadata copied");
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                {!computedCompleted && (
                  <div className="text-xs text-muted-foreground">
                    Fix the items above to enable copying clean metadata.
                  </div>
                )}
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Score</span>
                    <span className="text-sm text-muted-foreground">{passedChecks}/{validationChecks.length}</span>
                  </div>
                  <Progress value={(passedChecks / validationChecks.length) * 100} />
                </div>
              </CardContent>
            </Card>

            {/* Generated Tags */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Generated HTML</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted/50 p-3 rounded-lg text-xs overflow-auto max-h-[200px]">
                  <code className="text-foreground">{generatedHtml}</code>
                </pre>
              </CardContent>
            </Card>

            {/* Learning Tip */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Quick Tip</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Include your primary keyword near the beginning of your title tag. 
                      Make your meta description compelling with a clear call-to-action.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
