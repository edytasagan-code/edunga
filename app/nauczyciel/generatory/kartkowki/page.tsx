"use client";

import { useState } from "react";

import Navbar from "../../../components/Navbar";


import FiltersPanel from "../../../components/generator/FiltersPanel";
import SearchBar from "../../../components/generator/SearchBar";
import TaskBrowser from "../../../components/generator/TaskBrowser";
import WorksheetPanel from "../../../components/generator/WorksheetPanel";

import { mockZadania } from "../../../data/mockZadania";

export default function KartkowkiPage() {
  const [arkusz, setArkusz] = useState<typeof mockZadania>([]);
const [wybraneDzialy, setWybraneDzialy] = useState<string[]>([]);
const zadaniaDoWyswietlenia =
  wybraneDzialy.length === 0
    ? mockZadania
    : mockZadania.filter((z) =>
        wybraneDzialy.includes(z.dzial)
      );
  function dodajZadanie(id: string) {
    const zadanie = mockZadania.find((z) => z.id === id);

    if (!zadanie) return;

    // nie dodawaj drugi raz tego samego zadania
    if (arkusz.some((z) => z.id === id)) return;

    setArkusz((prev) => [...prev, zadanie]);
  }

  function usunZadanie(id: string) {
    setArkusz((prev) => prev.filter((z) => z.id !== id));
  }

  return (
    <>
      <Navbar />

      <main className="flex min-h-screen bg-[#1E2128]">
        

        <section className="mx-auto flex w-full max-w-[1800px] gap-4
         px-10 py-6">

          <FiltersPanel
  wybraneDzialy={wybraneDzialy}
  setWybraneDzialy={setWybraneDzialy}
/>

          <div className="flex flex-1 flex-col gap-4">

            <SearchBar />

            <TaskBrowser
  zadania={zadaniaDoWyswietlenia}
  dodane={arkusz.map((z) => z.id)}
  onAdd={dodajZadanie}
/>

          </div>

          <WorksheetPanel
            zadania={arkusz}
            onRemove={usunZadanie}
          />

        </section>

      </main>
    </>
  );
}