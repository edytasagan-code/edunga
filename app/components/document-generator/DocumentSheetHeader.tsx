import {
  extractDocumentTotalPointsMax,
  type DocumentDisplayOptions,
} from "@/app/lib/documentGenerator";

type Props = {
  title: string;
  display: DocumentDisplayOptions;
  calculatedTotalPoints?: number;
};

function showHeaderRow2(display: DocumentDisplayOptions): boolean {
  return display.showStudentName || display.showGroup;
}

function showStudentInstructionsBlock(
  display: DocumentDisplayOptions
): boolean {
  return display.showStudentInstructions;
}

function showHeaderRow1Meta(display: DocumentDisplayOptions): boolean {
  return (
    display.showDate || display.showClass || display.showTotalPoints
  );
}

function showHeaderRow1(
  title: string,
  display: DocumentDisplayOptions
): boolean {
  return (
    (display.showTitle && title.trim().length > 0) ||
    showHeaderRow1Meta(display)
  );
}

export function showDocumentSheetHeader(
  title: string,
  display: DocumentDisplayOptions
): boolean {
  return (
    showHeaderRow1(title, display) ||
    showHeaderRow2(display) ||
    showStudentInstructionsBlock(display)
  );
}

export default function DocumentSheetHeader({
  title,
  display,
  calculatedTotalPoints = 0,
}: Props) {
  const showRow1 = showHeaderRow1(title, display);
  const showRow1Meta = showHeaderRow1Meta(display);
  const showRow2 = showHeaderRow2(display);
  const totalPointsMax = extractDocumentTotalPointsMax(
    display.totalPoints,
    calculatedTotalPoints
  );

  return (
    <header className="document-preview-header">
      {showRow1 ? (
        <div className="document-preview-header-row1">
          {display.showTitle && title.trim().length > 0 ? (
            <h3 className="document-preview-title">{title.trim()}</h3>
          ) : null}

          {showRow1Meta ? (
            <div className="document-preview-header-row1__meta">
              {display.showDate ? (
                <span className="document-preview-header-field document-preview-header-field--date">
                  <span className="document-preview-header-field__label">
                    Data:
                  </span>
                  <span className="document-preview-header-field__line document-preview-header-field__line--date">
                    <span className="document-preview-header-field__value">
                      {display.date}
                    </span>
                  </span>
                </span>
              ) : null}

              {display.showClass ? (
                <span className="document-preview-header-field document-preview-header-field--class">
                  <span className="document-preview-header-field__label">
                    Klasa:
                  </span>
                  <span className="document-preview-header-field__line document-preview-header-field__line--class">
                    <span className="document-preview-header-field__value">
                      {display.className}
                    </span>
                  </span>
                </span>
              ) : null}

              {display.showTotalPoints ? (
                <span className="document-preview-header-field document-preview-header-field--total">
                  <span className="document-preview-header-field__label">
                    Suma pkt:&nbsp;&nbsp;
                  </span>
                  <span
                    className="document-preview-header-field__line document-preview-header-field__line--total"
                    aria-hidden
                  />
                  <span className="document-preview-header-field__suffix">
                    / {totalPointsMax}
                  </span>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {showRow2 ? (
        <div
          className={
            display.showStudentName
              ? "document-preview-header-row2"
              : "document-preview-header-row2 document-preview-header-row2--group-only"
          }
        >
          {display.showStudentName ? (
            <span className="document-preview-header-field document-preview-header-field--name">
              <span className="document-preview-header-field__label">
                Imię i nazwisko:
              </span>
              <span
                className="document-preview-header-field__line document-preview-header-field__line--name"
                aria-hidden
              />
            </span>
          ) : null}

          {display.showGroup ? (
            <span className="document-preview-header-field document-preview-header-field--group">
              <span className="document-preview-header-field__label">
                Grupa:
              </span>
              <span className="document-preview-header-field__line document-preview-header-field__line--group">
                {display.group}
              </span>
            </span>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

export function DocumentStudentInstructions({
  display,
}: {
  display: DocumentDisplayOptions;
}) {
  if (!display.showStudentInstructions) {
    return null;
  }

  return (
    <div className="document-preview-instructions">
      {display.studentInstructions}
    </div>
  );
}
