import Link from "next/link";

export default function Toolbar() {
  return (
    <div className="flex items-center justify-between">

      <div>
        <h1 className="text-4xl font-bold text-white">
          Baza zadań
        </h1>

        <p className="mt-2 text-zinc-400">
          Zarządzaj wszystkimi zadaniami.
        </p>
      </div>

      <div className="flex gap-3">

        <Link
          href="/nauczyciel/import"
          className="rounded-xl border border-zinc-700 px-5 py-3 text-white hover:border-[#F7B500]"
        >
          Import
        </Link>

        <button className="rounded-xl border border-zinc-700 px-5 py-3 text-white hover:border-[#F7B500]">
          Eksport
        </button>

        <Link
          href="/nauczyciel/edytor"
          className="rounded-xl bg-[#F7B500] px-6 py-3 font-semibold text-black"
        >
          + Dodaj zadanie
        </Link>

      </div>

    </div>
  );
}