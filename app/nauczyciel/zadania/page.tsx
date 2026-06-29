"use client";

import Navbar from "../../components/Navbar";
import Link from "next/link";

import { mockZadania } from "../../data/mockZadania";

export default function ZadaniaPage() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#1E2128]">

        <section className="mx-auto max-w-7xl p-8">

          <div className="mb-8 flex items-center justify-between">

            <h1 className="text-4xl font-bold text-white">
              Baza zadań
            </h1>

            <Link
              href="/nauczyciel/zadania/nowe"
              className="rounded-xl bg-[#F7B500] px-5 py-3 font-semibold text-black"
            >
              + Nowe zadanie
            </Link>

          </div>

          <input
            placeholder="Szukaj zadania..."
            className="mb-6 w-full rounded-xl bg-[#252934] p-4 text-white outline-none"
          />

          <div className="space-y-4">

            {mockZadania.map((zadanie) => (

              <div
                key={zadanie.id}
                className="rounded-2xl bg-[#252934] p-5"
              >

                <div className="flex items-start justify-between">

                  <div>

                    <div className="mb-2 flex gap-2">

                      <span className="rounded bg-zinc-700 px-2 py-1 text-xs text-white">
                        {zadanie.dzial}
                      </span>

                      <span className="rounded bg-[#F7B500] px-2 py-1 text-xs text-black">
                        {zadanie.poziom}
                      </span>

                    </div>

                    <p className="text-white">
                      {zadanie.tresc}
                    </p>

                  </div>

                  <div className="flex gap-2">

                    <button className="rounded-lg bg-zinc-700 px-3 py-2 text-white">
                      ✏️
                    </button>

                    <button className="rounded-lg bg-red-700 px-3 py-2 text-white">
                      🗑
                    </button>

                  </div>

                </div>

              </div>

            ))}

          </div>

        </section>

      </main>
    </>
  );
}