"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import Link from "next/link";

import {
  klasa1,
  klasa2,
  klasa3,
  klasa4,
  matura,
} from "../data/matematyka";

export default function UczenPage() {
  const [dzialy, setDzialy] = useState(klasa1);
  const [aktywna, setAktywna] = useState("Klasa 1");

  return (
    <>
      <Navbar />

      <main className="flex min-h-screen bg-[#1E2128]">
        <Sidebar />

        <section className="flex-1 p-10">
          <h1 className="text-3xl font-bold text-white">
            Materiały
          </h1>

          <div className="mt-8 mb-10 flex flex-wrap gap-4">

            <button
              onClick={() => {
                setDzialy(klasa1);
                setAktywna("Klasa 1");
              }}
              className={`rounded-xl px-6 py-3 font-semibold transition ${
                aktywna === "Klasa 1"
                  ? "bg-[#F7B500] text-black"
                  : "border border-zinc-700 text-white hover:border-[#F7B500] hover:text-[#F7B500]"
              }`}
            >
              Klasa 1
            </button>

            <button
              onClick={() => {
                setDzialy(klasa2);
                setAktywna("Klasa 2");
              }}
              className={`rounded-xl px-6 py-3 font-semibold transition ${
                aktywna === "Klasa 2"
                  ? "bg-[#F7B500] text-black"
                  : "border border-zinc-700 text-white hover:border-[#F7B500] hover:text-[#F7B500]"
              }`}
            >
              Klasa 2
            </button>

            <button
              onClick={() => {
                setDzialy(klasa3);
                setAktywna("Klasa 3");
              }}
              className={`rounded-xl px-6 py-3 font-semibold transition ${
                aktywna === "Klasa 3"
                  ? "bg-[#F7B500] text-black"
                  : "border border-zinc-700 text-white hover:border-[#F7B500] hover:text-[#F7B500]"
              }`}
            >
              Klasa 3
            </button>

            <button
              onClick={() => {
                setDzialy(klasa4);
                setAktywna("Klasa 4");
              }}
              className={`rounded-xl px-6 py-3 font-semibold transition ${
                aktywna === "Klasa 4"
                  ? "bg-[#F7B500] text-black"
                  : "border border-zinc-700 text-white hover:border-[#F7B500] hover:text-[#F7B500]"
              }`}
            >
              Klasa 4
            </button>

            <button
              onClick={() => {
                setDzialy(matura);
                setAktywna("Matura");
              }}
              className={`rounded-xl px-6 py-3 font-semibold transition ${
                aktywna === "Matura"
                  ? "bg-[#F7B500] text-black"
                  : "border border-zinc-700 text-white hover:border-[#F7B500] hover:text-[#F7B500]"
              }`}
            >
              Matura
            </button>

          </div>

          <div className="grid grid-cols-3 gap-6">

            {dzialy.map((dzial) => (

              <div
                key={dzial.id}
                className="min-h-[340px] rounded-2xl border border-zinc-700 bg-[#252934] p-6 transition hover:border-[#F7B500]"
              >

                <h2 className="min-h-[60px] text-xl font-bold leading-7 text-white">
                  {dzial.nazwa}
                </h2>

                <ul className="mt-4 max-h-56 space-y-2 overflow-y-auto pr-2">

                  {dzial.tematy.map((temat, index) => {

                    const slug =
                      typeof temat === "string"
                        ? temat
                            .toLowerCase()
                            .replaceAll(".", "")
                            .replaceAll(",", "")
                            .replaceAll(" ", "-")
                        : temat.slug;

                    const nazwa =
                      typeof temat === "string"
                        ? temat
                        : temat.nazwa;

                    return (
                      <li key={index}>

                        <Link
                          href={`/uczen/temat/${slug}`}
                          className="block rounded-lg px-3 py-2 transition hover:bg-zinc-800"
                        >
                          <div className="flex items-center justify-between">

                            <span className="text-zinc-300 hover:text-[#F7B500]">
                              {nazwa}
                            </span>

                            <span className="text-[#F7B500]">
                              →
                            </span>

                          </div>
                        </Link>

                      </li>
                    );

                  })}

                </ul>

              </div>

            ))}

          </div>

        </section>
      </main>
    </>
  );
}