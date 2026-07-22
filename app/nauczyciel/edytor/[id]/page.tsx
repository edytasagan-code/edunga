import { Suspense } from "react";

import TaskForm from "@/app/components/database/TaskForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <main
      className="box-border flex flex-col"
      style={{
        background: "#0d0d0d",
        paddingTop: 40,
        paddingRight: 48,
        paddingBottom: 180,
        paddingLeft: 48,
      }}
    >
      <div className="flex w-full max-w-full flex-col">
        <Suspense
          fallback={
            <div className="rounded-xl border border-zinc-800 bg-[#0d0d0d] p-6 text-zinc-100">
              Ładowanie zadania...
            </div>
          }
        >
          <TaskForm taskId={id} />
        </Suspense>
      </div>
    </main>
  );
}
