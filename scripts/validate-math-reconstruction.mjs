import { reconstructMathWithRules } from "../app/lib/import/mathReconstruction.ts";

const samples = [
  `Wykonaj działania, stosując prawo łączności mnożenia:
a) 25 18 b) 141:12-Ż
79 18`,
  `a) (-3.4)+62+15+(-0.6)+(-Ż)+(-0,79)`,
  `b) 0,375-4-V6 | -— | (-0,25)-(-8)`,
];

for (const sample of samples) {
  const result = reconstructMathWithRules(sample);
  console.log("---");
  console.log("IN:", sample);
  console.log("OUT:", result.text);
  console.log("METHOD:", result.method);
}
