import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
  Copy,
  RotateCcw,
  RotateCw,
  MoveUp,
  MoveDown,
  Maximize2,
  LayoutGrid,
  Layers,
  PlusSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

type BlockType = "h1" | "h2" | "h3" | "paragraph" | "faq" | "image" | "cta" | "nav" | "card";

type DevicePreset = "desktop" | "tablet" | "mobile";

type BaseBlock = {
  id: string;
  type: BlockType | "section" | "row" | "column";
  className?: string;
  responsiveClassName?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
};

type ContentBlock = BaseBlock & {
  type: BlockType;
  content: string;
  alt?: string;
};

type SectionBlock = BaseBlock & {
  type: "section";
  title?: string;
  backgroundUrl?: string;
  overlayClassName?: string;
  children: Block[];
};

type ColumnWidth = "1/1" | "1/2" | "1/3" | "2/3";

type ColumnBlock = BaseBlock & {
  type: "column";
  width: ColumnWidth;
  children: Block[];
};

type RowBlock = BaseBlock & {
  type: "row";
  columns: ColumnBlock[];
};

type Block = ContentBlock | SectionBlock | RowBlock | ColumnBlock;

function isContentBlock(b: Block): b is ContentBlock {
  return b.type !== "section" && b.type !== "row" && b.type !== "column";
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function prefixClasses(classes: string, prefix: string) {
  const raw = classes.trim();
  if (!raw) return "";
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => (t.includes(":") ? t : `${prefix}${t}`))
    .join(" ");
}

function responsiveToTailwind(responsive: { mobile?: string; tablet?: string; desktop?: string } | undefined) {
  if (!responsive) return "";
  const mobile = (responsive.mobile ?? "").trim();
  const tablet = prefixClasses(responsive.tablet ?? "", "md:");
  const desktop = prefixClasses(responsive.desktop ?? "", "lg:");
  return [mobile, tablet, desktop].filter(Boolean).join(" ");
}

const blockTypes = [
  { type: "h1" as BlockType, icon: Heading1, label: "H1 Heading", color: "bg-primary/10 text-primary" },
  { type: "h2" as BlockType, icon: Heading2, label: "H2 Heading", color: "bg-primary/10 text-primary" },
  { type: "h3" as BlockType, icon: Heading3, label: "H3 Heading", color: "bg-primary/10 text-primary" },
  { type: "paragraph" as BlockType, icon: AlignLeft, label: "Paragraph", color: "bg-secondary text-secondary-foreground" },
  { type: "faq" as BlockType, icon: HelpCircle, label: "FAQ Block", color: "bg-info/10 text-info" },
  { type: "image" as BlockType, icon: Image, label: "Image", color: "bg-warning/10 text-warning" },
  { type: "cta" as BlockType, icon: MousePointer, label: "CTA Button", color: "bg-success/10 text-success" },
  { type: "nav" as BlockType, icon: GripVertical, label: "Nav Links", color: "bg-muted text-foreground" },
  { type: "card" as BlockType, icon: LayoutGrid, label: "Card", color: "bg-muted text-foreground" },
];

const sectionTemplates: Array<{
  key: "header" | "hero" | "about" | "services" | "footer";
  label: string;
  desc: string;
}> = [
  { key: "header", label: "Header", desc: "Brand + button" },
  { key: "hero", label: "Hero", desc: "Headline + CTA + image" },
  { key: "about", label: "About", desc: "Image + text section" },
  { key: "services", label: "Services", desc: "3-column services grid" },
  { key: "footer", label: "Footer", desc: "Simple footer" },
];

function sectionAnchorId(section: SectionBlock) {
  return `sec-${section.id}`;
}

export default function PageBuilder() {
  const { profile } = useAuth();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [historyPast, setHistoryPast] = useState<Block[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<Block[][]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [previewFullscreen, setPreviewFullscreen] = useState(false);

  const [devicePreset, setDevicePreset] = useState<DevicePreset>("desktop");

  const [canvasMode, setCanvasMode] = useState<"edit" | "visual">("edit");
  const [leftTab, setLeftTab] = useState<"add" | "layers">("add");

  const commitBlocks = (next: Block[]) => {
    setHistoryPast((p) => [...p, blocks]);
    setHistoryFuture([]);
    setBlocks(next);
  };

  const canUndo = historyPast.length > 0;
  const canRedo = historyFuture.length > 0;

  const undo = () => {
    if (!canUndo) return;
    const prev = historyPast[historyPast.length - 1];
    setHistoryPast((p) => p.slice(0, -1));
    setHistoryFuture((f) => [blocks, ...f]);
    setBlocks(prev);
  };

  const redo = () => {
    if (!canRedo) return;
    const next = historyFuture[0];
    setHistoryFuture((f) => f.slice(1));
    setHistoryPast((p) => [...p, blocks]);
    setBlocks(next);
  };

  const [draggedType, setDraggedType] = useState<BlockType | null>(null);
  const [draggedBlock, setDraggedBlock] = useState<{ id: string; parentId: string | null } | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkClassName, setBulkClassName] = useState<string>("");

  const [clipboardBlock, setClipboardBlock] = useState<Block | null>(null);

  const [sectionTemplateOpen, setSectionTemplateOpen] = useState(false);

  const uid = profile?.uid;
  const pageDocRef = useMemo(() => {
    if (!uid) return null;
    return doc(firestore, "students", uid, "workspace", "pageBuilder");
  }, [uid]);

  const [didAutoMigrate, setDidAutoMigrate] = useState(false);

  const [copiedResponsiveStyle, setCopiedResponsiveStyle] = useState<
    { mobile?: string; tablet?: string; desktop?: string } | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    if (!pageDocRef) {
      setBlocks([]);
      setHistoryPast([]);
      setHistoryFuture([]);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const snap = await getDoc(pageDocRef);
        const data = snap.exists() ? (snap.data() as { blocks?: Block[] }) : null;
        const next = Array.isArray(data?.blocks) ? data?.blocks : [];

        const normalized = normalizeBlocks(next);
        if (!cancelled) {
          setBlocks(normalized.blocks);
          setDidAutoMigrate(normalized.didMigrate);
          setHistoryPast([]);
          setHistoryFuture([]);
        }
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

  function newId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function isTypingTarget(el: EventTarget | null) {
    const node = el as HTMLElement | null;
    if (!node) return false;
    const tag = (node.tagName ?? "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    return node.isContentEditable;
  }

  const selectBlock = (id: string, multi: boolean) => {
    setSelectedIds((prev) => {
      if (!multi) return [id];
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    commitBlocks((() => {
      let next = blocks;
      for (const id of selectedIds) next = removeBlockInTree(next, id);
      return next;
    })());
    setSelectedIds([]);
  };

  const copyPrimary = () => {
    const id = selectedIds[0];
    if (!id) return;
    const b = findBlockById(blocks, id);
    if (!b) return;
    setClipboardBlock(b);
  };

  const pasteAfterPrimary = () => {
    const source = clipboardBlock;
    const primaryId = selectedIds[0];
    if (!source || !primaryId) return;
    const loc = findBlockLocation(blocks, primaryId);
    if (!loc) return;
    const collectionLoc: CollectionLocation = toCollectionLocation(loc);
    const arr = getCollection(blocks, collectionLoc);
    if (!arr) return;
    const nextArr = [...(arr as Array<Block | ColumnBlock>)];
    const cloned = cloneWithNewIds(source as Block);
    nextArr.splice(loc.index + 1, 0, cloned as any);
    commitBlocks(setCollection(blocks, collectionLoc, nextArr as any));
    setSelectedIds([cloned.id]);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (loading) return;
      if (isTypingTarget(e.target)) return;

      if (e.key === "Escape") {
        setSelectedIds([]);
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length > 0) {
        e.preventDefault();
        deleteSelected();
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      if (e.key.toLowerCase() === "d" && selectedIds.length > 0) {
        e.preventDefault();
        duplicateAny(selectedIds[0]);
        return;
      }

      if (e.key.toLowerCase() === "c" && selectedIds.length > 0) {
        e.preventDefault();
        copyPrimary();
        return;
      }

      if (e.key.toLowerCase() === "v" && selectedIds.length > 0) {
        e.preventDefault();
        pasteAfterPrimary();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [blocks, clipboardBlock, loading, selectedIds]);

  function defaultModule(type: BlockType): ContentBlock {
    return {
      id: newId(),
      type,
      content:
        type === "h1"
          ? "New Heading"
          : type === "faq"
            ? "What is your question?"
            : type === "cta"
              ? "Get started"
              : type === "nav"
                ? JSON.stringify({ items: [{ label: "Home", sectionId: "" }] })
                : type === "card"
                  ? JSON.stringify({ title: "Card title", body: "Card description" })
                  : "",
      className: "",
    };
  }

  function normalizeBlocks(input: Block[]): { blocks: Block[]; didMigrate: boolean } {
    const hasLayout = input.some((b) => b.type === "section" || b.type === "row" || b.type === "column");
    if (hasLayout) return { blocks: input, didMigrate: false };

    const legacyModules = input.filter((b) => b.type !== "section" && b.type !== "row" && b.type !== "column");
    if (legacyModules.length === 0) return { blocks: [], didMigrate: false };

    const col: ColumnBlock = {
      id: newId(),
      type: "column",
      width: "1/1",
      className: "space-y-4",
      children: legacyModules,
    };

    const row: RowBlock = {
      id: newId(),
      type: "row",
      className: "",
      columns: [col],
    };

    const section: SectionBlock = {
      id: newId(),
      type: "section",
      title: "Section",
      backgroundUrl: "",
      overlayClassName: "bg-transparent",
      className: "relative overflow-hidden rounded-xl border border-border p-6",
      children: [row],
    };

    return { blocks: [section], didMigrate: true };
  }

  const addBlock = (type: BlockType) => {
    const newBlock: Block = defaultModule(type);
    commitBlocks([...blocks, newBlock]);
  };

  type CollectionLocation =
    | { kind: "root"; parentId: null }
    | { kind: "sectionChildren"; parentId: string }
    | { kind: "columnChildren"; parentId: string }
    | { kind: "rowColumns"; parentId: string };

  type BlockLocation = CollectionLocation & {
    index: number;
    itemType: Block["type"];
  };

  function toCollectionLocation(loc: BlockLocation): CollectionLocation {
    if (loc.kind === "root") return { kind: "root", parentId: null };
    if (loc.kind === "sectionChildren") return { kind: "sectionChildren", parentId: loc.parentId };
    if (loc.kind === "columnChildren") return { kind: "columnChildren", parentId: loc.parentId };
    return { kind: "rowColumns", parentId: loc.parentId };
  }

  function findBlockLocation(root: Block[], id: string): BlockLocation | null {
    for (let i = 0; i < root.length; i++) {
      const b = root[i];
      if (b.id === id) {
        return { kind: "root", parentId: null, index: i, itemType: b.type };
      }
      if (b.type === "section") {
        for (let j = 0; j < b.children.length; j++) {
          const child = b.children[j];
          if (child.id === id) {
            return { kind: "sectionChildren", parentId: b.id, index: j, itemType: child.type };
          }
          const nested = findBlockLocation([child], id);
          if (nested) return nested;
        }
      }
      if (b.type === "row") {
        for (let cIdx = 0; cIdx < b.columns.length; cIdx++) {
          const c = b.columns[cIdx];
          if (c.id === id) {
            return { kind: "rowColumns", parentId: b.id, index: cIdx, itemType: c.type };
          }
          for (let mIdx = 0; mIdx < c.children.length; mIdx++) {
            const m = c.children[mIdx];
            if (m.id === id) {
              return { kind: "columnChildren", parentId: c.id, index: mIdx, itemType: m.type };
            }
            const nested = findBlockLocation([m], id);
            if (nested) return nested;
          }
        }
      }
      if (b.type === "column") {
        for (let j = 0; j < b.children.length; j++) {
          const child = b.children[j];
          if (child.id === id) {
            return { kind: "columnChildren", parentId: b.id, index: j, itemType: child.type };
          }
          const nested = findBlockLocation([child], id);
          if (nested) return nested;
        }
      }
    }
    return null;
  }

  function getCollection(root: Block[], loc: CollectionLocation): Block[] | ColumnBlock[] | null {
    if (loc.kind === "root") return root;

    const walk = (arr: Block[]): Block[] | ColumnBlock[] | null => {
      for (const b of arr) {
        if (loc.kind === "sectionChildren" && b.type === "section" && b.id === loc.parentId) return b.children;
        if (loc.kind === "columnChildren" && b.type === "column" && b.id === loc.parentId) return b.children;
        if (b.type === "section") {
          const nested = walk(b.children);
          if (nested) return nested;
        }
        if (loc.kind === "rowColumns" && b.type === "row" && b.id === loc.parentId) return b.columns;
        if (b.type === "row") {
          for (const c of b.columns) {
            if (loc.kind === "columnChildren" && c.id === loc.parentId) return c.children;
            const nested = walk(c.children);
            if (nested) return nested;
          }
        }
        if (b.type === "column") {
          const nested = walk(b.children);
          if (nested) return nested;
        }
      }
      return null;
    };

    return walk(root);
  }

  function setCollection(root: Block[], loc: CollectionLocation, next: Block[] | ColumnBlock[]): Block[] {
    if (loc.kind === "root") return next as Block[];

    return root.map((b) => {
      if (loc.kind === "sectionChildren" && b.type === "section" && b.id === loc.parentId) {
        return { ...b, children: next as Block[] };
      }
      if (loc.kind === "rowColumns" && b.type === "row" && b.id === loc.parentId) {
        return { ...b, columns: next as ColumnBlock[] };
      }
      if (loc.kind === "columnChildren" && b.type === "column" && b.id === loc.parentId) {
        return { ...b, children: next as Block[] };
      }
      if (b.type === "section") {
        const updated = setCollection(b.children, loc, next);
        if (updated !== b.children) return { ...b, children: updated };
        return b;
      }
      if (b.type === "row") {
        let didChange = false;
        const nextCols = b.columns.map((c) => {
          if (loc.kind === "columnChildren" && c.id === loc.parentId) {
            didChange = true;
            return { ...c, children: next as Block[] };
          }
          const updated = setCollection(c.children, loc, next);
          if (updated !== c.children) {
            didChange = true;
            return { ...c, children: updated };
          }
          return c;
        });
        if (didChange) return { ...b, columns: nextCols };
        return b;
      }
      if (b.type === "column") {
        const updated = setCollection(b.children, loc, next);
        if (updated !== b.children) return { ...b, children: updated };
        return b;
      }
      return b;
    });
  }

  function canMoveItem(movedType: Block["type"], targetCollection: CollectionLocation): boolean {
    if (movedType === "section") return targetCollection.kind === "root";
    if (movedType === "row") return targetCollection.kind === "sectionChildren";
    if (movedType === "column") return targetCollection.kind === "rowColumns";
    return targetCollection.kind === "columnChildren";
  }

  function moveByDrop(sourceId: string, targetId: string): void {
    if (sourceId === targetId) return;
    const srcLoc = findBlockLocation(blocks, sourceId);
    const tgtLoc = findBlockLocation(blocks, targetId);
    if (!srcLoc || !tgtLoc) return;

    const srcCollectionLoc: CollectionLocation = toCollectionLocation(srcLoc);
    const tgtCollectionLoc: CollectionLocation = toCollectionLocation(tgtLoc);

    const srcArr = getCollection(blocks, srcCollectionLoc);
    const tgtArr = getCollection(blocks, tgtCollectionLoc);
    if (!srcArr || !tgtArr) return;

    const srcArrAny = [...(srcArr as Array<Block | ColumnBlock>)];
    const moved = srcArrAny[srcLoc.index];
    if (!moved) return;
    if (!canMoveItem((moved as Block).type, tgtCollectionLoc)) return;

    srcArrAny.splice(srcLoc.index, 1);
    let nextBlocks = setCollection(blocks, srcCollectionLoc, srcArrAny as any);

    const tgtArrAfter = getCollection(nextBlocks, tgtCollectionLoc);
    if (!tgtArrAfter) return;
    const tgtArrAny = [...(tgtArrAfter as Array<Block | ColumnBlock>)];

    const targetIndexAfterRemoval = (() => {
      if (srcLoc.kind === tgtLoc.kind && srcLoc.parentId === tgtLoc.parentId && srcLoc.index < tgtLoc.index) {
        return Math.max(0, tgtLoc.index - 1);
      }
      return tgtLoc.index;
    })();

    tgtArrAny.splice(targetIndexAfterRemoval, 0, moved);
    nextBlocks = setCollection(nextBlocks, tgtCollectionLoc, tgtArrAny as any);
    commitBlocks(nextBlocks);
  }

  function dropIntoCollection(sourceId: string, targetCollection: CollectionLocation, index?: number): void {
    const srcLoc = findBlockLocation(blocks, sourceId);
    if (!srcLoc) return;

    const srcCollectionLoc: CollectionLocation = toCollectionLocation(srcLoc);
    const srcArr = getCollection(blocks, srcCollectionLoc);
    const tgtArr = getCollection(blocks, targetCollection);
    if (!srcArr || !tgtArr) return;

    const srcArrAny = [...(srcArr as Array<Block | ColumnBlock>)];
    const moved = srcArrAny[srcLoc.index];
    if (!moved) return;
    if (!canMoveItem((moved as Block).type, targetCollection)) return;

    srcArrAny.splice(srcLoc.index, 1);
    let nextBlocks = setCollection(blocks, srcCollectionLoc, srcArrAny as any);

    const tgtArrAfter = getCollection(nextBlocks, targetCollection);
    if (!tgtArrAfter) return;
    const tgtArrAny = [...(tgtArrAfter as Array<Block | ColumnBlock>)];
    const at = typeof index === "number" ? Math.min(Math.max(0, index), tgtArrAny.length) : tgtArrAny.length;
    tgtArrAny.splice(at, 0, moved);

    nextBlocks = setCollection(nextBlocks, targetCollection, tgtArrAny as any);
    commitBlocks(nextBlocks);
  }

  const duplicateAny = (id: string) => {
    const loc = findBlockLocation(blocks, id);
    if (!loc) return;
    const collectionLoc = toCollectionLocation(loc);
    const arr = getCollection(blocks, collectionLoc);
    if (!arr) return;
    const next = [...(arr as Array<Block | ColumnBlock>)];
    const original = next[loc.index] as any;
    if (!original) return;
    const cloned = cloneWithNewIds(original as Block);
    next.splice(loc.index + 1, 0, cloned as any);
    commitBlocks(setCollection(blocks, collectionLoc, next as any));
  };

  const addSection = () => {
    const sec: SectionBlock = {
      id: newId(),
      type: "section",
      title: "Section",
      backgroundUrl: "",
      overlayClassName: "bg-black/40",
      className: "relative overflow-hidden rounded-xl border border-border p-6",
      children: [],
    };
    commitBlocks([...blocks, sec]);
  };

  const addSectionTemplate = (template: "blank" | "header" | "hero" | "about" | "services" | "footer") => {
    const sectionBase: SectionBlock = {
      id: newId(),
      type: "section",
      title:
        template === "blank"
          ? "Section"
          : template === "header"
            ? "Header"
            : template === "hero"
              ? "Hero"
              : template === "about"
                ? "About"
                : template === "services"
                  ? "Services"
                  : "Footer",
      backgroundUrl: "",
      overlayClassName: "bg-transparent",
      className: "relative overflow-hidden rounded-xl border border-border p-6",
      children: [],
    };

    if (template === "blank") {
      commitBlocks([...blocks, sectionBase]);
      return;
    }

    const makeRow = (preset: Array<ColumnWidth>) => {
      const row: RowBlock = {
        id: newId(),
        type: "row",
        className: "",
        columns: preset.map((w) => ({ id: newId(), type: "column", width: w, className: "space-y-4", children: [] })),
      };
      return row;
    };

    const row =
      template === "services"
        ? makeRow(["1/3", "1/3", "1/3"])
        : template === "about"
          ? makeRow(["1/3", "2/3"])
          : template === "header" || template === "hero"
            ? makeRow(["1/2", "1/2"])
            : makeRow(["1/1"]);

    if (template === "header") {
      const leftCol = row.columns[0];
      const rightCol = row.columns[1];
      leftCol.children.push({ ...defaultModule("h2"), content: "Your Brand" });
      rightCol.children.push({ ...defaultModule("cta"), content: "Contact" });
      rightCol.className = "space-y-4 flex justify-end";
      sectionBase.className = "relative overflow-hidden rounded-xl border border-border px-6 py-4";
    }

    if (template === "hero") {
      const leftCol = row.columns[0];
      const rightCol = row.columns[1];
      leftCol.children.push({ ...defaultModule("h1"), content: "Grow your business with SEO" });
      leftCol.children.push({ ...defaultModule("paragraph"), content: "Write a short, clear value proposition here." });
      leftCol.children.push({ ...defaultModule("cta"), content: "Get started" });
      rightCol.children.push({ ...defaultModule("image"), content: "Hero image" });
      sectionBase.className = "relative overflow-hidden rounded-xl border border-border p-6 bg-muted/20";
    }

    if (template === "about") {
      const leftCol = row.columns[0];
      const rightCol = row.columns[1];
      leftCol.children.push({ ...defaultModule("image"), content: "About image" });
      rightCol.children.push({ ...defaultModule("h2"), content: "About us" });
      rightCol.children.push({ ...defaultModule("paragraph"), content: "Explain who you are, what you do, and why it matters." });
    }

    if (template === "services") {
      const titles = ["Service 1", "Service 2", "Service 3"];
      row.columns.forEach((c, i) => {
        c.className = "space-y-3 rounded-lg border border-border p-4 bg-background";
        c.children.push({ ...defaultModule("h3"), content: titles[i] ?? "Service" });
        c.children.push({ ...defaultModule("paragraph"), content: "Describe the service in one sentence." });
      });
    }

    if (template === "footer") {
      const col = row.columns[0];
      col.children.push({ ...defaultModule("paragraph"), content: "© Your Company. All rights reserved." });
      col.className = "space-y-4 text-center";
      sectionBase.className = "relative overflow-hidden rounded-xl border border-border px-6 py-6 bg-muted/20";
    }

    sectionBase.children = [row];
    commitBlocks([...blocks, sectionBase]);
  };

  function updateBlockInTree(nextBlocks: Block[], id: string, updater: (b: Block) => Block): Block[] {
    return nextBlocks.map((b) => {
      if (b.id === id) return updater(b);
      if (b.type === "section") {
        const children = updateBlockInTree(b.children, id, updater);
        if (children !== b.children) return { ...b, children };
      }
      if (b.type === "row") {
        let didChange = false;
        const nextCols = b.columns.map((c) => {
          const nextChildren = updateBlockInTree(c.children, id, updater);
          if (nextChildren !== c.children) {
            didChange = true;
            return { ...c, children: nextChildren };
          }
          return c;
        });
        if (didChange) return { ...b, columns: nextCols };
      }
      if (b.type === "column") {
        const children = updateBlockInTree(b.children, id, updater);
        if (children !== b.children) return { ...b, children };
      }
      return b;
    });
  }

  function removeBlockInTree(nextBlocks: Block[], id: string): Block[] {
    const filtered = nextBlocks.filter((b) => b.id !== id);
    if (filtered.length !== nextBlocks.length) return filtered;
    return nextBlocks.map((b) => {
      if (b.type === "section") {
        const children = removeBlockInTree(b.children, id);
        if (children !== b.children) return { ...b, children };
        return b;
      }
      if (b.type === "row") {
        const nextCols = removeBlockInColumns(b.columns, id);
        if (nextCols !== b.columns) return { ...b, columns: nextCols };
        return b;
      }
      if (b.type === "column") {
        const children = removeBlockInTree(b.children, id);
        if (children !== b.children) return { ...b, children };
        return b;
      }
      return b;
    });
  }

  function removeBlockInColumns(cols: ColumnBlock[], id: string): ColumnBlock[] {
    return cols
      .map((c) => ({ ...c, children: removeBlockInTree(c.children, id) }))
      .filter((c) => c.id !== id);
  }

  function findChildrenArray(root: Block[], parentId: string | null): Block[] | null {
    if (!parentId) return root;
    for (const b of root) {
      if (b.type === "section") {
        if (b.id === parentId) return b.children;
        const nested = findChildrenArray(b.children, parentId);
        if (nested) return nested;
      }
      if (b.type === "row") {
        for (const c of b.columns) {
          if (c.id === parentId) return c.children;
          const nested = findChildrenArray(c.children, parentId);
          if (nested) return nested;
        }
      }
      if (b.type === "column") {
        if (b.id === parentId) return b.children;
        const nested = findChildrenArray(b.children, parentId);
        if (nested) return nested;
      }
    }
    return null;
  }

  function setChildrenArray(root: Block[], parentId: string | null, nextChildren: Block[]): Block[] {
    if (!parentId) return nextChildren;
    return root.map((b) => {
      if (b.type === "section") {
        if (b.id === parentId) return { ...b, children: nextChildren };
        const updated = setChildrenArray(b.children, parentId, nextChildren);
        if (updated !== b.children) return { ...b, children: updated };
        return b;
      }

      if (b.type === "row") {
        let didChange = false;
        const nextCols = b.columns.map((c) => {
          if (c.id === parentId) {
            didChange = true;
            return { ...c, children: nextChildren };
          }
          const updated = setChildrenArray(c.children, parentId, nextChildren);
          if (updated !== c.children) {
            didChange = true;
            return { ...c, children: updated };
          }
          return c;
        });
        if (didChange) return { ...b, columns: nextCols };
        return b;
      }

      if (b.type === "column") {
        if (b.id === parentId) return { ...b, children: nextChildren };
        const updated = setChildrenArray(b.children, parentId, nextChildren);
        if (updated !== b.children) return { ...b, children: updated };
        return b;
      }

      return b;
    });
  }

  const updateBlock = (id: string, content: string) => {
    commitBlocks(
      updateBlockInTree(blocks, id, (b) => {
        if (b.type === "section" || b.type === "row" || b.type === "column") return b;
        return { ...b, content };
      }),
    );
  };

  const updateBlockResponsiveClassName = (
    id: string,
    patch: Partial<{ mobile: string; tablet: string; desktop: string }>,
  ) => {
    commitBlocks(
      updateBlockInTree(blocks, id, (b) => ({
        ...b,
        responsiveClassName: {
          ...(b.responsiveClassName ?? {}),
          ...patch,
        },
      })),
    );
  };

  function cloneWithNewIds(b: Block): Block {
    if (b.type === "section") {
      return {
        ...b,
        id: newId(),
        children: b.children.map(cloneWithNewIds),
      };
    }
    if (b.type === "row") {
      return {
        ...b,
        id: newId(),
        columns: b.columns.map((c) => ({
          ...c,
          id: newId(),
          children: c.children.map(cloneWithNewIds),
        })),
      };
    }
    if (b.type === "column") {
      return {
        ...b,
        id: newId(),
        children: b.children.map(cloneWithNewIds),
      };
    }
    return {
      ...b,
      id: newId(),
    };
  }

  const duplicateTopLevel = (id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const next = [...blocks];
    const cloned = cloneWithNewIds(next[idx]);
    next.splice(idx + 1, 0, cloned);
    commitBlocks(next);
  };

  const updateBlockClassName = (id: string, className: string) => {
    commitBlocks(updateBlockInTree(blocks, id, (b) => ({ ...b, className })));
  };

  const updateSectionMeta = (id: string, patch: Partial<Pick<SectionBlock, "title" | "backgroundUrl" | "overlayClassName">>) => {
    commitBlocks(
      updateBlockInTree(blocks, id, (b) => {
        if (b.type !== "section") return b;
        return { ...b, ...patch };
      }),
    );
  };

  const addRowToSection = (sectionId: string, preset: Array<ColumnWidth>) => {
    const row: RowBlock = {
      id: newId(),
      type: "row",
      className: "grid gap-4",
      columns: preset.map((w) => ({ id: newId(), type: "column", width: w, className: "space-y-4", children: [] })),
    };

    commitBlocks(
      updateBlockInTree(blocks, sectionId, (b) => {
        if (b.type !== "section") return b;
        return { ...b, children: [...b.children, row] };
      }),
    );
  };

  const addModuleToColumn = (columnId: string, type: BlockType) => {
    const child = defaultModule(type);
    commitBlocks(
      updateBlockInTree(blocks, columnId, (b) => {
        if (b.type !== "column") return b;
        return { ...b, children: [...b.children, child] };
      }),
    );
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    const loc = findBlockLocation(blocks, id);
    if (!loc) return;
    const collectionLoc: CollectionLocation = toCollectionLocation(loc);
    const arr = getCollection(blocks, collectionLoc);
    if (!arr) return;
    const next = [...(arr as Array<Block | ColumnBlock>)];
    const idx = loc.index;
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= next.length) return;
    const tmp = next[idx];
    next[idx] = next[nextIdx];
    next[nextIdx] = tmp;
    commitBlocks(setCollection(blocks, collectionLoc, next as any));
  };

  const reorderBlocks = (sourceId: string, targetId: string) => {
    if (!draggedBlock) return;
    moveByDrop(sourceId, targetId);
  };

  const removeBlock = (id: string) => {
    commitBlocks(removeBlockInTree(blocks, id));
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const addChildBlock = (sectionId: string, type: BlockType) => {
    const child: Block = {
      id: newId(),
      type,
      content: type === "h1" ? "New Heading" : type === "faq" ? "What is your question?" : "",
      className: "",
    };
    commitBlocks(
      updateBlockInTree(blocks, sectionId, (b) => {
        if (b.type !== "section") return b;
        return { ...b, children: [...b.children, child] };
      }),
    );
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  function findBlockById(root: Block[], id: string): Block | null {
    for (const b of root) {
      if (b.id === id) return b;
      if (b.type === "section") {
        const nested = findBlockById(b.children, id);
        if (nested) return nested;
      }
      if (b.type === "row") {
        for (const c of b.columns) {
          if (c.id === id) return c;
          const nested = findBlockById(c.children, id);
          if (nested) return nested;
        }
      }
      if (b.type === "column") {
        const nested = findBlockById(b.children, id);
        if (nested) return nested;
      }
    }
    return null;
  }

  const selectedId = selectedIds[0] ?? null;
  const selectedBlock = selectedId ? findBlockById(blocks, selectedId) : null;

  function findAncestors(root: Block[], targetId: string): { sectionId: string | null; columnId: string | null } {
    const walk = (
      arr: Block[],
      ctx: { sectionId: string | null; columnId: string | null },
    ): { sectionId: string | null; columnId: string | null } | null => {
      for (const b of arr) {
        const nextCtx = {
          sectionId: ctx.sectionId,
          columnId: ctx.columnId,
        };
        if (b.type === "section") nextCtx.sectionId = b.id;
        if (b.type === "column") nextCtx.columnId = b.id;

        if (b.id === targetId) return nextCtx;

        if (b.type === "section") {
          const found = walk(b.children, nextCtx);
          if (found) return found;
        }
        if (b.type === "row") {
          for (const c of b.columns) {
            const foundCol = walk([c], nextCtx);
            if (foundCol) return foundCol;
          }
        }
        if (b.type === "column") {
          const found = walk(b.children, nextCtx);
          if (found) return found;
        }
      }
      return null;
    };

    return walk(root, { sectionId: null, columnId: null }) ?? { sectionId: null, columnId: null };
  }

  const ancestors = useMemo(() => {
    if (!selectedId) return { sectionId: null as string | null, columnId: null as string | null };
    return findAncestors(blocks, selectedId);
  }, [blocks, selectedId]);

  const selectedSectionId = ancestors.sectionId;
  const selectedColumnId = ancestors.columnId;

  useEffect(() => {
    if (!selectedId) return;
    const el = document.getElementById(`pb-${selectedId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedId]);

  const sectionOptions = useMemo(() => {
    const out: Array<{ id: string; label: string; anchor: string }> = [];
    for (const b of blocks) {
      if (b.type === "section") {
        out.push({ id: b.id, label: (b.title ?? "Section").trim() || "Section", anchor: sectionAnchorId(b) });
      }
    }
    return out;
  }, [blocks]);

  const scrollToSection = (sectionId: string) => {
    const sec = findBlockById(blocks, sectionId);
    if (!sec || sec.type !== "section") return;
    const anchor = sectionAnchorId(sec);
    const el = document.getElementById(anchor);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const addRowToSelectedSection = (preset: Array<ColumnWidth>) => {
    if (!selectedSectionId) return;
    addRowToSection(selectedSectionId, preset);
  };

  const addModuleToSelectedColumn = (type: BlockType) => {
    if (selectedColumnId) {
      addModuleToColumn(selectedColumnId, type);
      return;
    }
    if (!selectedSectionId) return;
    addModuleToSection(selectedSectionId, type);
  };

  function findFirstColumnIdInSection(section: SectionBlock): string | null {
    for (const child of section.children) {
      if (child.type === "row") {
        const c = child.columns[0];
        if (c) return c.id;
      }
      if (child.type === "column") return child.id;
    }
    return null;
  }

  const addModuleToSection = (sectionId: string, type: BlockType) => {
    const module = defaultModule(type);
    commitBlocks(
      updateBlockInTree(blocks, sectionId, (b) => {
        if (b.type !== "section") return b;
        const existingColId = findFirstColumnIdInSection(b);
        if (existingColId) return b;

        const col: ColumnBlock = {
          id: newId(),
          type: "column",
          width: "1/1",
          className: "space-y-4",
          children: [module],
        };
        const row: RowBlock = {
          id: newId(),
          type: "row",
          className: "grid gap-4",
          columns: [col],
        };
        return { ...b, children: [...b.children, row] };
      }),
    );
    setSelectedIds([module.id]);
  };

  const CanvasNode = ({ b, parentId }: { b: Block; parentId: string | null }) => {
    const isSel = selectedIds.includes(b.id);
    const wrapperCls = cn(
      "relative",
      isSel ? "outline outline-2 outline-blue-500/60 rounded" : "hover:outline hover:outline-1 hover:outline-blue-500/30 rounded",
    );

    const isInlineEditableText =
      canvasMode === "edit" &&
      isSel &&
      isContentBlock(b) &&
      (b.type === "h1" || b.type === "h2" || b.type === "h3" || b.type === "paragraph" || b.type === "faq");

    const dragHandlers = {
      draggable: !isInlineEditableText,
      onDragStart: () => setDraggedBlock({ id: b.id, parentId }),
      onDragEnd: () => setDraggedBlock(null),
      onDragOver: (e: any) => e.preventDefault(),
      onDrop: () => {
        if (!draggedBlock) return;
        reorderBlocks(draggedBlock.id, b.id);
        setDraggedBlock(null);
      },
    };

    if (b.type === "section") {
      const bg = (b.backgroundUrl ?? "").trim();
      return (
        <section
          id={sectionAnchorId(b)}
          className={cn(wrapperCls, cn("relative", cn((b.className ?? "").trim(), responsiveToTailwind(b.responsiveClassName)) || "relative overflow-hidden rounded-xl border border-border p-6"))}
          style={bg ? { backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          onClick={(e) => {
            e.stopPropagation();
            selectBlock(b.id, (e as any).shiftKey);
          }}
          {...dragHandlers}
        >
          <div className={cn("pointer-events-none absolute inset-0", (b.overlayClassName ?? "bg-black/40").trim() || "bg-black/40")} />
          <div className="relative z-10 space-y-4">
            {draggedBlock ? (
              <div
                className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 px-3 py-2 text-xs text-muted-foreground"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.stopPropagation();
                  dropIntoCollection(draggedBlock.id, { kind: "sectionChildren", parentId: b.id });
                  setDraggedBlock(null);
                }}
              >
                Drop here
              </div>
            ) : null}
            {b.children.length === 0 ? <div className="text-sm text-muted-foreground">Empty section</div> : null}
            {b.children.map((c) => (
              <CanvasNode key={c.id} b={c} parentId={b.id} />
            ))}
          </div>
        </section>
      );
    }

    if (b.type === "row") {
      const cls = cn("grid grid-cols-1 md:grid-cols-12 gap-4", cn((b.className ?? "").trim(), responsiveToTailwind(b.responsiveClassName)));
      return (
        <div
          className={cn(wrapperCls, cls)}
          onClick={(e) => {
            e.stopPropagation();
            selectBlock(b.id, (e as any).shiftKey);
          }}
          {...dragHandlers}
        >
          {b.columns.map((c) => {
            const span = c.width === "1/1" ? 12 : c.width === "1/2" ? 6 : c.width === "1/3" ? 4 : 8;
            const spanClass = span === 12 ? "md:col-span-12" : span === 8 ? "md:col-span-8" : span === 6 ? "md:col-span-6" : "md:col-span-4";
            return (
              <div key={c.id} className={cn(spanClass, "min-w-0")}> 
                <CanvasNode b={c} parentId={b.id} />
              </div>
            );
          })}
        </div>
      );
    }

    if (b.type === "column") {
      const cls = cn("space-y-4", cn((b.className ?? "").trim(), responsiveToTailwind(b.responsiveClassName)));
      return (
        <div
          className={cn(wrapperCls, cls)}
          onClick={(e) => {
            e.stopPropagation();
            selectBlock(b.id, (e as any).shiftKey);
          }}
          {...dragHandlers}
        >
          {draggedBlock ? (
            <div
              className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 px-3 py-2 text-xs text-muted-foreground"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.stopPropagation();
                dropIntoCollection(draggedBlock.id, { kind: "columnChildren", parentId: b.id });
                setDraggedBlock(null);
              }}
            >
              Drop here
            </div>
          ) : null}
          {b.children.length === 0 ? <div className="text-sm text-muted-foreground">Empty column</div> : null}
          {b.children.map((c) => (
            <CanvasNode key={c.id} b={c} parentId={b.id} />
          ))}
        </div>
      );
    }

    return (
      <div
        className={wrapperCls}
        onClick={(e) => {
          e.stopPropagation();
          selectBlock(b.id, (e as any).shiftKey);
        }}
        {...dragHandlers}
      >
        {isInlineEditableText ? (
          <PreviewTree
            block={b}
            editable
            selectedId={selectedId}
            onChangeContent={updateBlock}
            onSelect={(id, e) => selectBlock(id, (e as any).shiftKey)}
            onScrollToSection={scrollToSection}
          />
        ) : (
          <PreviewBlock block={b} />
        )}
      </div>
    );
  };

  const WorkspaceItem = ({ b, depth }: { b: Block; depth: number }) => {
    const isSel = selectedIds.includes(b.id);
    const label =
      b.type === "section"
        ? ((b.title ?? "Section").trim() || "Section")
        : b.type === "row"
          ? "Row"
          : b.type === "column"
            ? `Column ${b.width}`
            : b.type === "nav"
              ? "Nav"
              : b.type === "card"
                ? "Card"
                : b.type.toUpperCase();

    return (
      <div className="space-y-1">
        <button
          type="button"
          className={cn(
            "w-full text-left rounded-md px-2 py-1 text-sm border",
            isSel ? "border-blue-500/60 bg-blue-500/10" : "border-transparent hover:border-border hover:bg-muted/30",
          )}
          style={{ marginLeft: depth * 12 }}
          onClick={(e) => selectBlock(b.id, (e as any).shiftKey)}
        >
          {label}
        </button>
        {b.type === "section" ? b.children.map((c) => <WorkspaceItem key={c.id} b={c} depth={depth + 1} />) : null}
        {b.type === "row" ? b.columns.map((c) => <WorkspaceItem key={c.id} b={c} depth={depth + 1} />) : null}
        {b.type === "column" ? b.children.map((c) => <WorkspaceItem key={c.id} b={c} depth={depth + 1} />) : null}
      </div>
    );
  };

  const applyBulkStyles = () => {
    const cls = bulkClassName;
    if (!cls.trim()) return;
    commitBlocks((() => {
      let next = blocks;
      for (const id of selectedIds) {
        next = updateBlockInTree(next, id, (b) => ({
          ...b,
          responsiveClassName: {
            ...(b.responsiveClassName ?? {}),
            mobile: cls,
          },
        }));
      }
      return next;
    })());
  };

const hasH1 = blocks.some((b) => b.type === "h1");
const headingStructure = blocks.filter(
  (b): b is ContentBlock =>
    isContentBlock(b) && (b.type === "h1" || b.type === "h2" || b.type === "h3"),
);

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
    <div className="min-w-0 overflow-x-hidden p-4 sm:p-6 space-y-6">
      <header className="mb-6 animate-slide-up">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-display font-bold text-foreground">Page Builder</h1>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex items-center gap-2">
              <Button type="button" variant={devicePreset === "desktop" ? "default" : "outline"} size="sm" onClick={() => setDevicePreset("desktop")} disabled={loading}>
                Desktop
              </Button>
              <Button type="button" variant={devicePreset === "tablet" ? "default" : "outline"} size="sm" onClick={() => setDevicePreset("tablet")} disabled={loading}>
                Tablet
              </Button>
              <Button type="button" variant={devicePreset === "mobile" ? "default" : "outline"} size="sm" onClick={() => setDevicePreset("mobile")} disabled={loading}>
                Mobile
              </Button>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={loading || blocks.length === 0} className="w-full sm:w-auto">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </DialogTrigger>
              <DialogContent className={previewFullscreen ? "max-w-[96vw]" : "max-w-3xl"}>
                <DialogHeader>
                  <div className="flex items-center justify-between gap-3">
                    <DialogTitle>Preview</DialogTitle>
                    <Button type="button" variant="outline" size="sm" onClick={() => setPreviewFullscreen((v) => !v)}>
                      <Maximize2 className="h-4 w-4 mr-2" />
                      {previewFullscreen ? "Exit full screen" : "Full screen"}
                    </Button>
                  </div>
                </DialogHeader>
                <div className={(previewFullscreen ? "h-[78vh]" : "max-h-[70vh]") + " overflow-auto rounded-lg border border-border bg-background p-6"}>
                  {blocks.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Nothing to preview yet.</div>
                  ) : (
                    <div className="w-full flex justify-center">
                      <DeviceFrame preset={devicePreset}>
                        <div className="space-y-4">
                          {blocks.map((b) => (
                            <PreviewBlock key={b.id} block={b} />
                          ))}
                        </div>
                      </DeviceFrame>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Button
              className="gradient-seo text-primary-foreground w-full sm:w-auto"
              onClick={() => {
                void saveChanges().catch(() => {});
              }}
              disabled={loading || saving || blocks.length === 0}
            >
              Save Changes
            </Button>

            <Button type="button" variant="outline" size="sm" disabled={!canUndo || loading} onClick={undo}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Undo
            </Button>

            <Button type="button" variant="outline" size="sm" disabled={!canRedo || loading} onClick={redo}>
              <RotateCw className="w-4 h-4 mr-2" />
              Redo
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground mt-2">Select an element to edit. Drag to reorder.</p>
      </header>

      {selectedIds.length > 1 ? (
        <Card className="mb-6 p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-foreground">
              <span className="font-medium">{selectedIds.length}</span> selected
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                value={bulkClassName}
                onChange={(e) => setBulkClassName(e.target.value)}
                placeholder="Apply Tailwind classes to all selected…"
                className="w-[320px] max-w-full"
              />
              <Button type="button" onClick={applyBulkStyles}>
                Apply to selected
              </Button>
              <Button type="button" variant="outline" onClick={() => setSelectedIds([])}>
                Clear selection
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start min-w-0">
        <div className="lg:col-span-3 min-w-0 h-fit lg:sticky lg:top-6 animate-slide-up">
          <div className="flex gap-3">
            <div className="w-14 shrink-0 rounded-xl border border-border bg-muted/20 p-2 flex flex-col gap-2">
              <Button type="button" variant={leftTab === "add" ? "default" : "ghost"} size="icon" onClick={() => setLeftTab("add")}>
                <PlusSquare className="w-5 h-5" />
              </Button>
              <Button type="button" variant={leftTab === "layers" ? "default" : "ghost"} size="icon" onClick={() => setLeftTab("layers")}>
                <Layers className="w-5 h-5" />
              </Button>
            </div>

            <Card className="flex-1 min-w-0 p-4 overflow-hidden">
              {leftTab === "add" ? (
                <div className="space-y-3">
                  <Dialog open={sectionTemplateOpen} onOpenChange={setSectionTemplateOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-start">
                        {/* <Plus className="w-4 h-4 mr-2" /> */}
                        Add Section
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[80vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>Add a section</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sectionTemplates.map((t) => (
                          <button
                            key={t.key}
                            type="button"
                            className="rounded-lg border border-border p-4 text-left hover:border-primary/40 hover:bg-muted/30 transition-colors"
                            onClick={() => {
                              addSectionTemplate(t.key);
                              setSectionTemplateOpen(false);
                            }}
                          >
                            <div className="font-medium text-foreground">{t.label}</div>
                            <div className="text-xs text-muted-foreground mt-1">{t.desc}</div>
                          </button>
                        ))}
                        <button
                          type="button"
                          className="rounded-lg border border-border p-4 text-left hover:border-primary/40 hover:bg-muted/30 transition-colors"
                          onClick={() => {
                            addSectionTemplate("blank");
                            setSectionTemplateOpen(false);
                          }}
                        >
                          <div className="font-medium text-foreground">Blank</div>
                          <div className="text-xs text-muted-foreground mt-1">Start from scratch</div>
                        </button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <div className="text-xs text-muted-foreground">Rows</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button type="button" size="sm" className="w-full min-w-0 overflow-hidden" variant="outline" disabled={!selectedSectionId} onClick={() => addRowToSelectedSection(["1/1"])}>
                        <span className="min-w-0 truncate">1 col</span>
                      </Button>
                      <Button type="button" size="sm" className="w-full min-w-0 overflow-hidden" variant="outline" disabled={!selectedSectionId} onClick={() => addRowToSelectedSection(["1/2", "1/2"])}>
                        <span className="min-w-0 truncate">1/2 + 1/2</span>
                      </Button>
                      <Button type="button" size="sm" className="w-full min-w-0 overflow-hidden" variant="outline" disabled={!selectedSectionId} onClick={() => addRowToSelectedSection(["1/3", "1/3", "1/3"])}>
                        <span className="min-w-0 truncate">3 cols</span>
                      </Button>
                      <Button type="button" size="sm" className="w-full min-w-0 overflow-hidden" variant="outline" disabled={!selectedSectionId} onClick={() => addRowToSelectedSection(["1/3", "2/3"])}>
                        <span className="min-w-0 truncate">1/3 + 2/3</span>
                      </Button>
                    </div>
                    {!selectedSectionId ? <div className="text-[11px] text-muted-foreground">Select a section to add a row.</div> : null}
                  </div>

                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <div className="text-xs text-muted-foreground">Modules</div>
                    <div className="space-y-2">
                      {blockTypes.map((block) => (
                        <Button
                          key={block.type}
                          type="button"
                          variant="outline"
                          className="w-full justify-start gap-2 min-w-0 overflow-hidden"
                          disabled={!selectedColumnId && !selectedSectionId}
                          onClick={() => addModuleToSelectedColumn(block.type)}
                        >
                          <block.icon className="w-4 h-4 shrink-0" />
                          <span className="min-w-0 truncate">{block.label}</span>
                        </Button>
                      ))}
                    </div>
                    {!selectedColumnId && !selectedSectionId ? <div className="text-[11px] text-muted-foreground">Select a column or section to add a module.</div> : null}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Layers</div>
                  <div className="space-y-1 max-h-[60vh] overflow-auto pr-1">
                    {blocks.length === 0 ? (
                      <div className="text-xs text-muted-foreground">Nothing yet.</div>
                    ) : (
                      blocks.map((b) => (
                        <WorkspaceItem key={b.id} b={b} depth={0} />
                      ))
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        <Card
          className="lg:col-span-6 min-w-0 p-6 animate-slide-up overflow-hidden"
          style={{ animationDelay: "0.1s" }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (draggedType && selectedColumnId) {
              addModuleToSelectedColumn(draggedType);
            }
            setDraggedType(null);
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-lg text-foreground">Canvas</h2>
            <Badge variant="outline" className="bg-muted/50">Homepage</Badge>
          </div>

          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant={canvasMode === "edit" ? "default" : "outline"} onClick={() => setCanvasMode("edit")}>
                Edit
              </Button>
              <Button type="button" size="sm" variant={canvasMode === "visual" ? "default" : "outline"} onClick={() => setCanvasMode("visual")}>
                Visual
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              {canvasMode === "visual" ? "Select text, then edit." : "Select blocks, edit in Inspector."}
            </div>
          </div>

          <div className="w-full min-w-0 flex justify-center">
            <DeviceFrame preset={devicePreset}>
              {blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-muted rounded-lg">
                  <Plus className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-center">Add a section to start</p>
                </div>
              ) : canvasMode === "visual" ? (
                <div className="space-y-4">
                  {blocks.map((b) => (
                    <PreviewTree
                      key={b.id}
                      block={b}
                      editable
                      selectedId={selectedId}
                      onChangeContent={(id, content) => updateBlock(id, content)}
                      onSelect={(id, e) => selectBlock(id, (e as any).shiftKey)}
                      onScrollToSection={scrollToSection}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4" onClick={() => setSelectedIds([])}>
                  {blocks.map((block) => (
                    <CanvasNode key={block.id} b={block} parentId={null} />
                  ))}
                </div>
              )}
            </DeviceFrame>
          </div>

          {draggedType ? (
            <div className="mt-4 p-4 border-2 border-dashed border-primary rounded-lg text-center text-primary animate-pulse">
              Drop to add (select a column first)
            </div>
          ) : null}
        </Card>

        <div className="lg:col-span-3 min-w-0 space-y-4">
          <Card className="p-4 animate-slide-up max-h-[80vh] flex flex-col" style={{ animationDelay: "0.2s" }}>
            <h2 className="font-display font-bold text-lg text-foreground mb-4">Inspector</h2>
            <div className="flex-1 min-h-0 overflow-auto pr-1">
              {selectedBlock ? (
                <BlockEditor
                  block={selectedBlock}
                  onUpdate={(content) => updateBlock(selectedBlock.id, content)}
                  onUpdateById={(id, content) => updateBlock(id, content)}
                  onUpdateClassName={(className) => updateBlockClassName(selectedBlock.id, className)}
                  onUpdateResponsiveClassName={(patch) => updateBlockResponsiveClassName(selectedBlock.id, patch)}
                  copiedResponsiveStyle={copiedResponsiveStyle}
                  setCopiedResponsiveStyle={setCopiedResponsiveStyle}
                  onUpdateSectionMeta={(patch) => updateSectionMeta(selectedBlock.id, patch)}
                  onAddChild={() => {}}
                  onAddRowPreset={() => {}}
                  onAddModuleToColumn={() => {}}
                  onRemove={() => removeBlock(selectedBlock.id)}
                  onDuplicate={() => duplicateAny(selectedBlock.id)}
                  onMoveUp={() => moveBlock(selectedBlock.id, -1)}
                  onMoveDown={() => moveBlock(selectedBlock.id, 1)}
                  onDragStart={() => {}}
                  onDragEnd={() => {}}
                  onDropOn={() => {}}
                  selected
                  onToggleSelected={() => setSelectedIds([])}
                  sectionOptions={sectionOptions}
                  onScrollToSection={scrollToSection}
                />
              ) : (
                <div className="text-sm text-muted-foreground">Select something on the page to edit.</div>
              )}
            </div>

            {selectedBlock ? (
              <div className="pt-3 mt-3 border-t border-border space-y-2">
                <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => duplicateAny(selectedBlock.id)}>
                  Duplicate
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => moveBlock(selectedBlock.id, -1)}>
                    Up
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => moveBlock(selectedBlock.id, 1)}>
                    Down
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>

          <Card className="p-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <h2 className="font-display font-bold text-lg text-foreground mb-4">Headings</h2>
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
                    h.type === "h3" && "ml-8",
                  )}
                >
                  {h.type.toUpperCase()}: {h.content.substring(0, 30)}...
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  </DashboardLayout>
);
}

function PreviewBlock({ block }: { block: Block }) {
  const cls = cn((block.className ?? "").trim(), responsiveToTailwind(block.responsiveClassName));
  if (block.type === "section") {
    const bg = (block.backgroundUrl ?? "").trim();
    const anchor = sectionAnchorId(block);
    return (
      <section
        id={anchor}
        className={cn("relative", cls || "relative overflow-hidden rounded-xl border border-border p-6")}
        style={bg ? { backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        <div className={cn("pointer-events-none absolute inset-0", (block.overlayClassName ?? "bg-black/40").trim() || "bg-black/40")} />
        <div className="relative z-10 space-y-4">
          {block.children.length === 0 ? (
            <div className="text-sm text-muted-foreground">Empty section — add blocks inside.</div>
          ) : (
            block.children.map((c) => <PreviewBlock key={c.id} block={c} />)
          )}
        </div>
      </section>
    );
  }

  if (block.type === "row") {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-12 gap-4", cls)}>
        {block.columns.map((c) => {
          const span = c.width === "1/1" ? 12 : c.width === "1/2" ? 6 : c.width === "1/3" ? 4 : 8;
          const spanClass = span === 12 ? "md:col-span-12" : span === 8 ? "md:col-span-8" : span === 6 ? "md:col-span-6" : "md:col-span-4";
          return (
            <div key={c.id} className={cn(spanClass)}>
              <PreviewBlock block={c} />
            </div>
          );
        })}
      </div>
    );
  }

  if (block.type === "column") {
    return (
      <div className={cn("space-y-4", cls)}>
        {block.children.length === 0 ? <div className="text-sm text-muted-foreground">Empty column</div> : null}
        {block.children.map((c) => (
          <PreviewBlock key={c.id} block={c} />
        ))}
      </div>
    );
  }

  if (block.type === "h1") return <h1 className={cn("text-3xl font-bold text-foreground", cls)}>{block.content}</h1>;
  if (block.type === "h2") return <h2 className={cn("text-2xl font-semibold text-foreground", cls)}>{block.content}</h2>;
  if (block.type === "h3") return <h3 className={cn("text-xl font-semibold text-foreground", cls)}>{block.content}</h3>;
  if (block.type === "paragraph") return <p className={cn("text-foreground whitespace-pre-wrap", cls)}>{block.content}</p>;
  if (block.type === "faq") {
    return (
      <div className={cn("rounded-lg border border-border p-4", cls)}>
        <div className="font-medium text-foreground">FAQ</div>
        <div className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{block.content}</div>
      </div>
    );
  }
  if (block.type === "nav") {
    const data = parseJson<{ items: Array<{ label: string; sectionId: string }> }>(block.content, { items: [] });
    return (
      <nav className={cn("flex flex-wrap gap-3", cls)}>
        {data.items.map((it, idx) => (
          <button
            key={idx}
            type="button"
            className="text-sm underline underline-offset-4"
            onClick={() => {
              if (!it.sectionId) return;
              const el = document.getElementById(`sec-${it.sectionId}`);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            {it.label || "Link"}
          </button>
        ))}
      </nav>
    );
  }
  if (block.type === "card") {
    const data = parseJson<{ title: string; body: string }>(block.content, { title: "", body: "" });
    return (
      <div className={cn("rounded-lg border border-border bg-background p-4", cls)}>
        <div className="font-medium text-foreground">{data.title || "Card"}</div>
        <div className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{data.body || ""}</div>
      </div>
    );
  }
  if (block.type === "image") {
    return (
      <div className={cn("rounded-lg border border-border p-4", cls)}>
        <div className="text-sm text-muted-foreground">Image</div>
        <div className="text-sm text-foreground mt-2">{block.alt ?? block.content ?? "—"}</div>
      </div>
    );
  }
  if (block.type === "cta") {
    return (
      <div className={cn("pt-2", cls)}>
        <Button type="button" className={cn("w-full sm:w-auto", cls)}>
          {block.content || "Call to action"}
        </Button>
      </div>
    );
  }
  return <div className="text-sm text-muted-foreground">Unsupported block</div>;
}

function PreviewTree({
  block,
  editable,
  selectedId,
  onChangeContent,
  onSelect,
  onScrollToSection,
}: {
  block: Block;
  editable: boolean;
  selectedId: string | null;
  onChangeContent: (id: string, content: string) => void;
  onSelect: (id: string, e: MouseEvent) => void;
  onScrollToSection: (sectionId: string) => void;
}) {
  const cls = cn((block.className ?? "").trim(), responsiveToTailwind(block.responsiveClassName));
  const isSelected = selectedId === block.id;
  const canEditText = editable;

  if (block.type === "section") {
    const bg = (block.backgroundUrl ?? "").trim();
    const anchor = sectionAnchorId(block);
    return (
      <section
        id={anchor}
        className={cn("relative", cls || "relative overflow-hidden rounded-xl border border-border p-6")}
        style={bg ? { backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(block.id, e);
        }}
      >
        <div className={cn("pointer-events-none absolute inset-0", (block.overlayClassName ?? "bg-black/40").trim() || "bg-black/40")} />
        <div className="relative z-10 space-y-4">
          {block.children.length === 0 ? (
            <div className="text-sm text-muted-foreground">Empty section — add blocks inside.</div>
          ) : (
            block.children.map((c) => (
              <PreviewTree
                key={c.id}
                block={c}
                editable={editable}
                selectedId={selectedId}
                onChangeContent={onChangeContent}
                onSelect={onSelect}
                onScrollToSection={onScrollToSection}
              />
            ))
          )}
        </div>
      </section>
    );
  }

  if (block.type === "row") {
    return (
      <div
        className={cn("grid grid-cols-1 md:grid-cols-12 gap-4", cls)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(block.id, e);
        }}
      >
        {block.columns.map((c) => {
          const span = c.width === "1/1" ? 12 : c.width === "1/2" ? 6 : c.width === "1/3" ? 4 : 8;
          const spanClass = span === 12 ? "md:col-span-12" : span === 8 ? "md:col-span-8" : span === 6 ? "md:col-span-6" : "md:col-span-4";
          return (
            <div key={c.id} className={cn(spanClass)}>
              <PreviewTree
                block={c}
                editable={editable}
                selectedId={selectedId}
                onChangeContent={onChangeContent}
                onSelect={onSelect}
                onScrollToSection={onScrollToSection}
              />
            </div>
          );
        })}
      </div>
    );
  }

  if (block.type === "column") {
    return (
      <div
        className={cn("space-y-4", cls)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(block.id, e);
        }}
      >
        {block.children.length === 0 ? <div className="text-sm text-muted-foreground">Empty column</div> : null}
        {block.children.map((c) => (
          <PreviewTree
            key={c.id}
            block={c}
            editable={editable}
            selectedId={selectedId}
            onChangeContent={onChangeContent}
            onSelect={onSelect}
            onScrollToSection={onScrollToSection}
          />
        ))}
      </div>
    );
  }

  if (block.type === "nav") {
    const data = parseJson<{ items: Array<{ label: string; sectionId: string }> }>(block.content, { items: [] });
    return (
      <nav
        className={cn("flex flex-wrap gap-3", cls, isSelected ? "ring-2 ring-blue-500/50 rounded-md p-2" : "")}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(block.id, e);
        }}
      >
        {data.items.length === 0 ? <span className="text-sm text-muted-foreground">No links yet</span> : null}
        {data.items.map((it, idx) => (
          <button
            key={idx}
            type="button"
            className="text-sm underline underline-offset-4 truncate min-w-0 overflow-hidden"
            onClick={(e) => {
              e.stopPropagation();
              if (!it.sectionId) return;
              onScrollToSection(it.sectionId);
            }}
          >
            {it.label || "Link"}
          </button>
        ))}
      </nav>
    );
  }

  if (block.type === "card") {
    const data = parseJson<{ title: string; body: string }>(block.content, { title: "", body: "" });
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-background p-4",
          cls,
          isSelected ? "ring-2 ring-blue-500/50" : "",
        )}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(block.id, e);
        }}
      >
        <div className="font-medium text-foreground">{data.title || "Card"}</div>
        <div className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{data.body || ""}</div>
      </div>
    );
  }

  if (block.type === "image") {
    return (
      <div className={cn("rounded-lg border border-border p-4", cls)}>
        <div className="text-sm text-muted-foreground">Image</div>
        <div className="text-sm text-foreground mt-2">{block.alt ?? block.content ?? "—"}</div>
      </div>
    );
  }

  if (block.type === "cta") {
    return (
      <div className={cn("pt-2", cls)}>
        <Button type="button" className={cn("w-full sm:w-auto", cls)}>
          {block.content || "Call to action"}
        </Button>
      </div>
    );
  }

  if (block.type === "faq") {
    return (
      <div className={cn("rounded-lg border border-border p-4", cls)}>
        <div className="font-medium text-foreground">FAQ</div>
        <div
          className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap"
          contentEditable={canEditText}
          suppressContentEditableWarning
          onFocus={(e) => {
            e.stopPropagation();
            onSelect(block.id, e as any);
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(block.id, e);
          }}
          onBlur={(e) => {
            if (!canEditText) return;
            const next = (e.currentTarget.textContent ?? "").toString();
            onChangeContent(block.id, next);
          }}
        >
          {block.content}
        </div>
      </div>
    );
  }

  if (block.type === "h1") {
    return (
      <h1
        className={cn("text-foreground text-3xl font-bold", cls)}
        contentEditable={canEditText}
        suppressContentEditableWarning
        onFocus={(e) => {
          e.stopPropagation();
          onSelect(block.id, e as any);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(block.id, e);
        }}
        onBlur={(e) => {
          if (!canEditText) return;
          const next = (e.currentTarget.textContent ?? "").toString();
          onChangeContent(block.id, next);
        }}
      >
        {block.content}
      </h1>
    );
  }

  if (block.type === "h2") {
    return (
      <h2
        className={cn("text-foreground text-2xl font-semibold", cls)}
        contentEditable={canEditText}
        suppressContentEditableWarning
        onFocus={(e) => {
          e.stopPropagation();
          onSelect(block.id, e as any);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(block.id, e);
        }}
        onBlur={(e) => {
          if (!canEditText) return;
          const next = (e.currentTarget.textContent ?? "").toString();
          onChangeContent(block.id, next);
        }}
      >
        {block.content}
      </h2>
    );
  }

  if (block.type === "h3") {
    return (
      <h3
        className={cn("text-foreground text-xl font-semibold", cls)}
        contentEditable={canEditText}
        suppressContentEditableWarning
        onFocus={(e) => {
          e.stopPropagation();
          onSelect(block.id, e as any);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(block.id, e);
        }}
        onBlur={(e) => {
          if (!canEditText) return;
          const next = (e.currentTarget.textContent ?? "").toString();
          onChangeContent(block.id, next);
        }}
      >
        {block.content}
      </h3>
    );
  }

  if (block.type === "paragraph") {
    return (
      <p
        className={cn("text-foreground whitespace-pre-wrap", cls)}
        contentEditable={canEditText}
        suppressContentEditableWarning
        onFocus={(e) => {
          e.stopPropagation();
          onSelect(block.id, e as any);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(block.id, e);
        }}
        onBlur={(e) => {
          if (!canEditText) return;
          const next = (e.currentTarget.textContent ?? "").toString();
          onChangeContent(block.id, next);
        }}
      >
        {block.content}
      </p>
    );
  }

  return <div className="text-sm text-muted-foreground">Unsupported block</div>;
}

function DeviceFrame({ preset, children }: { preset: DevicePreset; children: ReactNode }) {
  if (preset === "desktop") {
    return (
      <div className="w-full min-w-0">
        <div className="rounded-xl border border-border bg-muted/20 shadow-sm">
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border bg-background rounded-t-xl">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
            <div className="ml-3 text-xs text-muted-foreground truncate">Preview</div>
          </div>
          <div className="p-4 pb-0 bg-background rounded-b-xl">
            {children}
          </div>
        </div>
      </div>
    );
  }

  if (preset === "tablet") {
    return (
      <div className="w-full min-w-0 max-w-[820px]">
        <div className="rounded-[2rem] bg-[#111] p-3 shadow-lg">
          <div className="rounded-[1.6rem] bg-background overflow-hidden">
            <div className="p-5 pb-0">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-[410px]">
      <div className="rounded-[2.2rem] bg-[#111] p-3 shadow-lg">
        <div className="relative rounded-[1.8rem] bg-background overflow-hidden">
          <div className="absolute left-1/2 top-2 h-5 w-32 -translate-x-1/2 rounded-full bg-[#111]" />
          <div className="pt-10 px-4 pb-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

interface BlockEditorProps {
  block: Block;
  onUpdate: (content: string) => void;
  onUpdateById: (id: string, content: string) => void;
  onUpdateClassName: (className: string) => void;
  onUpdateResponsiveClassName: (patch: Partial<{ mobile: string; tablet: string; desktop: string }>) => void;
  copiedResponsiveStyle: { mobile?: string; tablet?: string; desktop?: string } | null;
  setCopiedResponsiveStyle: React.Dispatch<React.SetStateAction<{ mobile?: string; tablet?: string; desktop?: string } | null>>;
  onUpdateSectionMeta: (patch: Partial<Pick<SectionBlock, "title" | "backgroundUrl" | "overlayClassName">>) => void;
  onAddChild: (type: BlockType) => void;
  onAddRowPreset: (preset: Array<ColumnWidth>) => void;
  onAddModuleToColumn: (columnId: string, type: BlockType) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropOn: (targetId: string) => void;
  selected: boolean;
  onToggleSelected: () => void;
  sectionOptions?: Array<{ id: string; label: string; anchor: string }>;
  onScrollToSection?: (sectionId: string) => void;
}

function BlockEditor({
  block,
  onUpdate,
  onUpdateById,
  onUpdateClassName,
  onUpdateResponsiveClassName,
  copiedResponsiveStyle,
  setCopiedResponsiveStyle,
  onUpdateSectionMeta,
  onAddChild,
  onAddRowPreset,
  onAddModuleToColumn,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
  onDropOn,
  selected,
  onToggleSelected,
  sectionOptions,
  onScrollToSection,
}: BlockEditorProps) {
  const blockInfo = blockTypes.find((b) => b.type === block.type);

  const [stylesOpen, setStylesOpen] = useState(false);
  const [styleTab, setStyleTab] = useState<DevicePreset>("mobile");

  const [draftMobile, setDraftMobile] = useState(block.responsiveClassName?.mobile ?? block.className ?? "");
  const [draftTablet, setDraftTablet] = useState(block.responsiveClassName?.tablet ?? "");
  const [draftDesktop, setDraftDesktop] = useState(block.responsiveClassName?.desktop ?? "");

  useEffect(() => {
    setDraftMobile(block.responsiveClassName?.mobile ?? block.className ?? "");
    setDraftTablet(block.responsiveClassName?.tablet ?? "");
    setDraftDesktop(block.responsiveClassName?.desktop ?? "");
  }, [block.className, block.responsiveClassName?.desktop, block.responsiveClassName?.mobile, block.responsiveClassName?.tablet]);

  const disabled = !selected;

  const sectionEditableItems = useMemo(() => {
    if (block.type !== "section") return [] as Array<{ id: string; kind: "short" | "long"; label: string; value: string }>;

    const items: Array<{ id: string; kind: "short" | "long"; label: string; value: string }> = [];
    const walk = (arr: Block[]) => {
      for (const b of arr) {
        if (isContentBlock(b)) {
          const label =
            b.type === "h1"
              ? "H1"
              : b.type === "h2"
                ? "H2"
                : b.type === "h3"
                  ? "H3"
                  : b.type === "paragraph"
                    ? "Paragraph"
                    : b.type === "faq"
                      ? "FAQ"
                      : b.type === "cta"
                        ? "Button"
                        : b.type === "image"
                          ? "Image alt"
                          : b.type === "nav"
                            ? "Nav"
                            : b.type === "card"
                              ? "Card"
                              : b.type;

          const value = (b.content ?? "").toString();
          const kind: "short" | "long" = b.type === "paragraph" || b.type === "faq" ? "long" : "short";
          if (b.type !== "nav" && b.type !== "card") {
            items.push({ id: b.id, kind, label, value });
          }
        }

        if (b.type === "section") walk(b.children);
        else if (b.type === "row") {
          for (const c of b.columns) walk([c]);
        } else if (b.type === "column") walk(b.children);
      }
    };

    walk(block.children);
    return items;
  }, [block]);

  const spacingPreset = (cls: string) => {
    if (disabled) return;
    const base = (block.className ?? "").trim();
    const next = base ? `${base} ${cls}` : cls;
    onUpdateClassName(next);
    onUpdateResponsiveClassName({ mobile: next });
  };

  return (
    <div className={cn("space-y-3", selected ? "" : "opacity-90")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded", blockInfo?.color)}>{blockInfo && <blockInfo.icon className="w-4 h-4" />}</div>
          <div className="text-sm font-medium text-foreground">{block.type === "section" ? "Section" : block.type === "row" ? "Row" : block.type === "column" ? "Column" : (blockInfo?.label ?? block.type)}</div>
        </div>
        <Button variant="ghost" size="icon" onClick={onRemove} disabled={disabled} className="text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <Accordion type="multiple" defaultValue={["content", "spacing"]}>
        <AccordionItem value="content">
          <AccordionTrigger className="py-2 text-sm">Content</AccordionTrigger>
          <AccordionContent className="space-y-3">
            {block.type === "section" ? (
              <div className="space-y-3">
                <Input
                  value={(block.title ?? "").trim()}
                  onChange={(e) => onUpdateSectionMeta({ title: e.target.value })}
                  placeholder="Section title"
                  disabled={disabled}
                />
                {sectionEditableItems.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Section contents</div>
                    <div className="space-y-2">
                      {sectionEditableItems.map((it) =>
                        it.kind === "long" ? (
                          <div key={it.id} className="space-y-1">
                            <div className="text-[11px] text-muted-foreground">{it.label}</div>
                            <Textarea
                              value={it.value}
                              disabled={disabled}
                              onChange={(e) => onUpdateById(it.id, e.target.value)}
                              className="resize-none"
                              rows={3}
                            />
                          </div>
                        ) : (
                          <div key={it.id} className="space-y-1">
                            <div className="text-[11px] text-muted-foreground">{it.label}</div>
                            <Input
                              value={it.value}
                              disabled={disabled}
                              onChange={(e) => onUpdateById(it.id, e.target.value)}
                            />
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">No editable content inside this section yet.</div>
                )}
              </div>
            ) : block.type === "nav" ? (
              <div className="text-xs text-muted-foreground">Edit links in Advanced.</div>
            ) : block.type === "card" ? (
              <div className="text-xs text-muted-foreground">Edit card content in Advanced.</div>
            ) : block.type === "row" || block.type === "column" ? (
              <div className="text-xs text-muted-foreground">Layout block</div>
            ) : block.type === "image" ? (
              <Input
                placeholder="Alt text"
                value={isContentBlock(block) ? block.content : ""}
                onChange={(e) => onUpdate(e.target.value)}
                disabled={disabled}
              />
            ) : block.type === "paragraph" || block.type === "faq" ? (
              <Textarea
                value={isContentBlock(block) ? block.content : ""}
                onChange={(e) => onUpdate(e.target.value)}
                className="resize-none"
                rows={3}
                disabled={disabled}
              />
            ) : (
              <Input
                value={isContentBlock(block) ? block.content : ""}
                onChange={(e) => onUpdate(e.target.value)}
                disabled={disabled}
              />
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="spacing">
          <AccordionTrigger className="py-2 text-sm">Spacing</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => spacingPreset("p-4")} disabled={disabled}>
                Padding
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => spacingPreset("py-8")} disabled={disabled}>
                Section
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => spacingPreset("space-y-4")} disabled={disabled}>
                Stack
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => spacingPreset("mx-auto max-w-5xl")} disabled={disabled}>
                Center
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="advanced">
          <AccordionTrigger className="py-2 text-sm">Advanced</AccordionTrigger>
          <AccordionContent className="space-y-3">
            {block.type === "section" ? (
              <div className="space-y-2">
                <Input
                  value={(block.backgroundUrl ?? "").trim()}
                  onChange={(e) => onUpdateSectionMeta({ backgroundUrl: e.target.value })}
                  placeholder="Background image URL"
                  disabled={disabled}
                />
                <Input
                  value={(block.overlayClassName ?? "").trim()}
                  onChange={(e) => onUpdateSectionMeta({ overlayClassName: e.target.value })}
                  placeholder="Overlay classes"
                  disabled={disabled}
                />
              </div>
            ) : null}

            {block.type === "nav" ? (
              <div className="space-y-2">
                {(() => {
                  const data = parseJson<{ items: Array<{ label: string; sectionId: string }> }>(block.content, { items: [] });
                  const updateItems = (items: Array<{ label: string; sectionId: string }>) => {
                    onUpdate(JSON.stringify({ items }));
                  };
                  const items = data.items ?? [];
                  return (
                    <div className="space-y-2">
                      {items.map((it, idx) => (
                        <div key={idx} className="rounded-md border border-border p-2 space-y-2">
                          <Input
                            value={it.label}
                            disabled={disabled}
                            onChange={(e) => {
                              const next = [...items];
                              next[idx] = { ...next[idx], label: e.target.value };
                              updateItems(next);
                            }}
                            placeholder="Label"
                          />
                          <select
                            className={cn(
                              "h-9 w-full rounded-md border border-border bg-background px-3 text-sm",
                              disabled ? "opacity-60" : "",
                            )}
                            disabled={disabled}
                            value={it.sectionId}
                            onChange={(e) => {
                              const next = [...items];
                              next[idx] = { ...next[idx], sectionId: e.target.value };
                              updateItems(next);
                            }}
                          >
                            <option value="">Select section…</option>
                            {(sectionOptions ?? []).map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={disabled}
                            onClick={() => {
                              const next = items.filter((_, i) => i !== idx);
                              updateItems(next);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={disabled}
                        onClick={() => updateItems([...(items ?? []), { label: "New link", sectionId: "" }])}
                      >
                        Add link
                      </Button>
                    </div>
                  );
                })()}
              </div>
            ) : null}

            {block.type === "card" ? (
              <div className="space-y-2">
                {(() => {
                  const data = parseJson<{ title: string; body: string }>(block.content, { title: "", body: "" });
                  const title = data.title ?? "";
                  const body = data.body ?? "";
                  return (
                    <>
                      <Input
                        value={title}
                        disabled={disabled}
                        onChange={(e) => onUpdate(JSON.stringify({ title: e.target.value, body }))}
                        placeholder="Title"
                      />
                      <Textarea
                        value={body}
                        disabled={disabled}
                        onChange={(e) => onUpdate(JSON.stringify({ title, body: e.target.value }))}
                        className="resize-none"
                        rows={3}
                        placeholder="Text"
                      />
                    </>
                  );
                })()}
              </div>
            ) : null}

            <Button type="button" size="sm" variant="outline" onClick={() => setStylesOpen(true)} disabled={disabled}>
              Tailwind classes
            </Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Dialog open={stylesOpen} onOpenChange={setStylesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Styles</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">Divi-style responsive styling: set classes per device.</div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button type="button" size="sm" variant={styleTab === "mobile" ? "default" : "outline"} onClick={() => setStyleTab("mobile")}>
                Mobile
              </Button>
              <Button type="button" size="sm" variant={styleTab === "tablet" ? "default" : "outline"} onClick={() => setStyleTab("tablet")}>
                Tablet
              </Button>
              <Button type="button" size="sm" variant={styleTab === "desktop" ? "default" : "outline"} onClick={() => setStyleTab("desktop")}>
                Desktop
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setCopiedResponsiveStyle({ mobile: draftMobile, tablet: draftTablet, desktop: draftDesktop });
                }}
              >
                Copy styles
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!copiedResponsiveStyle}
                onClick={() => {
                  if (!copiedResponsiveStyle) return;
                  setDraftMobile(copiedResponsiveStyle.mobile ?? "");
                  setDraftTablet(copiedResponsiveStyle.tablet ?? "");
                  setDraftDesktop(copiedResponsiveStyle.desktop ?? "");
                }}
              >
                Paste styles
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Tailwind classes</div>
              <Input
                value={styleTab === "mobile" ? draftMobile : styleTab === "tablet" ? draftTablet : draftDesktop}
                onChange={(e) => {
                  const v = e.target.value;
                  if (styleTab === "mobile") setDraftMobile(v);
                  else if (styleTab === "tablet") setDraftTablet(v);
                  else setDraftDesktop(v);
                }}
                placeholder="e.g. text-center p-4 bg-muted sm:p-6"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (styleTab === "mobile") setDraftMobile((v) => (v ? `${v} text-left` : "text-left"));
                  else if (styleTab === "tablet") setDraftTablet((v) => (v ? `${v} text-left` : "text-left"));
                  else setDraftDesktop((v) => (v ? `${v} text-left` : "text-left"));
                }}
              >
                Text left
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (styleTab === "mobile") setDraftMobile((v) => (v ? `${v} text-center` : "text-center"));
                  else if (styleTab === "tablet") setDraftTablet((v) => (v ? `${v} text-center` : "text-center"));
                  else setDraftDesktop((v) => (v ? `${v} text-center` : "text-center"));
                }}
              >
                Text center
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (styleTab === "mobile") setDraftMobile((v) => (v ? `${v} p-4` : "p-4"));
                  else if (styleTab === "tablet") setDraftTablet((v) => (v ? `${v} p-6` : "p-6"));
                  else setDraftDesktop((v) => (v ? `${v} p-10` : "p-10"));
                }}
              >
                Padding
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (styleTab === "mobile") setDraftMobile((v) => (v ? `${v} rounded-lg border` : "rounded-lg border"));
                  else if (styleTab === "tablet") setDraftTablet((v) => (v ? `${v} rounded-lg border` : "rounded-lg border"));
                  else setDraftDesktop((v) => (v ? `${v} rounded-lg border` : "rounded-lg border"));
                }}
              >
                Card
              </Button>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDraftMobile(block.responsiveClassName?.mobile ?? block.className ?? "");
                  setDraftTablet(block.responsiveClassName?.tablet ?? "");
                  setDraftDesktop(block.responsiveClassName?.desktop ?? "");
                  setStylesOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  onUpdateResponsiveClassName({ mobile: draftMobile, tablet: draftTablet, desktop: draftDesktop });
                  onUpdateClassName(draftMobile);
                  setStylesOpen(false);
                }}
              >
                Apply styles
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
