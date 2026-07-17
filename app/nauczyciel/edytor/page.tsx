import { Suspense } from "react";

import TaskForm from "@/app/components/database/TaskForm";

export default function Page() {
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
          <TaskForm />
        </Suspense>
      </div>
    </main>
  );
}
