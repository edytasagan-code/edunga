"use client";

import { useMemo, useState } from "react";

import TaskLibraryCard from "./TaskLibraryCard";

import { useCurriculum } from "@/app/lib/curriculum/useCurriculum";
import {
  normalizeTaskIdentifier,
  taskSourceLabel,
} from "@/app/lib/taskSource";

import type { GeneratorTask } from "./DocumentGenerator";

const TYP_OPTIONS = [
  { value: "", label: "Wszystkie typy" },
  { value: "otwarte", label: "Otwarte" },
  { value: "wybor-wielokrotny", label: "Wielokrotny wybór" },
  { value: "zamkniete", label: "Zamknięte" },
  { value: "prawda-falsz", label: "Prawda / Fałsz" },
  { value: "uzupelnij", label: "Uzupełnij" },
  { value: "dobierz", label: "Dobierz" },
  { value: "test", label: "Test" },
];

type Props = {
  tasks: GeneratorTask[];
  onAdd: (
    taskId: string,
    variantIndex: number,
    selectedSubtasks?: string[]
  ) => void;
  onAddAnswerArea: () => void;
  addedTaskIds: Set<string>;
};

export default function TaskLibrary({
  tasks,
  onAdd,
  onAddAnswerArea,
  addedTaskIds,
}: Props) {
  const [search, setSearch] = useState("");
  const [typ, setTyp] = useState("");

  const {
    klasy,
    dzialy: dzialyKlasy,
    tematy: tematyDzialu,
    klasaId,
    dzialId,
    tematId,
    setKlasaId,
    setDzialId,
    setTematId,
    loadingKlasy,
    loadingDzialy,
    loadingTematy,
  } = useCurriculum();

  const labelMaps = useMemo(() => {
    return {
      klasy: new Map(klasy.map((item) => [item.id, item.nazwa])),
      dzialy: new Map(dzialyKlasy.map((item) => [item.id, item.nazwa])),
      tematy: new Map(tematyDzialu.map((item) => [item.id, item.nazwa])),
    };
  }, [klasy, dzialyKlasy, tematyDzialu]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tasks.filter((task) => {
      if (klasaId && task.klasaId !== klasaId) {
        return false;
      }

      if (dzialId && task.dzialId !== dzialId) {
        return false;
      }

      if (tematId && task.tematId !== tematId) {
        return false;
      }

      if (typ && task.typ !== typ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const klasa = labelMaps.klasy.get(task.klasaId) ?? "";
      const dzial = labelMaps.dzialy.get(task.dzialId) ?? "";
      const temat = labelMaps.tematy.get(task.tematId) ?? "";
      const identifier = normalizeTaskIdentifier(task.identyfikator);
      const source = taskSourceLabel(task.zrodlo);

      return [task.kod, klasa, dzial, temat, task.typ, identifier, source]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [tasks, search, klasaId, dzialId, tematId, typ, labelMaps]);

  return (
    <aside className="edunga-panel flex h-full min-h-0 w-full flex-col p-4 lg:p-6">
      <h2 className="mb-3 text-xl font-bold edunga-text-body">
        Wybór zadań
      </h2>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Szukaj kodu, identyfikatora, źródła..."
        className="mb-3 w-full rounded-xl edunga-input p-2.5 text-sm edunga-text-body outline-none"
      />

      <div className="mb-3 grid grid-cols-2 gap-2">
        <select
          value={klasaId}
          onChange={(e) => setKlasaId(e.target.value)}
          disabled={loadingKlasy}
          className="rounded-xl edunga-input p-2.5 text-xs edunga-text-body disabled:opacity-50"
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
          onChange={(e) => setDzialId(e.target.value)}
          disabled={!klasaId || loadingDzialy}
          className="rounded-xl edunga-input p-2.5 text-xs edunga-text-body disabled:opacity-50"
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
          disabled={!dzialId || loadingTematy}
          className="rounded-xl edunga-input p-2.5 text-xs edunga-text-body disabled:opacity-50"
        >
          <option value="">Temat</option>
          {tematyDzialu.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nazwa}
            </option>
          ))}
        </select>

        <select
          value={typ}
          onChange={(e) => setTyp(e.target.value)}
          className="rounded-xl edunga-input p-2.5 text-xs edunga-text-body"
        >
          {TYP_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={onAddAnswerArea}
        className="mb-3 w-full rounded-xl border border-dashed border-zinc-600 edunga-input px-3 py-2.5 text-xs font-medium text-zinc-200 transition hover:border-yellow-400 hover:text-yellow-300"
      >
        + Dodaj pole na rozwiązanie
      </button>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {filteredTasks.length === 0 ? (
          <p className="py-8 text-center edunga-text-muted">
            Brak zadań dla wybranych filtrów.
          </p>
        ) : (
          filteredTasks.map((task) => (
            <TaskLibraryCard
              key={task.id}
              task={task}
              onAdd={onAdd}
              isAdded={addedTaskIds.has(task.id)}
            />
          ))
        )}
      </div>
    </aside>
  );
}
