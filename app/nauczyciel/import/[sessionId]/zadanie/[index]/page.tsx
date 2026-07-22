import ImportExerciseEditor from "@/app/components/import/ImportExerciseEditor";

import "../../../import.css";

type PageProps = {
  params: Promise<{ sessionId: string; index: string }>;
};

export default async function Page({ params }: PageProps) {
  const { sessionId, index } = await params;
  const exerciseIndex = Number(index);

  return (
    <main className="import-page flex h-dvh flex-col overflow-hidden p-8">
      <div className="import-page__container flex min-h-0 flex-1 flex-col">
        <ImportExerciseEditor
          sessionId={sessionId}
          exerciseIndex={exerciseIndex}
        />
      </div>
    </main>
  );
}
