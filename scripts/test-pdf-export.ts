import { parseEditorDocument } from "../app/components/editor/parseEditorDocument";
import { defaultDocumentDisplayOptions } from "../app/lib/documentGenerator";
import { generateDocumentPdf } from "../app/lib/pdf/generateDocumentPdf";
import { prisma } from "../app/lib/prisma";
import { normalizeVariants } from "../app/lib/variants";

async function main() {
  const zadanie = await prisma.zadanie.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!zadanie) {
    throw new Error("no task");
  }

  const variants = normalizeVariants(zadanie);
  const content = variants[0]?.tresc;

  const pdf = await generateDocumentPdf({
    pages: [
      {
        kind: "standard",
        sheet: {
          title: "Test",
          display: {
            ...defaultDocumentDisplayOptions(),
            showClass: true,
            className: "1 LO",
            date: "6.07.2026",
          },
          items: [
            {
              kind: "task",
              number: 1,
              value: content,
            },
          ],
        },
      },
    ],
  });

  console.log("ok", pdf.length, pdf.subarray(0, 4).toString());
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
