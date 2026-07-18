import { StyleSheet, Text, View } from "@react-pdf/renderer";

import type { ReactNode } from "react";

import type { Paragraph } from "@/app/components/editor/types";
import { paragraphHasVisibleContent } from "@/app/lib/document-renderer";

import {
  PDF_FONT_SIZE,
  PDF_LINE_HEIGHT,
  PDF_PARAGRAPH_GAP,
} from "./pdfTypography";
import { PDF_BODY_FONT } from "./registerPdfBodyFont";

const styles = StyleSheet.create({
  paragraph: {},
  paragraphGap: {
    marginTop: PDF_PARAGRAPH_GAP,
  },
  emptyLine: {
    height: PDF_FONT_SIZE * PDF_LINE_HEIGHT,
  },
});

type Props = {
  paragraph: Paragraph;
  isFirst: boolean;
  children: ReactNode;
  contentScale?: number;
};

export function PdfReadOnlyParagraph({
  paragraph,
  isFirst,
  children,
  contentScale = 1,
}: Props) {
  if (!paragraphHasVisibleContent(paragraph.children)) {
    return (
      <View
        style={{
          height: PDF_FONT_SIZE * PDF_LINE_HEIGHT * contentScale,
        }}
      />
    );
  }

  return (
    <View
      style={
        isFirst
          ? styles.paragraph
          : [styles.paragraph, { marginTop: PDF_PARAGRAPH_GAP * contentScale }]
      }
    >
      <Text
        style={{
          fontFamily: PDF_BODY_FONT,
          fontSize: PDF_FONT_SIZE * contentScale,
          lineHeight: PDF_LINE_HEIGHT,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

export const pdfTextStyle = StyleSheet.create({
  text: {
    fontFamily: PDF_BODY_FONT,
    fontSize: PDF_FONT_SIZE,
    lineHeight: PDF_LINE_HEIGHT,
  },
  missing: {
    fontFamily: PDF_BODY_FONT,
    fontSize: 10,
    lineHeight: PDF_LINE_HEIGHT,
    color: "#71717a",
  },
});

export function pdfParagraphText(paragraph: Paragraph): string {
  return paragraph.children
    .filter((node) => node.type === "text")
    .map((node) => node.text)
    .join("");
}

export function paragraphHasMath(paragraph: Paragraph): boolean {
  return paragraph.children.some((node) => node.type === "math");
}

export function paragraphHasImage(paragraph: Paragraph): boolean {
  return paragraph.children.some((node) => node.type === "image");
}

export function paragraphHasInk(paragraph: Paragraph): boolean {
  return paragraph.children.some((node) => node.type === "ink");
}
