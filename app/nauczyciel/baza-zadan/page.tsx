import { Suspense } from "react";

import TaskTable from "@/app/components/database/TaskTable";

import "./baza-zadan.css";

export default function Page() {
  return (
    <main className="baza-zadan-page">
      <div className="baza-zadan-container">
        <Suspense
          fallback={
            <div className="rounded-lg border border-zinc-200 bg-white p-6 text-zinc-600">
              Ładowanie...
            </div>
          }
        >
          <TaskTable />
        </Suspense>
      </div>
    </main>
  );
}
