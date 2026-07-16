import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { pxToAnswerAreaPt } from "@/app/lib/answerAreaStyle";
import {
  createGuideGeometry,
  createPdfAnswerAreaPlan,
} from "@/app/lib/answerAreaRenderPlan";
import type { AnswerAreaItemType } from "@/app/lib/documentGenerator";
import {
  DOCUMENT_HEADER_CLASS_LINE_WIDTH_PT,
  DOCUMENT_HEADER_DATE_LINE_WIDTH_PT,
  DOCUMENT_HEADER_GROUP_LINE_WIDTH_PT,
  DOCUMENT_HEADER_TOTAL_POINTS_LINE_WIDTH_PT,
  DOCUMENT_HEADER_TOTAL_POINTS_MARGIN_RIGHT_PT,
  DOCUMENT_INSTRUCTIONS_FONT_SIZE_PT,
  DOCUMENT_INSTRUCTIONS_MARGIN_BOTTOM_PT,
  DOCUMENT_NAME_LINE_COLOR,
  extractDocumentTotalPointsMax,
} from "@/app/lib/documentGenerator";
import { formatTaskNumber } from "@/app/lib/taskNumbering";

import { shouldUseSubtaskGridLayout } from "@/app/lib/subtaskGridLayout";
import { CELL_PADDING_SCALE } from "@/app/lib/printLayout/cellAutoScale";
import { getLayoutBaseScale, type PrintGuideOptions } from "@/app/lib/printLayout";
import { DocumentRendererPdf } from "./DocumentRendererPdf";
import { SubtaskGridDocumentRendererPdf } from "./SubtaskGridDocumentRendererPdf";
import type { PdfMathRenderCache } from "./buildPdfMathRenderCache";
import type { PdfDocumentData, PdfLayoutCell, PdfLayoutPage } from "./types";
import {
  PDF_FONT_SIZE,
  PDF_HEADER_MARGIN_BOTTOM,
  PDF_LINE_HEIGHT,
  PDF_PAGE_PADDING_H,
  PDF_PAGE_PADDING_V,
  PDF_SHEET_TITLE_SIZE,
  PDF_TASK_GAP,
  PDF_TASK_INNER_GAP,
  PDF_TASK_NUMBER_WIDTH,
} from "./pdfTypography";
import { PDF_BODY_FONT } from "./registerPdfBodyFont";

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const PDF_CONTENT_WIDTH_PT = A4_WIDTH_PT - 2 * PDF_PAGE_PADDING_H;
const CROP_MARK_LENGTH_PT = 10;
const CROP_MARK_OFFSET_PT = 4;

const styles = StyleSheet.create({
  page: {
    paddingTop: PDF_PAGE_PADDING_V,
    paddingBottom: PDF_PAGE_PADDING_V,
    paddingHorizontal: PDF_PAGE_PADDING_H,
    fontFamily: PDF_BODY_FONT,
    fontSize: PDF_FONT_SIZE,
    lineHeight: PDF_LINE_HEIGHT,
    color: "#18181b",
  },
  header: {
    marginBottom: PDF_HEADER_MARGIN_BOTTOM,
  },
  title: {
    fontSize: PDF_SHEET_TITLE_SIZE,
    fontWeight: "bold",
    lineHeight: 1.4,
    flexShrink: 0,
    marginRight: 8,
  },
  headerRow1: {
    flexDirection: "row",
    alignItems: "baseline",
    width: "100%",
    marginBottom: 4,
  },
  headerRow1Meta: {
    flexDirection: "row",
    alignItems: "baseline",
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  headerField: {
    flexDirection: "row",
    alignItems: "baseline",
    flexShrink: 0,
  },
  headerFieldLabel: {
    fontSize: PDF_FONT_SIZE,
    lineHeight: PDF_LINE_HEIGHT,
    color: "#3f3f46",
    flexShrink: 0,
  },
  headerFieldLineBox: {
    marginLeft: 4,
    borderBottomWidth: 1,
    borderBottomColor: DOCUMENT_NAME_LINE_COLOR,
    justifyContent: "flex-start",
    overflow: "hidden",
  },
  headerFieldValue: {
    fontSize: PDF_FONT_SIZE,
    lineHeight: PDF_LINE_HEIGHT,
    color: "#3f3f46",
  },
  headerFieldLine: {
    marginLeft: 4,
    borderBottomWidth: 1,
    borderBottomColor: DOCUMENT_NAME_LINE_COLOR,
    fontSize: PDF_FONT_SIZE,
    lineHeight: PDF_LINE_HEIGHT,
    color: "#3f3f46",
    paddingBottom: 1,
  },
  headerDateLine: {
    width: DOCUMENT_HEADER_DATE_LINE_WIDTH_PT,
    minWidth: DOCUMENT_HEADER_DATE_LINE_WIDTH_PT,
  },
  headerClassField: {
    marginLeft: 6,
  },
  headerClassLine: {
    width: DOCUMENT_HEADER_CLASS_LINE_WIDTH_PT,
    minWidth: DOCUMENT_HEADER_CLASS_LINE_WIDTH_PT,
  },
  headerTotalField: {
    flexDirection: "row",
    alignItems: "baseline",
    marginLeft: "auto",
    marginRight: DOCUMENT_HEADER_TOTAL_POINTS_MARGIN_RIGHT_PT,
    flexShrink: 0,
  },
  headerTotalLine: {
    width: DOCUMENT_HEADER_TOTAL_POINTS_LINE_WIDTH_PT,
    minWidth: DOCUMENT_HEADER_TOTAL_POINTS_LINE_WIDTH_PT,
    flexShrink: 0,
    height: 1,
    borderBottomWidth: 1,
    borderBottomColor: DOCUMENT_NAME_LINE_COLOR,
    marginLeft: 6,
    marginRight: 0,
  },
  headerTotalSuffix: {
    flexShrink: 0,
    fontSize: PDF_FONT_SIZE,
    lineHeight: PDF_LINE_HEIGHT,
    color: "#3f3f46",
  },
  headerRow2: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "nowrap",
    width: "100%",
  },
  headerRow2GroupOnly: {
    justifyContent: "flex-end",
  },
  headerNameField: {
    flexDirection: "row",
    alignItems: "baseline",
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    marginRight: 8,
  },
  headerNameLine: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 36,
    height: 1,
    borderBottomWidth: 1,
    borderBottomColor: DOCUMENT_NAME_LINE_COLOR,
    marginLeft: 4,
  },
  headerGroupField: {
    flexDirection: "row",
    alignItems: "baseline",
    flexShrink: 0,
  },
  headerGroupLine: {
    width: DOCUMENT_HEADER_GROUP_LINE_WIDTH_PT,
    minWidth: DOCUMENT_HEADER_GROUP_LINE_WIDTH_PT,
  },
  studentInstructions: {
    marginBottom: DOCUMENT_INSTRUCTIONS_MARGIN_BOTTOM_PT,
    fontSize: DOCUMENT_INSTRUCTIONS_FONT_SIZE_PT,
    lineHeight: PDF_LINE_HEIGHT,
    color: "#18181b",
    fontStyle: "italic",
  },
  task: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "nowrap",
  },
  taskGap: {
    marginTop: PDF_TASK_GAP * 0.65,
  },
  taskNumber: {
    width: PDF_TASK_NUMBER_WIDTH,
    marginRight: PDF_TASK_INNER_GAP,
    fontFamily: PDF_BODY_FONT,
    fontSize: PDF_FONT_SIZE,
    fontWeight: 500,
    lineHeight: PDF_LINE_HEIGHT,
  },
  taskBody: {
    flex: 1,
    minWidth: 0,
  },
  answerAreaBlock: {
    marginTop: PDF_TASK_GAP * 0.65,
  },
  answerArea: {
    marginTop: 6,
  },
  answerAreaBlank: {
    borderColor: "#d4d4d8",
    borderWidth: 1,
  },
  answerAreaGrid: {
    position: "relative",
    borderWidth: 0,
    backgroundColor: "#ffffff",
  },
  answerAreaLines: {
    position: "relative",
    borderColor: "#e4e4e7",
    borderWidth: 1,
    backgroundColor: "#ffffff",
  },
  gridCell: {
    position: "absolute",
  },
  cropMarkHorizontal: {
    position: "absolute",
    height: 0.75,
    backgroundColor: "#71717a",
  },
  cropMarkVertical: {
    position: "absolute",
    width: 0.75,
    backgroundColor: "#71717a",
  },
});

export type DocumentPdfProps = PdfDocumentData & {
  mathCache: PdfMathRenderCache;
};

export type SheetContentProps = {
  title: string;
  display: PdfDocumentData["display"];
  items: PdfDocumentData["items"];
  mathCache: PdfMathRenderCache;
  showHeader?: boolean;
  showInstructions?: boolean;
  contentScale?: number;
  subtaskGridLayout?: boolean;
};

export function SheetContent({
  title,
  display,
  items,
  mathCache,
  showHeader = true,
  showInstructions = true,
  contentScale = 1,
  subtaskGridLayout = false,
}: SheetContentProps) {
  const fontSize = PDF_FONT_SIZE * contentScale;
  const titleSize = PDF_SHEET_TITLE_SIZE * contentScale;
  const instructionsSize = DOCUMENT_INSTRUCTIONS_FONT_SIZE_PT * contentScale;
  const headerMarginBottom = PDF_HEADER_MARGIN_BOTTOM * contentScale;
  const instructionsMarginBottom =
    DOCUMENT_INSTRUCTIONS_MARGIN_BOTTOM_PT * contentScale;
  const taskGap = PDF_TASK_GAP * 0.65 * contentScale;
  const taskNumberWidth = PDF_TASK_NUMBER_WIDTH * contentScale;
  const taskInnerGap = PDF_TASK_INNER_GAP * contentScale;
  const showRow1Meta =
    display.showDate || display.showClass || display.showTotalPoints;
  const showRow1 =
    showHeader &&
    ((display.showTitle && title.trim().length > 0) || showRow1Meta);
  const showRow2 =
    showHeader && (display.showStudentName || display.showGroup);
  const showSheetHeader = showRow1 || showRow2;

  return (
    <>
      {showSheetHeader ? (
        <View style={[styles.header, { marginBottom: headerMarginBottom }]}>
          {showRow1 ? (
            <View style={styles.headerRow1}>
              {display.showTitle && title.trim().length > 0 ? (
                <Text style={[styles.title, { fontSize: titleSize }]}>
                  {title.trim()}
                </Text>
              ) : null}

              {showRow1Meta ? (
                <View style={styles.headerRow1Meta}>
                  {display.showDate ? (
                    <View style={styles.headerField}>
                      <Text style={styles.headerFieldLabel}>Data:</Text>
                      <View
                        style={[
                          styles.headerFieldLineBox,
                          styles.headerDateLine,
                        ]}
                      >
                        <Text style={styles.headerFieldValue}>
                          {display.date}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {display.showClass ? (
                    <View style={[styles.headerField, styles.headerClassField]}>
                      <Text style={styles.headerFieldLabel}>Klasa:</Text>
                      <View
                        style={[
                          styles.headerFieldLineBox,
                          styles.headerClassLine,
                        ]}
                      >
                        <Text style={styles.headerFieldValue}>
                          {display.className.trim() || " "}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {display.showTotalPoints ? (
                    <View style={[styles.headerField, styles.headerTotalField]}>
                      <Text style={styles.headerFieldLabel}>Suma pkt:  </Text>
                      <View style={styles.headerTotalLine} />
                      <Text style={styles.headerTotalSuffix}>
                        {`/ ${extractDocumentTotalPointsMax(display.totalPoints, 0)}`}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          {showRow2 ? (
            <View
              style={
                display.showStudentName
                  ? styles.headerRow2
                  : [styles.headerRow2, styles.headerRow2GroupOnly]
              }
            >
              {display.showStudentName ? (
                <View style={styles.headerNameField}>
                  <Text style={styles.headerFieldLabel}>
                    Imię i nazwisko:
                  </Text>
                  <View style={styles.headerNameLine} />
                </View>
              ) : null}

              {display.showGroup ? (
                <View style={styles.headerGroupField}>
                  <Text style={styles.headerFieldLabel}>Grupa:</Text>
                  <Text
                    style={[
                      styles.headerFieldLine,
                      styles.headerGroupLine,
                    ]}
                  >
                    {display.group || " "}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {showInstructions && display.showStudentInstructions ? (
        <Text
          style={[
            styles.studentInstructions,
            {
              fontSize: instructionsSize,
              marginBottom: instructionsMarginBottom,
            },
          ]}
        >
          {display.studentInstructions}
        </Text>
      ) : null}

      {items.map((item, index) => {
        if (item.kind === "answer-area") {
          return (
            <View
              key={`answer-area-${index}`}
              wrap={false}
              style={
                index === 0
                  ? [styles.answerAreaBlock, { marginTop: taskGap }]
                  : [styles.answerAreaBlock, { marginTop: taskGap }]
              }
            >
              <PdfAnswerArea
                areaType={item.areaType}
                answerHeightPx={item.answerHeightPx}
                contentScale={contentScale}
              />
            </View>
          );
        }

        const useSubtaskGrid = shouldUseSubtaskGridLayout(
          item.value,
          subtaskGridLayout
        );

        return (
          <View
            key={`task-${item.number}`}
            wrap
            style={index === 0 ? styles.task : [styles.task, { marginTop: taskGap }]}
          >
            <Text
              style={[
                styles.taskNumber,
                {
                  width: taskNumberWidth,
                  marginRight: taskInnerGap,
                  fontSize,
                },
              ]}
            >
              {formatTaskNumber(item.number)}
            </Text>

            <View style={styles.taskBody}>
              {useSubtaskGrid ? (
                <SubtaskGridDocumentRendererPdf
                  value={item.value}
                  mathCache={mathCache}
                  contentScale={contentScale}
                  subtaskGridOffsets={item.subtaskGridOffsets}
                />
              ) : (
                <DocumentRendererPdf
                  value={item.value}
                  mathCache={mathCache}
                  contentScale={contentScale}
                />
              )}
            </View>
          </View>
        );
      })}
    </>
  );
}

export function DocumentPdfPage({
  title,
  display,
  items,
  mathCache,
  subtaskGridLayout,
}: DocumentPdfProps) {
  return (
    <Page size="A4" style={styles.page}>
      <SheetContent
        title={title}
        display={display}
        items={items}
        mathCache={mathCache}
        subtaskGridLayout={subtaskGridLayout}
      />
    </Page>
  );
}

export function GridPdfPage({
  page,
  mathCache,
}: {
  page: Extract<PdfLayoutPage, { kind: "grid" }>;
  mathCache: PdfMathRenderCache;
}) {
  const cellWidth = A4_WIDTH_PT / page.cols;
  const cellHeight = A4_HEIGHT_PT / page.rows;
  const cellPaddingH = PDF_PAGE_PADDING_H * CELL_PADDING_SCALE;
  const cellPaddingV = PDF_PAGE_PADDING_V * CELL_PADDING_SCALE;

  return (
    <Page size="A4" style={{ padding: 0, position: "relative" }}>
      {page.guides.showCropMarks ? (
        <PdfCropMarks cols={page.cols} rows={page.rows} />
      ) : null}

      {page.cells.map((cell, index) => {
        const col = index % page.cols;
        const row = Math.floor(index / page.cols);
        const contentScale =
          cell.contentScale ?? getLayoutBaseScale(page.gridLayout);

        return (
          <View
            key={`cell-${index}`}
            style={[
              styles.gridCell,
              {
                left: col * cellWidth,
                top: row * cellHeight,
                width: cellWidth,
                height: cellHeight,
                paddingHorizontal: cellPaddingH,
                paddingTop: cellPaddingV,
                paddingBottom: cellPaddingV * 0.5,
                borderRightWidth:
                  page.guides.showCutLines && col < page.cols - 1 ? 1 : 0,
                borderBottomWidth:
                  page.guides.showCutLines && row < page.rows - 1 ? 1 : 0,
                borderRightColor: "#d4d4d8",
                borderBottomColor: "#d4d4d8",
                borderRightStyle: "dashed",
                borderBottomStyle: "dashed",
                fontFamily: PDF_BODY_FONT,
                fontSize: PDF_FONT_SIZE * contentScale,
                lineHeight: PDF_LINE_HEIGHT,
                color: "#18181b",
              },
            ]}
          >
            <GridCellContent
              cell={cell}
              mathCache={mathCache}
              contentScale={contentScale}
            />
          </View>
        );
      })}
    </Page>
  );
}

function GridCellContent({
  cell,
  mathCache,
  contentScale,
}: {
  cell: PdfLayoutCell;
  mathCache: PdfMathRenderCache;
  contentScale: number;
}) {
  return (
    <SheetContent
      title={cell.title}
      display={cell.display}
      items={cell.items}
      mathCache={mathCache}
      showHeader={cell.showHeader}
      showInstructions={cell.showInstructions}
      contentScale={contentScale}
    />
  );
}

function PdfCropMarks({ cols, rows }: { cols: number; rows: number }) {
  const verticalLines = Array.from({ length: cols + 1 }, (_, index) =>
    (index * A4_WIDTH_PT) / cols
  );
  const horizontalLines = Array.from({ length: rows + 1 }, (_, index) =>
    (index * A4_HEIGHT_PT) / rows
  );
  const marks: Array<{
    key: string;
    left: number;
    top: number;
    horizontal: boolean;
  }> = [];

  for (const x of verticalLines) {
    for (const y of horizontalLines) {
      marks.push(
        {
          key: `h-left-${x}-${y}`,
          left: x - CROP_MARK_OFFSET_PT - CROP_MARK_LENGTH_PT,
          top: y - 0.375,
          horizontal: true,
        },
        {
          key: `h-right-${x}-${y}`,
          left: x + CROP_MARK_OFFSET_PT,
          top: y - 0.375,
          horizontal: true,
        },
        {
          key: `v-top-${x}-${y}`,
          left: x - 0.375,
          top: y - CROP_MARK_OFFSET_PT - CROP_MARK_LENGTH_PT,
          horizontal: false,
        },
        {
          key: `v-bottom-${x}-${y}`,
          left: x - 0.375,
          top: y + CROP_MARK_OFFSET_PT,
          horizontal: false,
        }
      );
    }
  }

  return (
    <>
      {marks.map((mark) => (
        <View
          key={mark.key}
          style={
            mark.horizontal
              ? [
                  styles.cropMarkHorizontal,
                  {
                    left: mark.left,
                    top: mark.top,
                    width: CROP_MARK_LENGTH_PT,
                  },
                ]
              : [
                  styles.cropMarkVertical,
                  {
                    left: mark.left,
                    top: mark.top,
                    height: CROP_MARK_LENGTH_PT,
                  },
                ]
          }
        />
      ))}
    </>
  );
}

export type MultiDocumentPdfProps = {
  pages: PdfLayoutPage[];
  mathCaches: PdfMathRenderCache[];
};

export function MultiDocumentPdf({ pages, mathCaches }: MultiDocumentPdfProps) {
  return (
    <Document>
      {pages.map((page, index) => {
        const mathCache = mathCaches[index];

        if (page.kind === "grid") {
          return (
            <GridPdfPage
              key={`page-${index}`}
              page={page}
              mathCache={mathCache}
            />
          );
        }

        return (
          <DocumentPdfPage
            key={`page-${index}`}
            {...page.sheet}
            mathCache={mathCache}
          />
        );
      })}
    </Document>
  );
}

export default function DocumentPdf({
  title,
  display,
  items,
  mathCache,
}: DocumentPdfProps) {
  return (
    <Document>
      <DocumentPdfPage
        title={title}
        display={display}
        items={items}
        mathCache={mathCache}
      />
    </Document>
  );
}

function PdfAnswerArea({
  areaType,
  answerHeightPx,
  contentScale = 1,
}: {
  areaType: AnswerAreaItemType;
  answerHeightPx: number;
  contentScale?: number;
}) {
  const heightPt = pxToAnswerAreaPt(answerHeightPx) * contentScale;

  if (areaType === "blank") {
    return (
      <View
        style={[
          styles.answerArea,
          styles.answerAreaBlank,
          { height: heightPt },
        ]}
      />
    );
  }

  const renderPlan = createPdfAnswerAreaPlan(
    areaType,
    heightPt,
    PDF_CONTENT_WIDTH_PT
  );
  const guideGeometry = createGuideGeometry(
    renderPlan.horizontalCount,
    renderPlan.verticalCount,
    renderPlan.step
  );

  return (
    <View
      style={[
        styles.answerArea,
        renderPlan.isGrid ? styles.answerAreaGrid : styles.answerAreaLines,
        { height: heightPt },
      ]}
    >
      {guideGeometry.horizontalOffsets.map((offset, index) => (
        <View
          key={`h-${index}`}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: offset,
            height: renderPlan.lineThickness,
            backgroundColor: renderPlan.lineColor,
          }}
        />
      ))}

      {renderPlan.isGrid
        ? guideGeometry.verticalOffsets.map((offset, index) => (
            <View
              key={`v-${index}`}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: offset,
                width: renderPlan.lineThickness,
                backgroundColor: renderPlan.lineColor,
              }}
            />
          ))
        : null}
    </View>
  );
}
