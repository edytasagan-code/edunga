import { Text, View } from "@react-pdf/renderer";

import type { Paragraph } from "@/app/components/editor/types";
import { EditorDocumentRenderer } from "@/app/lib/document-renderer";
import {
  getParagraphSubtaskLabel,
  partitionSubtasksIntoColumns,
  resolveSubtaskBlockMarginTopPt,
  splitDocumentForSubtaskGrid,
  SUBTASK_GRID_WORKSPACE_HEIGHT_PT,
  type SubtaskGridOffsets,
} from "@/app/lib/subtaskGridLayout";

import type { PdfMathRenderCache } from "./buildPdfMathRenderCache";
import { DocumentRendererPdf } from "./DocumentRendererPdf";
import { PdfReadOnlyMath } from "./PdfReadOnlyMath";
import { PdfReadOnlyImage } from "./PdfReadOnlyImage";
import { PdfReadOnlyInk } from "./PdfReadOnlyInk";
import {
  paragraphHasMath,
  paragraphHasImage,
  paragraphHasInk,
  pdfParagraphText,
  PdfReadOnlyParagraph,
} from "./PdfReadOnlyParagraph";
import { PDF_FONT_SIZE, PDF_LINE_HEIGHT, PDF_PARAGRAPH_GAP } from "./pdfTypography";
import { PDF_BODY_FONT } from "./registerPdfBodyFont";

type Props = {
  value: unknown;
  mathCache: PdfMathRenderCache;
  contentScale?: number;
  subtaskGridOffsets?: SubtaskGridOffsets;
};

function PdfSubtaskGridParagraph({
  paragraph,
  mathCache,
  contentScale,
}: {
  paragraph: Paragraph;
  mathCache: PdfMathRenderCache;
  contentScale: number;
}) {
  const textStyle = {
    fontFamily: PDF_BODY_FONT,
    fontSize: PDF_FONT_SIZE * contentScale,
    lineHeight: PDF_LINE_HEIGHT,
  };

  if (
    !paragraphHasMath(paragraph) &&
    !paragraphHasImage(paragraph) &&
    !paragraphHasInk(paragraph)
  ) {
    return <Text style={textStyle}>{pdfParagraphText(paragraph)}</Text>;
  }

  return (
    <EditorDocumentRenderer
      document={{ version: 1, paragraphs: [paragraph] }}
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
      renderParagraph={({ paragraph: current, isFirst, children }) => (
        <PdfReadOnlyParagraph
          key={current.id}
          paragraph={current}
          isFirst={isFirst}
          contentScale={contentScale}
        >
          {children}
        </PdfReadOnlyParagraph>
      )}
    />
  );
}

function PdfSubtaskGridBlock({
  paragraph,
  blockIndexInColumn,
  mathCache,
  contentScale,
  subtaskGridOffsets,
}: {
  paragraph: Paragraph;
  blockIndexInColumn: number;
  mathCache: PdfMathRenderCache;
  contentScale: number;
  subtaskGridOffsets?: SubtaskGridOffsets;
}) {
  const label = getParagraphSubtaskLabel(paragraph);
  const workspaceHeight = SUBTASK_GRID_WORKSPACE_HEIGHT_PT * contentScale;

  if (!label) {
    return null;
  }

  const marginTop = resolveSubtaskBlockMarginTopPt(
    blockIndexInColumn,
    label,
    subtaskGridOffsets,
    contentScale
  );

  return (
    <View style={{ marginTop }}>
      <PdfSubtaskGridParagraph
        paragraph={paragraph}
        mathCache={mathCache}
        contentScale={contentScale}
      />
      <View style={{ height: workspaceHeight, marginTop: 4 * contentScale }} />
    </View>
  );
}

function PdfSubtaskGridColumn({
  paragraphs,
  mathCache,
  contentScale,
  subtaskGridOffsets,
  showDivider,
  columnPadding,
}: {
  paragraphs: Paragraph[];
  mathCache: PdfMathRenderCache;
  contentScale: number;
  subtaskGridOffsets?: SubtaskGridOffsets;
  showDivider: boolean;
  columnPadding: number;
}) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        paddingRight: showDivider ? columnPadding : 0,
        paddingLeft: showDivider ? 0 : columnPadding,
        borderRightWidth: showDivider ? 1 : 0,
        borderRightColor: "#d4d4d8",
      }}
    >
      {paragraphs.map((paragraph, index) => (
        <PdfSubtaskGridBlock
          key={paragraph.id}
          paragraph={paragraph}
          blockIndexInColumn={index}
          mathCache={mathCache}
          contentScale={contentScale}
          subtaskGridOffsets={subtaskGridOffsets}
        />
      ))}
    </View>
  );
}

export function SubtaskGridDocumentRendererPdf({
  value,
  mathCache,
  contentScale = 1,
  subtaskGridOffsets,
}: Props) {
  const split = splitDocumentForSubtaskGrid(value);

  if (!split) {
    return (
      <DocumentRendererPdf
        value={value}
        mathCache={mathCache}
        contentScale={contentScale}
      />
    );
  }

  const { left, right } = partitionSubtasksIntoColumns(split.subtasks);
  const columnPadding = 10 * contentScale;

  return (
    <View>
      {split.instruction.paragraphs.length > 0 ? (
        <View style={{ marginBottom: PDF_PARAGRAPH_GAP * contentScale * 0.75 }}>
          <DocumentRendererPdf
            value={split.instruction}
            mathCache={mathCache}
            contentScale={contentScale}
          />
        </View>
      ) : null}

      <View style={{ flexDirection: "row" }}>
        <PdfSubtaskGridColumn
          paragraphs={left}
          mathCache={mathCache}
          contentScale={contentScale}
          subtaskGridOffsets={subtaskGridOffsets}
          showDivider={right.length > 0}
          columnPadding={columnPadding}
        />
        <PdfSubtaskGridColumn
          paragraphs={right}
          mathCache={mathCache}
          contentScale={contentScale}
          subtaskGridOffsets={subtaskGridOffsets}
          showDivider={false}
          columnPadding={columnPadding}
        />
      </View>
    </View>
  );
}
