import { extractParagraphSubtaskLabel } from "@/app/lib/subtaskSelection";

import type { EditorDocument, Paragraph } from "./types";

export type DocumentOutlineItem = {
  id: string;
  index: number;
  preview: string;
  subtaskLabel: string | null;
};

function paragraphPreview(paragraph: Paragraph, maxLength = 56): string {
  const parts: string[] = [];

  for (const node of paragraph.children) {
    if (node.type === "text" && node.text.trim()) {
      parts.push(node.text.trim());
    }

    if (node.type === "math" && node.latex.trim()) {
      parts.push(`$${node.latex.trim()}$`);
    }

    if (node.type === "image") {
      parts.push("[obraz]");
    }

    if (node.type === "table") {
      parts.push("[tabela]");
    }

    if (node.type === "true-false-table") {
      parts.push("[P/F]");
    }

    if (node.type === "matching-table") {
      parts.push("[dopasuj]");
    }
  }

  const joined = parts.join(" ").replace(/\s+/g, " ").trim();

  if (!joined) {
    return "(pusty akapit)";
  }

  if (joined.length <= maxLength) {
    return joined;
  }

  return `${joined.slice(0, maxLength - 1)}…`;
}

export function buildDocumentOutline(
  document: EditorDocument
): DocumentOutlineItem[] {
  return document.paragraphs.map((paragraph, index) => ({
    id: paragraph.id,
    index,
    preview: paragraphPreview(paragraph),
    subtaskLabel: extractParagraphSubtaskLabel(paragraph),
  }));
}

export function buildSectionGroups(document: EditorDocument): Array<{
  id: string;
  title: string;
  paragraphIds: string[];
}> {
  const groups: Array<{
    id: string;
    title: string;
    paragraphIds: string[];
  }> = [];

  let current: {
    id: string;
    title: string;
    paragraphIds: string[];
  } | null = null;

  for (const paragraph of document.paragraphs) {
    const subtaskLabel = extractParagraphSubtaskLabel(paragraph);

    if (subtaskLabel && current && current.paragraphIds.length > 0) {
      groups.push(current);
      current = {
        id: `section-${subtaskLabel}`,
        title: `${subtaskLabel.toUpperCase()})`,
        paragraphIds: [paragraph.id],
      };
      continue;
    }

    if (!current) {
      current = {
        id: subtaskLabel ? `section-${subtaskLabel}` : "section-intro",
        title: subtaskLabel
          ? `${subtaskLabel.toUpperCase()})`
          : "Wstęp",
        paragraphIds: [paragraph.id],
      };
      continue;
    }

    current.paragraphIds.push(paragraph.id);

    if (subtaskLabel && current.id === "section-intro") {
      current.id = `section-${subtaskLabel}`;
      current.title = `${subtaskLabel.toUpperCase()})`;
    }
  }

  if (current && current.paragraphIds.length > 0) {
    groups.push(current);
  }

  return groups;
}
