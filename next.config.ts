import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@react-pdf/renderer",
    "mathjax-full",
    "sharp",
    "pdf-parse",
    "pdfjs-dist",
    "pdf-to-img",
    "tesseract.js",
    "canvas",
  ],
};

export default nextConfig;
