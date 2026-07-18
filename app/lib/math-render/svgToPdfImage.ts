import sharp from "sharp";

/** Raster density for inline math (points → pixels). */
const PX_PER_PT = 3;

export async function svgStringToPngDataUri(
  svg: string,
  widthPt: number,
  heightPt: number
): Promise<string> {
  if (!svg.trim() || widthPt <= 0 || heightPt <= 0) {
    return "";
  }

  const widthPx = Math.max(1, Math.round(widthPt * PX_PER_PT));
  const heightPx = Math.max(1, Math.round(heightPt * PX_PER_PT));

  const png = await sharp(Buffer.from(svg), { density: 72 * PX_PER_PT })
    .resize(widthPx, heightPx, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return `data:image/png;base64,${png.toString("base64")}`;
}
