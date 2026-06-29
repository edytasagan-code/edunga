"use client";

import { useState } from "react";
import { klasa1, klasa2, klasa3, klasa4, matura } from "../../data/matematyka";

export default function ProgramPage() {

  const [dzialy, setDzialy] = useState(klasa1);
  const [aktywna, setAktywna] = useState("Klasa 1");

  return (
    <>

<div className="mt-8 mb-10 flex flex-wrap gap-4">

  <button
    onClick={() => {
      setDzialy(klasa1);
      setAktywna("Klasa 1");
    }}
    className={`rounded-xl px-6 py-3 font-semibold transition ${
      aktywna === "Klasa 1"
        ? "bg-[#F7B500] text-black"
        : "border border-zinc-700 text-white hover:border-[#F7B500]"
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
        : "border border-zinc-700 text-white hover:border-[#F7B500]"
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
        : "border border-zinc-700 text-white hover:border-[#F7B500]"
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
        : "border border-zinc-700 text-white hover:border-[#F7B500]"
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
        : "border border-zinc-700 text-white hover:border-[#F7B500]"
    }`}
  >
    Matura
  </button>

</div></>
  );
}