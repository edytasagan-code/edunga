import type { MathNodeRenderer, MathOmmlRender } from "./types";

/** Placeholder for future DOCX export via OMML. */
export const latexToOmmlRenderer: MathNodeRenderer<MathOmmlRender> = {
  format: "omml",

  async render() {
    throw new Error("DOCX math export (OMML) is not implemented yet.");
  },
};
