import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { firestore } from "@/lib/firebase";
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  HelpCircle,
  Image,
  MousePointer,
  GripVertical,
  Trash2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

type BlockType = "h1" | "h2" | "h3" | "paragraph" | "faq" | "image" | "cta";

interface Block {
  id: string;
  type: BlockType;
  content: string;
  alt?: string;
}

const blockTypes = [
  { type: "h1" as BlockType, icon: Heading1, label: "H1 Heading", color: "bg-primary/10 text-primary" },
  { type: "h2" as BlockType, icon: Heading2, label: "H2 Heading", color: "bg-primary/10 text-primary" },
  { type: "h3" as BlockType, icon: Heading3, label: "H3 Heading", color: "bg-primary/10 text-primary" },
  { type: "paragraph" as BlockType, icon: AlignLeft, label: "Paragraph", color: "bg-secondary text-secondary-foreground" },
  { type: "faq" as BlockType, icon: HelpCircle, label: "FAQ Block", color: "bg-info/10 text-info" },
  { type: "image" as BlockType, icon: Image, label: "Image", color: "bg-warning/10 text-warning" },
  { type: "cta" as BlockType, icon: MousePointer, label: "CTA Button", color: "bg-success/10 text-success" },
];

export default function PageBuilder() {
  const { profile } = useAuth();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [draggedType, setDraggedType] = useState<BlockType | null>(null);

  const uid = profile?.uid;
  const pageDocRef = useMemo(() => {
    if (!uid) return null;
    return doc(firestore, "students", uid, "workspace", "pageBuilder");
  }, [uid]);

  useEffect(() => {
    let cancelled = false;
    if (!pageDocRef) {
      setBlocks([]);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const snap = await getDoc(pageDocRef);
        const data = snap.exists() ? (snap.data() as { blocks?: Block[] }) : null;
        const next = Array.isArray(data?.blocks) ? data?.blocks : [];
        if (!cancelled) setBlocks(next);
      } catch {
        if (!cancelled) setBlocks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pageDocRef]);

  const addBlock = (type: BlockType) => {
    const newBlock: Block = {
      id: Date.now().toString(),
      type,
      content: type === "h1" ? "New Heading" : type === "faq" ? "What is your question?" : "",
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, content: string) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, content } : b)));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  const hasH1 = blocks.some((b) => b.type === "h1");
  const headingStructure = blocks.filter((b) => ["h1", "h2", "h3"].includes(b.type));

  const saveChanges = async () => {
    if (!uid || !pageDocRef) return;
    setSaving(true);
    try {
      await setDoc(
        pageDocRef,
        {
          blocks,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      await addDoc(collection(firestore, "students", uid, "events"), {
        type: "page_builder_saved",
        label: "Page Builder saved",
        blocksCount: blocks.length,
        createdAt: serverTimestamp(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <header className="mb-8 animate-slide-up">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-display font-bold text-foreground">
              Page Builder
            </h1>
            <div className="flex items-center gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={loading || blocks.length === 0}>
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Preview</DialogTitle>
                  </DialogHeader>
                  <div className="max-h-[70vh] overflow-auto rounded-lg border border-border bg-background p-6">
                    {blocks.length === 0 ? (
                      <div className="text-sm text-muted-foreground">Nothing to preview yet.</div>
                    ) : (
                      <div className="space-y-4">
                        {blocks.map((b) => (
                          <PreviewBlock key={b.id} block={b} />
                        ))}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                className="gradient-seo text-primary-foreground"
                onClick={() => {
                  void saveChanges().catch(() => {});
                }}
                disabled={loading || saving || blocks.length === 0}
              >
                Save Changes
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground">
            Drag and drop blocks to build your page. Watch SEO indicators update in real-time.
          </p>
        </header>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Block Palette */}
          <Card className="p-4 h-fit animate-slide-up">
            <h2 className="font-display font-bold text-lg text-foreground mb-4">
              Content Blocks
            </h2>
            <div className="space-y-2">
              {blockTypes.map((block) => (
                <div
                  key={block.type}
                  draggable
                  onDragStart={() => setDraggedType(block.type)}
                  onDragEnd={() => setDraggedType(null)}
                  onClick={() => addBlock(block.type)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg cursor-move hover:shadow-md transition-all",
                    block.color,
                    "border border-transparent hover:border-primary/20"
                  )}
                >
                  <block.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{block.label}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Canvas */}
          <Card
            className="lg:col-span-2 p-6 min-h-[600px] animate-slide-up"
            style={{ animationDelay: "0.1s" }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (draggedType) {
                addBlock(draggedType);
                setDraggedType(null);
              }
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-lg text-foreground">
                Page Canvas
              </h2>
              <Badge variant="outline" className="bg-muted/50">
                Homepage
              </Badge>
            </div>

            <div className="space-y-4">
              {blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-muted rounded-lg">
                  <Plus className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-center">
                    Drag blocks here or click to add
                  </p>
                </div>
              ) : (
                blocks.map((block, index) => (
                  <BlockEditor
                    key={block.id}
                    block={block}
                    onUpdate={(content) => updateBlock(block.id, content)}
                    onRemove={() => removeBlock(block.id)}
                  />
                ))
              )}
            </div>

            {/* Drop Zone */}
            {draggedType && (
              <div className="mt-4 p-4 border-2 border-dashed border-primary rounded-lg text-center text-primary animate-pulse">
                Drop here to add block
              </div>
            )}
          </Card>

          {/* Live Indicators */}
          <div className="space-y-4">
            {/* Heading Structure */}
            <Card className="p-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <h2 className="font-display font-bold text-lg text-foreground mb-4">
                Heading Structure
              </h2>
              {hasH1 ? (
                <div className="flex items-center gap-2 text-success mb-3">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm">H1 tag present</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-destructive mb-3">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">Missing H1 tag</span>
                </div>
              )}
              <div className="space-y-1">
                {headingStructure.map((h, i) => (
                  <div
                    key={i}
                    className={cn(
                      "text-sm p-2 rounded-md bg-muted/50",
                      h.type === "h1" && "font-bold",
                      h.type === "h2" && "ml-4",
                      h.type === "h3" && "ml-8"
                    )}
                  >
                    {h.type.toUpperCase()}: {h.content.substring(0, 30)}...
                  </div>
                ))}
              </div>
            </Card>

            {/* Keyword Usage */}
            <Card className="p-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <h2 className="font-display font-bold text-lg text-foreground mb-4">
                Keyword Usage
              </h2>
              <div className="text-sm text-muted-foreground">Keyword usage tracking isn't available yet.</div>
            </Card>

            {/* Readability */}
            <Card className="p-4 animate-slide-up" style={{ animationDelay: "0.4s" }}>
              <h2 className="font-display font-bold text-lg text-foreground mb-4">
                Readability Score
              </h2>
              <div className="text-sm text-muted-foreground">Add content blocks to see readability signals.</div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function PreviewBlock({ block }: { block: Block }) {
  if (block.type === "h1") return <h1 className="text-3xl font-bold text-foreground">{block.content}</h1>;
  if (block.type === "h2") return <h2 className="text-2xl font-semibold text-foreground">{block.content}</h2>;
  if (block.type === "h3") return <h3 className="text-xl font-semibold text-foreground">{block.content}</h3>;
  if (block.type === "paragraph") return <p className="text-foreground whitespace-pre-wrap">{block.content}</p>;
  if (block.type === "faq") {
    return (
      <div className="rounded-lg border border-border p-4">
        <div className="font-medium text-foreground">FAQ</div>
        <div className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{block.content}</div>
      </div>
    );
  }
  if (block.type === "image") {
    return (
      <div className="rounded-lg border border-border p-4">
        <div className="text-sm text-muted-foreground">Image</div>
        <div className="text-sm text-foreground mt-2">{block.alt ?? block.content ?? "—"}</div>
      </div>
    );
  }
  if (block.type === "cta") {
    return (
      <div className="pt-2">
        <Button type="button">{block.content || "Call to action"}</Button>
      </div>
    );
  }
  return <div className="text-sm text-muted-foreground">Unsupported block</div>;
}

interface BlockEditorProps {
  block: Block;
  onUpdate: (content: string) => void;
  onRemove: () => void;
}

function BlockEditor({ block, onUpdate, onRemove }: BlockEditorProps) {
  const blockInfo = blockTypes.find((b) => b.type === block.type);

  return (
    <div className="group relative flex items-start gap-2 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
      <div className="cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className={cn("p-1.5 rounded", blockInfo?.color)}>
        {blockInfo && <blockInfo.icon className="w-4 h-4" />}
      </div>
      <div className="flex-1">
        {block.type === "paragraph" || block.type === "faq" ? (
          <Textarea
            value={block.content}
            onChange={(e) => onUpdate(e.target.value)}
            className="resize-none border-0 bg-transparent p-0 focus-visible:ring-0"
            rows={2}
          />
        ) : block.type === "image" ? (
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center">
              <Image className="w-6 h-6 text-muted-foreground" />
            </div>
            <Input
              placeholder="Alt text for image..."
              value={block.content}
              onChange={(e) => onUpdate(e.target.value)}
              className="flex-1"
            />
          </div>
        ) : (
          <Input
            value={block.content}
            onChange={(e) => onUpdate(e.target.value)}
            className={cn(
              "border-0 bg-transparent p-0 focus-visible:ring-0",
              block.type === "h1" && "text-2xl font-bold font-display",
              block.type === "h2" && "text-xl font-semibold font-display",
              block.type === "h3" && "text-lg font-medium font-display"
            )}
          />
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
