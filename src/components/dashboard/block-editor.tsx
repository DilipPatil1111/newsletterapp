"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GripVertical,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Type,
  AlignLeft,
  LayoutList,
  Image,
  MousePointerClick,
  Minus,
} from "lucide-react";
import type { ContentBlock } from "@/lib/email-renderer";
import type { SectionStyle } from "@/emails/components/section-block";

interface BlockEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
}

const BLOCK_TYPES = [
  { type: "heading", label: "Heading", icon: Type },
  { type: "paragraph", label: "Paragraph", icon: AlignLeft },
  { type: "section", label: "Section", icon: LayoutList },
  { type: "image", label: "Image", icon: Image },
  { type: "cta", label: "CTA Button", icon: MousePointerClick },
  { type: "divider", label: "Divider", icon: Minus },
] as const;

const SECTION_STYLES: { value: SectionStyle; label: string }[] = [
  { value: "info", label: "Info (Blue)" },
  { value: "success", label: "Success (Green)" },
  { value: "warning", label: "Warning (Amber)" },
  { value: "purple", label: "Purple" },
  { value: "default", label: "Default" },
];

export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  function addBlock(type: ContentBlock["type"]) {
    const newBlock: ContentBlock = (() => {
      switch (type) {
        case "heading":
          return { type: "heading", text: "New heading" };
        case "paragraph":
          return { type: "paragraph", text: "Enter your text here..." };
        case "section":
          return { type: "section", title: "Section Title", body: "Section content here...", style: "info" as SectionStyle };
        case "image":
          return { type: "image", src: "", alt: "Image description" };
        case "cta":
          return { type: "cta", text: "Learn More", url: "https://" };
        case "divider":
          return { type: "divider" };
        default:
          return { type: "paragraph", text: "" };
      }
    })();
    onChange([...blocks, newBlock]);
    setAddMenuOpen(false);
  }

  function updateBlock(index: number, updates: Partial<ContentBlock>) {
    const updated = blocks.map((block, i) =>
      i === index ? { ...block, ...updates } : block
    );
    onChange(updated);
  }

  function removeBlock(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function moveBlock(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    const updated = [...blocks];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  }

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => (
        <div
          key={index}
          className="group flex gap-2 rounded-lg border bg-background p-3 transition-colors hover:border-primary/30"
        >
          {/* Drag handle + reorder */}
          <div className="flex flex-col items-center gap-0.5 pt-1">
            <GripVertical className="h-4 w-4 text-muted-foreground/50" />
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => moveBlock(index, "up")}
              disabled={index === 0}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => moveBlock(index, "down")}
              disabled={index === blocks.length - 1}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>

          {/* Block content */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-muted-foreground">
                {BLOCK_TYPES.find((bt) => bt.type === block.type)?.label || block.type}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeBlock(index)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>

            {block.type === "heading" && (
              <Input
                value={block.text || ""}
                onChange={(e) => updateBlock(index, { text: e.target.value })}
                className="font-semibold"
                placeholder="Heading text..."
              />
            )}

            {block.type === "paragraph" && (
              <Textarea
                value={block.text || ""}
                onChange={(e) => updateBlock(index, { text: e.target.value })}
                rows={3}
                placeholder="Paragraph text..."
              />
            )}

            {block.type === "section" && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={block.title || ""}
                    onChange={(e) => updateBlock(index, { title: e.target.value })}
                    placeholder="Section title..."
                    className="flex-1 font-medium"
                  />
                  <Select
                    value={block.style || "default"}
                    onValueChange={(v) => updateBlock(index, { style: v as SectionStyle })}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTION_STYLES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  value={block.body || ""}
                  onChange={(e) => updateBlock(index, { body: e.target.value })}
                  rows={3}
                  placeholder="Section content (one point per line)..."
                />
              </div>
            )}

            {block.type === "image" && (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={block.src || ""}
                  onChange={(e) => updateBlock(index, { src: e.target.value })}
                  placeholder="Image URL..."
                />
                <Input
                  value={block.alt || ""}
                  onChange={(e) => updateBlock(index, { alt: e.target.value })}
                  placeholder="Alt text..."
                />
              </div>
            )}

            {block.type === "cta" && (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={block.text || ""}
                  onChange={(e) => updateBlock(index, { text: e.target.value })}
                  placeholder="Button text..."
                />
                <Input
                  value={block.url || ""}
                  onChange={(e) => updateBlock(index, { url: e.target.value })}
                  placeholder="Button URL..."
                  type="url"
                />
              </div>
            )}

            {block.type === "divider" && (
              <hr className="border-dashed" />
            )}
          </div>
        </div>
      ))}

      {/* Add Block */}
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddMenuOpen(!addMenuOpen)}
          className="w-full gap-1.5 border-dashed"
        >
          <Plus className="h-3.5 w-3.5" /> Add Block
        </Button>
        {addMenuOpen && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 grid grid-cols-3 gap-1 rounded-lg border bg-popover p-2 shadow-md">
            {BLOCK_TYPES.map((bt) => (
              <button
                key={bt.type}
                onClick={() => addBlock(bt.type)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <bt.icon className="h-4 w-4 text-muted-foreground" />
                {bt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
