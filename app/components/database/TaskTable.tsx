"use client";

import { useEffect, useState } from "react";
import MathViewer from "./MathViewer";

type Zadanie = {
  id: string;
  klasaId: string;
  dzialId: string;
  tematId: string;
  typ: string;
  poziom: number;
  punkty: number;
  czas: number;
  tresc: unknown;
  odpowiedz?: string;
  rozwiazanie?: unknown;
};

export default function TaskTable() {
  const [zadania, setZadania] = useState<Zadanie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/zadania");
        const data = await res.json();

        setZadania(data);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function usun(id: string) {
    if (!confirm("Usunąć zadanie?")) return;

    const res = await fetch(`/api/zadania/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      alert("Nie udało się usunąć zadania.");
      return;
    }

    setZadania((prev) => prev.filter((z) => z.id !== id));
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-[#1E2128] p-6 text-white">
        Ładowanie...
      </div>
    );
  }

  return (
    <div className="space-y-5">

      <h1 className="text-4xl font-bold text-white">
        Baza zadań
      </h1>

      {zadania.map((z) => (

        <div
          key={z.id}
          className="rounded-xl border border-zinc-700 bg-[#1E2128] p-6"
        >

          <div className="mb-5 flex flex-wrap gap-2">

            <span className="rounded bg-zinc-700 px-3 py-1 text-sm">
              {z.klasaId}
            </span>

            <span className="rounded bg-zinc-700 px-3 py-1 text-sm">
              {z.dzialId}
            </span>

            <span className="rounded bg-blue-700 px-3 py-1 text-sm">
              {z.typ}
            </span>

            <span className="rounded bg-yellow-500 px-3 py-1 text-sm text-black">
              ★ {z.poziom}
            </span>

            <span className="rounded bg-green-700 px-3 py-1 text-sm">
              {z.punkty} pkt
            </span>

            <span className="rounded bg-purple-700 px-3 py-1 text-sm">
              {z.czas} min
            </span>

          </div>

          <div className="mb-6 break-words text-lg leading-8">

            <MathViewer value={z.tresc} />

          </div>

          {z.odpowiedz && (

            <div className="mb-6 rounded-lg bg-zinc-900 p-4">

              <div className="mb-2 font-semibold text-yellow-400">
                Odpowiedź
              </div>

              {z.odpowiedz}

            </div>

          )}

          <div className="flex gap-3">

            <button
              className="rounded-lg bg-green-600 px-4 py-2 font-semibold hover:bg-green-500"
            >
              ✏ Edytuj
            </button>

            <button
              className="rounded-lg bg-sky-600 px-4 py-2 font-semibold hover:bg-sky-500"
            >
              📄 Kopiuj
            </button>

            <button
              onClick={() => usun(z.id)}
              className="rounded-lg bg-red-600 px-4 py-2 font-semibold hover:bg-red-500"
            >
              🗑 Usuń
            </button>

          </div>

        </div>

      ))}

    </div>
  );
}