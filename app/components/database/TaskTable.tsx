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
};

export default function TaskTable() {
  const [zadania, setZadania] = useState<Zadanie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/zadania");
      const data = await res.json();

      setZadania(data);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl bg-[#1E2128] p-6 text-white">
        Ładowanie...
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#1E2128] p-6">

      <h1 className="mb-6 text-4xl font-bold text-white">
        Baza zadań
      </h1>

      <div className="overflow-x-auto">

        <table className="w-full text-white">

          <thead>

            <tr className="border-b border-zinc-700">

              <th className="w-24 p-3 text-left">
                Klasa
              </th>

              <th className="w-56 p-3 text-left">
                Dział
              </th>

              <th className="w-[600px] p-3 text-left">
                Treść zadania
              </th>

              <th className="w-32 p-3 text-left">
                Typ
              </th>

              <th className="w-20 p-3 text-center">
                Poziom
              </th>

              <th className="w-20 p-3 text-center">
                Pkt
              </th>

              <th className="w-20 p-3 text-center">
                Min
              </th>

              <th className="w-36 p-3 text-center">
                Akcje
              </th>

            </tr>

          </thead>

          <tbody>

            {zadania.map((z) => (

              <tr
                key={z.id}
                className="border-b border-zinc-800 hover:bg-zinc-800"
              >

                <td className="p-3">
                  {z.klasaId}
                </td>

                <td className="p-3">
                  {z.dzialId}
                </td>

                <td className="max-w-[600px] p-3">

                  <div className="line-clamp-2 break-words">

                    <MathViewer value={z.tresc} />

                  </div>

                </td>

                <td className="p-3">
                  {z.typ}
                </td>

                <td className="text-center">
                  {z.poziom}
                </td>

                <td className="text-center">
                  {z.punkty}
                </td>

                <td className="text-center">
                  {z.czas}
                </td>

                <td className="space-x-2 text-center">

                  <button className="rounded bg-blue-600 px-3 py-1 hover:bg-blue-500">
                    👁
                  </button>

                  <button className="rounded bg-green-600 px-3 py-1 hover:bg-green-500">
                    ✏
                  </button>

                  <button className="rounded bg-red-600 px-3 py-1 hover:bg-red-500">
                    🗑
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}