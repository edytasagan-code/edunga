import { Text, View } from "@react-pdf/renderer";

import type { TrueFalseTableNode } from "@/app/components/editor/types";
import { EditorDocumentRenderer } from "@/app/lib/document-renderer";

import type { PdfMathRenderCache } from "./buildPdfMathRenderCache";
import { PdfReadOnlyMath } from "./PdfReadOnlyMath";
import {
  paragraphHasMath,
  pdfParagraphText,
  PdfReadOnlyParagraph,
} from "./PdfReadOnlyParagraph";
import { PDF_FONT_SIZE, PDF_LINE_HEIGHT } from "./pdfTypography";
import { PDF_BODY_FONT } from "./registerPdfBodyFont";

type Props = {
  node: TrueFalseTableNode;
  mathCache: PdfMathRenderCache;
  contentScale?: number;
};

function PdfCheckboxCell({ contentScale = 1 }: { contentScale?: number }) {
  const size = 10 * contentScale;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderWidth: 1,
        borderColor: "#71717a",
        alignSelf: "center",
      }}
    />
  );
}

function PdfStatementCell({
  row,
  mathCache,
  contentScale = 1,
}: {
  row: TrueFalseTableNode["rows"][number];
  mathCache: PdfMathRenderCache;
  contentScale?: number;
}) {
  const textStyle = {
    fontFamily: PDF_BODY_FONT,
    fontSize: PDF_FONT_SIZE * contentScale,
    lineHeight: PDF_LINE_HEIGHT,
  };
  const paragraph = {
    id: row.id,
    children: row.statement,
  };

  if (!paragraphHasMath(paragraph)) {
    const prefix = row.label ? `${row.label}. ` : "";

    return (
      <Text style={textStyle}>
        {prefix}
        {pdfParagraphText(paragraph)}
      </Text>
    );
  }

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {row.label ? (
        <Text style={textStyle}>{`${row.label}. `}</Text>
      ) : null}
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
    </View>
  );
}

export function TrueFalseTablePdf({
  node,
  mathCache,
  contentScale = 1,
}: Props) {
  const textStyle = {
    fontFamily: PDF_BODY_FONT,
    fontSize: PDF_FONT_SIZE * contentScale,
    lineHeight: PDF_LINE_HEIGHT,
  };
  const borderColor = "#d4d4d8";
  const cellPadding = 4 * contentScale;

  return (
    <View style={{ marginVertical: 6 * contentScale }}>
      <View
        style={{
          flexDirection: "row",
          borderWidth: 1,
          borderColor,
          backgroundColor: "#f4f4f5",
        }}
      >
        <View
          style={{
            flex: 1,
            borderRightWidth: 1,
            borderColor,
            padding: cellPadding,
          }}
        >
          <Text style={{ ...textStyle, fontWeight: 700 }}>Stwierdzenie</Text>
        </View>
        <View
          style={{
            width: 28 * contentScale,
            borderRightWidth: 1,
            borderColor,
            padding: cellPadding,
            alignItems: "center",
          }}
        >
          <Text style={{ ...textStyle, fontWeight: 700 }}>P</Text>
        </View>
        <View
          style={{
            width: 28 * contentScale,
            padding: cellPadding,
            alignItems: "center",
          }}
        >
          <Text style={{ ...textStyle, fontWeight: 700 }}>F</Text>
        </View>
      </View>

      {node.rows.map((row) => (
        <View
          key={row.id}
          style={{
            flexDirection: "row",
            borderWidth: 1,
            borderTopWidth: 0,
            borderColor,
          }}
        >
          <View
            style={{
              flex: 1,
              borderRightWidth: 1,
              borderColor,
              padding: cellPadding,
            }}
          >
            <PdfStatementCell
              row={row}
              mathCache={mathCache}
              contentScale={contentScale}
            />
          </View>
          <View
            style={{
              width: 28 * contentScale,
              borderRightWidth: 1,
              borderColor,
              padding: cellPadding,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <PdfCheckboxCell contentScale={contentScale} />
          </View>
          <View
            style={{
              width: 28 * contentScale,
              padding: cellPadding,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <PdfCheckboxCell contentScale={contentScale} />
          </View>
        </View>
      ))}
    </View>
  );
}
