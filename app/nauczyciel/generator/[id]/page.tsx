import Link from "next/link";
import { notFound } from "next/navigation";

import DocumentGenerator from "@/app/components/document-generator/DocumentGenerator";
import {
  generatorDocumentFromRecord,
  savedDocumentFromDb,
} from "@/app/lib/documentProject";
import { loadGeneratorTasks } from "@/app/lib/loadGeneratorTasks";
import { prisma } from "@/app/lib/prisma";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export default async function GeneratorDocumentPage({ params }: Params) {
  const { id } = await params;

  const [record, tasks] = await Promise.all([
    prisma.dokument.findUnique({ where: { id } }),
    loadGeneratorTasks(),
  ]);

  if (!record) {
    notFound();
  }

  const saved = savedDocumentFromDb(record);

  if (!saved) {
    notFound();
  }

  const initialDocument = generatorDocumentFromRecord(saved);

  return (
    <main className="edunga-page edunga-page--padded edunga-page--full-height">
      <div className="edunga-page__container mx-auto flex min-h-0 max-w-[1800px] flex-1 flex-col">
        <header className="edunga-page__header mb-6 shrink-0">
          <div>
            <h1 className="edunga-page__title">Generator dokumentów</h1>
            <p className="edunga-page__subtitle">
              {saved.kod} · {saved.tytul}
            </p>
          </div>
          <Link
            href="/nauczyciel/biblioteka-dokumentow"
            className="edunga-link-button"
          >
            Biblioteka dokumentów
          </Link>
        </header>

        <div className="min-h-0 flex-1">
          <DocumentGenerator
            tasks={tasks}
            initialDocument={initialDocument}
            initialMetadata={{
              klasa: saved.klasa,
              poziom: saved.poziom,
              opis: saved.opis ?? "",
            }}
            documentId={saved.id}
            documentKod={saved.kod}
          />
        </div>
      </div>
    </main>
  );
}
