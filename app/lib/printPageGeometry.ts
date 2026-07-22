/**
 * Shared A4 page geometry for DocumentPrintPreview packing and Playwright PDF.
 * One physical page size for preview, PDF and printer — CSS millimetres.
 *
 * Prefer the probed px values from `useA4Dimensions` (actual `210mm`/`297mm`
 * in the current browser) over the theoretical constants when packing.
 *
 * Bottom inset must stay in sync with
 * `--doc-page-padding-block-end` in document-sheet-typography.css.
 */

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

/** CSS reference pixel density used by the browser for mm→px. */
export const CSS_DPI = 96;

export const A4_WIDTH_PX = (A4_WIDTH_MM * CSS_DPI) / 25.4;
export const A4_HEIGHT_PX = (A4_HEIGHT_MM * CSS_DPI) / 25.4;

/**
 * Extra clearance above the physical page bottom so typical printers do not
 * clip the last line. Applied as `--doc-page-padding-block-end` on the preview
 * root (single source for preview, Playwright PDF, and browser print).
 */
export const SAFE_PRINT_BOTTOM_MARGIN_MM = 7;

export const SAFE_PRINT_BOTTOM_MARGIN_PX =
  (SAFE_PRINT_BOTTOM_MARGIN_MM * CSS_DPI) / 25.4;

export function outerHeight(el: HTMLElement): number {
  const style = getComputedStyle(el);
  return (
    el.offsetHeight +
    (parseFloat(style.marginTop) || 0) +
    (parseFloat(style.marginBottom) || 0)
  );
}

/**
 * Resolve a CSS custom-property length (rem/em/px/mm) to CSS pixels.
 * `em` uses `emBasePx` (usually the sheet computed font-size); `rem` uses
 * the documentElement font-size — never the sheet size.
 */
export function cssVarLengthToPx(
  raw: string,
  emBasePx: number,
  remBasePx: number = emBasePx
): number {
  const value = raw.trim();
  const amount = parseFloat(value);
  if (!Number.isFinite(amount)) {
    return 0;
  }

  if (value.endsWith("rem")) {
    return amount * remBasePx;
  }
  if (value.endsWith("em")) {
    return amount * emBasePx;
  }
  if (value.endsWith("mm")) {
    return (amount * CSS_DPI) / 25.4;
  }
  if (value.endsWith("cm")) {
    return (amount * CSS_DPI) / 2.54;
  }
  // px or unitless
  return amount;
}

/** Usable content height inside a border-box sheet of `pageHeightPx`. */
export function sheetContentCapacityPx(
  pageHeightPx: number,
  padTopPx: number,
  padBottomPx: number
): number {
  return Math.max(120, pageHeightPx - padTopPx - padBottomPx);
}

/**
 * True when sheet children do not fit the content box.
 *
 * Uses layout metrics only (`clientHeight` / `offsetHeight` / computed margins).
 * Must NOT use getBoundingClientRect under CSS transforms.
 *
 * Bottom inset always includes at least SAFE_PRINT_BOTTOM_MARGIN_PX so packing
 * and overflow checks stay aligned with the visible page margin.
 */
export function sheetContentOverflows(sheet: HTMLElement): boolean {
  const children = Array.from(sheet.children) as HTMLElement[];
  if (children.length === 0) {
    return false;
  }

  const style = getComputedStyle(sheet);
  const padTop = parseFloat(style.paddingTop) || 0;
  const computedPadBottom = parseFloat(style.paddingBottom) || 0;
  const padBottom = Math.max(computedPadBottom, SAFE_PRINT_BOTTOM_MARGIN_PX);
  const available = sheet.clientHeight - padTop - padBottom;
  if (available <= 0) {
    return false;
  }

  let used = 0;
  let prevMarginBottom = 0;

  for (let i = 0; i < children.length; i += 1) {
    const child = children[i];
    const childStyle = getComputedStyle(child);
    const marginTop = parseFloat(childStyle.marginTop) || 0;
    const marginBottom = parseFloat(childStyle.marginBottom) || 0;

    if (i === 0) {
      used += marginTop + child.offsetHeight + marginBottom;
    } else {
      used +=
        Math.max(prevMarginBottom, marginTop) +
        child.offsetHeight +
        marginBottom -
        prevMarginBottom;
    }

    prevMarginBottom = marginBottom;
  }

  return used > available + 0.5;
}
