import DocumentGenerator from "@/app/components/document-generator/DocumentGenerator";
import { loadGeneratorTasks } from "@/app/lib/loadGeneratorTasks";
import Link from "next/link";

export default async function GeneratorPage() {
  const tasks = await loadGeneratorTasks();

  return (
    <main className="edunga-page edunga-page--padded edunga-page--full-height">
      <div className="edunga-page__container mx-auto flex min-h-0 max-w-[1800px] flex-1 flex-col">
        <header className="edunga-page__header mb-6 shrink-0">
          <h1 className="edunga-page__title">Generator dokumentów</h1>
          <Link
            href="/nauczyciel/biblioteka-dokumentow"
            className="edunga-link-button"
          >
            Biblioteka dokumentów
          </Link>
        </header>

        <div className="min-h-0 flex-1">
          <DocumentGenerator tasks={tasks} />
        </div>
      </div>
    </main>
  );
}
