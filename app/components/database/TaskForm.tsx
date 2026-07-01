"use client";

import { useState } from "react";

import { ParagraphModel } from "../editor/render/DocumentRenderer";

import TaskEditor from "./TaskEditor";
import SolutionEditor from "./SolutionEditor";
import ShortAnswer from "./ShortAnswer";

import { klasy } from "@/app/data/program/klasy";
import { dzialy } from "@/app/data/program/dzialy";
import { tematy } from "@/app/data/program/tematy";

export default function TaskForm() {
  const [klasaId, setKlasaId] = useState("");
  const [dzialId, setDzialId] = useState("");
  const [tematId, setTematId] = useState("");

  const [typ, setTyp] = useState("");
  const [poziom, setPoziom] = useState("");

  const [punkty, setPunkty] = useState("");
  const [czas, setCzas] = useState("");

  function createDocument(): ParagraphModel[] {
    return [
      {
        id: crypto.randomUUID(),
        nodes: [
          {
            id: crypto.randomUUID(),
            type: "text",
            text: "",
          },
        ],
      },
    ];
  }

  const [tresc, setTresc] =
    useState<ParagraphModel[]>(createDocument());

  const [rozwiazanie, setRozwiazanie] =
    useState<ParagraphModel[]>(createDocument());

  const [odpowiedz, setOdpowiedz] =
    useState<ParagraphModel[]>(createDocument());

  const dzialyKlasy = dzialy.filter(
    (d) => d.klasaId === klasaId
  );

  const tematyDzialu = tematy.filter(
    (t) => t.dzialId === dzialId
  );

  async function zapisz() {
    const response = await fetch("/api/zadania", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        klasaId,
        dzialId,
        tematId,

        typ,
        poziom: Number(poziom),

        punkty: Number(punkty),
        czas: Number(czas),

        tresc,
        rozwiazanie,
        odpowiedz,

        tagi: [],
      }),
    });

    if (!response.ok) {
      alert("Błąd zapisu zadania.");
      return;
    }

    alert("✅ Zadanie zapisane.");
  }

  return (
    <div className="rounded-xl bg-[#1E2128] p-6">
      <h1 className="mb-6 text-4xl font-bold text-white">
        Nowe zadanie
      </h1>

      <div className="space-y-4">

        <div className="grid grid-cols-3 gap-4">

          <select
            value={klasaId}
            onChange={(e) => {
              setKlasaId(e.target.value);
              setDzialId("");
              setTematId("");
            }}
            className="rounded-lg bg-zinc-800 p-3 text-white"
          >
            <option value="">Klasa</option>

            {klasy.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nazwa}
              </option>
            ))}
          </select>

          <select
            value={dzialId}
            onChange={(e) => {
              setDzialId(e.target.value);
              setTematId("");
            }}
            className="rounded-lg bg-zinc-800 p-3 text-white"
          >
            <option value="">Dział</option>

            {dzialyKlasy.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nazwa}
              </option>
            ))}
          </select>

          <select
            value={tematId}
            onChange={(e) => setTematId(e.target.value)}
            className="rounded-lg bg-zinc-800 p-3 text-white"
          >
            <option value="">Temat</option>

            {tematyDzialu.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nazwa}
              </option>
            ))}
          </select>

        </div>

        <div className="grid grid-cols-4 gap-4">

          <select
            value={typ}
            onChange={(e) => setTyp(e.target.value)}
            className="rounded-lg bg-zinc-800 p-3 text-white"
          >
            <option value="">Typ zadania</option>
            <option value="otwarte">Otwarte</option>
            <option value="zamkniete">Zamknięte</option>
            <option value="prawda-falsz">Prawda / Fałsz</option>
            <option value="uzupelnij">Uzupełnij</option>
            <option value="dobierz">Dobierz</option>
            <option value="test">Test</option>
          </select>

          <select
            value={poziom}
            onChange={(e) => setPoziom(e.target.value)}
            className="rounded-lg bg-zinc-800 p-3 text-white"
          >
            <option value="">Poziom</option>
            <option value="1">★☆☆☆☆</option>
            <option value="2">★★☆☆☆</option>
            <option value="3">★★★☆☆</option>
            <option value="4">★★★★☆</option>
            <option value="5">★★★★★</option>
          </select>

          <input
            type="number"
            value={punkty}
            onChange={(e) => setPunkty(e.target.value)}
            placeholder="Punkty"
            className="rounded-lg bg-zinc-800 p-3 text-white outline-none"
          />

          <input
            type="number"
            value={czas}
            onChange={(e) => setCzas(e.target.value)}
            placeholder="Czas (min)"
            className="rounded-lg bg-zinc-800 p-3 text-white outline-none"
          />

        </div>

      </div>

      <div className="mt-8 grid grid-cols-2 gap-6">

        <TaskEditor
          value={tresc}
          onChange={setTresc}
        />

        <SolutionEditor
          value={rozwiazanie}
          onChange={setRozwiazanie}
        />

      </div>

      <div className="mt-8">

        <ShortAnswer
          value={odpowiedz}
          onChange={setOdpowiedz}
        />

      </div>

      <div className="mt-8 flex justify-end">

        <button
          onClick={zapisz}
          className="rounded-xl bg-yellow-400 px-8 py-3 text-lg font-bold text-black transition hover:bg-yellow-300"
        >
          💾 Zapisz zadanie
        </button>

      </div>

    </div>
  );
}