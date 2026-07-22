/** Result of rendering MathNode.latex to a portable math format. */
export type MathSvgRender = {
  format: "svg";
  svg: string;
  widthPt: number;
  heightPt: number;
};

/** Future DOCX backend. */
export type MathOmmlRender = {
  format: "omml";
  xml: string;
};

export type MathRenderResult = MathSvgRender | MathOmmlRender;

export interface MathNodeRenderer<TResult extends MathRenderResult> {
  readonly format: TResult["format"];
  render(latex: string): Promise<TResult>;
}
