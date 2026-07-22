import { prisma } from "@/app/lib/prisma";
import type { GeneratorTask } from "@/app/components/document-generator/DocumentGenerator";

export async function loadGeneratorTasks(): Promise<GeneratorTask[]> {
  const zadania = await prisma.zadanie.findMany({
    orderBy: { createdAt: "desc" },
  });

  return zadania.map((z) => ({
    id: z.id,
    kod: z.kod,
    klasaId: z.klasaId,
    dzialId: z.dzialId,
    tematId: z.tematId,
    typ: z.typ,
    poziom: z.poziom,
    punkty: z.punkty,
    czas: z.czas,
    zrodlo: z.zrodlo,
    identyfikator: z.identyfikator,
    tresc: z.tresc,
    odpowiedz: z.odpowiedz,
    rozwiazanie: z.rozwiazanie,
    warianty: z.warianty,
  }));
}
