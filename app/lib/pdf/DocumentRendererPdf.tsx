import { Text, View } from "@react-pdf/renderer";

import { parseEditorDocument } from "@/app/components/editor/parseEditorDocument";
import { EditorDocumentRenderer } from "@/app/lib/document-renderer";

import type { PdfMathRenderCache } from "./buildPdfMathRenderCache";
import { PdfReadOnlyMath } from "./PdfReadOnlyMath";
import { PdfReadOnlyImage } from "./PdfReadOnlyImage";
import { PdfReadOnlyInk } from "./PdfReadOnlyInk";
import {
  paragraphHasMath,
  paragraphHasImage,
  paragraphHasInk,
  pdfParagraphText,
  pdfTextStyle,
  PdfReadOnlyParagraph,
} from "./PdfReadOnlyParagraph";
import { TrueFalseTablePdf } from "./TrueFalseTablePdf";
import { PDF_FONT_SIZE, PDF_LINE_HEIGHT, PDF_PARAGRAPH_GAP } from "./pdfTypography";
import { PDF_BODY_FONT } from "./registerPdfBodyFont";

type Props = {
  value: unknown;
  mathCache: PdfMathRenderCache;
  contentScale?: number;
};

export function DocumentRendererPdf({
  value,
  mathCache,
  contentScale = 1,
}: Props) {
  const document = parseEditorDocument(value);
  const textStyle = {
    fontFamily: PDF_BODY_FONT,
    fontSize: PDF_FONT_SIZE * contentScale,
    lineHeight: PDF_LINE_HEIGHT,
  };

  if (!document) {
    if (typeof value === "string" && value.trim()) {
      return <Text style={textStyle}>{value}</Text>;
    }

    return (
      <Text style={pdfTextStyle.missing}>
        Nie znaleziono treści zadania.
      </Text>
    );
  }

  return (
    <EditorDocumentRenderer
      document={document}
      renderText={(node) => (
        <Text key={node.id} style={textStyle}>
          {node.text}
        </Text>
      )}
      renderMath={(node) => (
        <PdfReadOnlyMath
          key={node.id}
          node={node}
          cache={mathCache}
          contentScale={contentScale}
        />
      )}
      renderImage={(node) => (
        <PdfReadOnlyImage
          key={node.id}
          node={node}
          contentScale={contentScale}
        />
      )}
      renderInk={(node) => (
        <PdfReadOnlyInk
          key={node.id}
          node={node}
          contentScale={contentScale}
        />
      )}
      renderParagraph={({ paragraph, isFirst, children }) => {
        const tableNode = paragraph.children.find(
          (node) => node.type === "true-false-table"
        );

        if (tableNode?.type === "true-false-table") {
          return (
            <View
              key={paragraph.id}
              style={
                !isFirst
                  ? { marginTop: PDF_PARAGRAPH_GAP * contentScale }
                  : undefined
              }
            >
              <TrueFalseTablePdf
                node={tableNode}
                mathCache={mathCache}
                contentScale={contentScale}
              />
            </View>
          );
        }

        if (
          !paragraphHasMath(paragraph) &&
          !paragraphHasImage(paragraph) &&
          !paragraphHasInk(paragraph)
        ) {
          return (
            <View
              key={paragraph.id}
              style={
                !isFirst
                  ? { marginTop: PDF_PARAGRAPH_GAP * contentScale }
                  : undefined
              }
            >
              <Text style={textStyle}>{pdfParagraphText(paragraph)}</Text>
            </View>
          );
        }

        return (
          <PdfReadOnlyParagraph
            key={paragraph.id}
            paragraph={paragraph}
            isFirst={isFirst}
            contentScale={contentScale}
          >
            {children}
          </PdfReadOnlyParagraph>
        );
      }}
    />
  );
}
