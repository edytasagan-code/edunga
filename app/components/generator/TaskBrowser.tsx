import type { Zadanie } from "../../lib/types";
import TaskCard from "./TaskCard";

type Props = {
  zadania: Zadanie[];
  dodane: string[];
  onAdd: (id: string) => void;
};

export default function TaskBrowser({
  zadania,
  dodane,
  onAdd,
}: Props) {
  return (
    <div className="flex-1 rounded-2xl bg-[#252934] p-6">

      {zadania.length === 0 ? (

        <div className="flex h-64 items-center justify-center text-zinc-500">
          Brak zadań dla wybranych filtrów.
        </div>

      ) : (

        <div className="space-y-4">

          {zadania.map((zadanie) => (
            <TaskCard
              key={zadanie.id}
              zadanie={zadanie}
              onAdd={onAdd}
              isAdded={dodane.includes(zadanie.id)}
            />
          ))}

        </div>

      )}

    </div>
  );
}