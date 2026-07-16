import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

function pdfJsAssetUrl(...segments: string[]): string {
  const require = createRequire(import.meta.url);
  const pdfjsRoot = dirname(require.resolve("pdfjs-dist/package.json"));
  const directory = join(pdfjsRoot, ...segments);
  return `${pathToFileURL(directory).href}/`;
}

export function getPdfJsDocInitParams() {
  return {
    standardFontDataUrl: pdfJsAssetUrl("standard_fonts"),
    cMapUrl: pdfJsAssetUrl("cmaps"),
    cMapPacked: true as const,
  };
}
