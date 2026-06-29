import type { Zadanie } from "../../lib/types";

type Props = {
  zadania: Zadanie[];
  onRemove: (id: string) => void;
};

export default function WorksheetPanel({
  zadania,
  onRemove,
}: Props) {
  return (
    <aside className="w-96 rounded-2xl bg-[#252934] p-6">

      <h2 className="mb-6 text-2xl font-bold text-white">
        Arkusz
      </h2>

      {zadania.length === 0 ? (
        <p className="text-zinc-500">
          Brak dodanych zadań.
        </p>
      ) : (
        <div className="space-y-3">

          {zadania.map((zadanie, index) => (

            <div
              key={`${zadanie.id}-${index}`}
              className="rounded-xl bg-[#1E2128] p-4"
            >

              <div className="flex items-start justify-between">

                <div>

                  <div className="font-semibold text-white">
                    {index + 1}. {zadanie.tresc}
                  </div>

                  <div className="mt-2 text-sm text-zinc-400">
                    {zadanie.temat}
                  </div>

                </div>

                <button
  onClick={() => onRemove(zadanie.id)}
  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-600 hover:text-white"
  title="Usuń z arkusza"
>
  ✕
</button>

              </div>

            </div>

          ))}

        </div>
      )}

    </aside>
  );
}