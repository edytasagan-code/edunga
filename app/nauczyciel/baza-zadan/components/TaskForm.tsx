"use client";

export default function TaskForm() {
  return (
    <div className="rounded-xl bg-[#1E2128] p-6">
      <h2 className="mb-6 text-2xl font-bold text-white">
        Nowe zadanie
      </h2>

      <div className="grid grid-cols-4 gap-4">

        <div>
          <label className="mb-1 block text-sm text-zinc-400">
            Klasa
          </label>

          <select className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-white">
            <option>Wybierz...</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-zinc-400">
            Dział
          </label>

          <select className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-white">
            <option>Wybierz...</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-zinc-400">
            Temat
          </label>

          <select className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-white">
            <option>Wybierz...</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-zinc-400">
            Punkty
          </label>

          <input
            type="number"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-white"
          />
        </div>

      </div>

      <div className="mt-6">

        <label className="mb-2 block text-sm text-zinc-400">
          Treść zadania
        </label>

        <textarea
          rows={8}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-white"
        />

      </div>

      <div className="mt-6">

        <label className="mb-2 block text-sm text-zinc-400">
          Rozwiązanie
        </label>

        <textarea
          rows={5}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-white"
        />

      </div>

      <div className="mt-6 flex gap-3">

        <button className="rounded-lg bg-yellow-500 px-5 py-3 font-bold text-black">
          Zapisz
        </button>

        <button className="rounded-lg bg-zinc-700 px-5 py-3 text-white">
          Zapisz i nowe
        </button>

      </div>

    </div>
  );
}