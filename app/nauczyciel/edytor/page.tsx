import { Suspense } from "react";

import TaskForm from "@/app/components/database/TaskForm";

export default function Page() {
  return (
    <main className="flex h-dvh flex-col overflow-hidden p-8">
      <div className="flex min-h-0 flex-1 flex-col">
        <Suspense
          fallback={
            <div className="rounded-xl bg-[#1E2128] p-6 text-white">
              Ładowanie zadania...
            </div>
          }
        >
          <TaskForm />
        </Suspense>
      </div>
    </main>
  );
}
