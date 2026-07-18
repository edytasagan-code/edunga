import { Suspense } from "react";

import ImportPreview from "@/app/components/import/ImportPreview";

import "../import.css";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { sessionId } = await params;

  return (
    <main className="import-page">
      <div className="import-page__container">
        <Suspense
          fallback={
            <div className="import-panel import-panel--loading">
              Ładowanie podglądu importu...
            </div>
          }
        >
          <ImportPreview sessionId={sessionId} />
        </Suspense>
      </div>
    </main>
  );
}
