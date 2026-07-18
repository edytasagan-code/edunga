"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import DocumentViewer, {
  hasAnswerContent,
  hasDocumentContent,
} from "@/app/components/document-viewer";
import FilterBar from "@/app/components/database/FilterBar";
import VariantTabs from "@/app/components/database/VariantTabs";
import {
  useCurriculum,
  useCurriculumLabels,
} from "@/app/lib/curriculum/useCurriculum";
import { useCurriculumTopics } from "@/app/lib/curriculum/useCurriculumTopics";
import { normalizeVariants } from "@/app/lib/variants";
import {
  normalizeTaskIdentifier,
  taskSourceLabel,
} from "@/app/lib/taskSource";

type Zadanie = {
  id: string;
  kod: string;
  klasaId: string;
  dzialId: string;
  tematId: string;
  mainTopicId?: string | null;
  subtopicId?: string | null;
  zagadnienie?: string | null;
  typ: string;
  poziom: number;
  punkty: number;
  czas: number;
  zrodlo?: string | null;
  identyfikator?: string | null;
  tresc: unknown;
  odpowiedz?: unknown;
  rozwiazanie?: unknown;
  warianty?: unknown;
  mainTopic?: { id: string; nazwa: string } | null;
  subtopic?: { id: string; nazwa: string } | null;
};

const TYP_LABELS: Record<string, string> = {
  otwarte: "Otwarte",
  zamkniete: "Zamknięte",
  "prawda-falsz": "Prawda / Fałsz",
  uzupelnij: "Uzupełnij",
  dobierz: "Dobierz",
  test: "Test",
};

function typLabel(typ: string): string {
  return TYP_LABELS[typ] ?? typ;
}

function difficultyStars(poziom: number): string {
  const level = Math.min(5, Math.max(0, poziom));
  return "★".repeat(level) + "☆".repeat(5 - level);
}

function MetaDivider() {
  return <span aria-hidden className="meta-divider" />;
}

function TaskCard({
  z,
  onDelete,
  klasaLabel,
  dzialLabel,
  tematLabel,
  mainTopicLabel,
  subtopicLabel,
}: {
  z: Zadanie;
  onDelete: (id: string) => void;
  klasaLabel: string;
  dzialLabel: string;
  tematLabel: string;
  mainTopicLabel: string;
  subtopicLabel: string;
}) {
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const variants = normalizeVariants(z);
  const currentVariant =
    variants[activeVariantIndex] ?? variants[0];
  const hasRozwiazanie = hasDocumentContent(
    currentVariant.rozwiazanie
  );
  const showOdpowiedz = hasAnswerContent(currentVariant.odpowiedz);

  function selectVariant(index: number) {
    setActiveVariantIndex(index);
    setSolutionOpen(false);
  }

  return (
    <article className="task-card">
      <header>
        <h2>{z.kod}</h2>

        <VariantTabs
          count={variants.length}
          activeIndex={activeVariantIndex}
          onSelect={selectVariant}
        />
      </header>

      <section className="metadata">
        <span>{mainTopicLabel}</span>
        {subtopicLabel ? (
          <>
            <MetaDivider />
            <span>{subtopicLabel}</span>
          </>
        ) : null}
        {z.zagadnienie?.trim() ? (
          <>
            <MetaDivider />
            <span>{z.zagadnienie.trim()}</span>
          </>
        ) : null}
      </section>

      <section className="source-metadata">
        <span>
          Program: <strong>{klasaLabel}</strong>
          {" · "}
          {dzialLabel}
          {" · "}
          {tematLabel}
        </span>
        <MetaDivider />
        <span>
          Źródło: <strong>{taskSourceLabel(z.zrodlo)}</strong>
        </span>
        <MetaDivider />
        <span>
          Identyfikator:{" "}
          <strong>{normalizeTaskIdentifier(z.identyfikator) || "—"}</strong>
        </span>
      </section>

      <section className="properties">
        <span>{typLabel(z.typ)}</span>
        <span aria-label={`Poziom ${z.poziom} z 5`}>
          {difficultyStars(z.poziom)}
        </span>
        <span>{z.punkty} pkt</span>
        <span>{z.czas} min</span>
      </section>

      <section className="actions">
        <Link href={`/nauczyciel/edytor/${z.id}`}>
          ✏️ Edytuj
        </Link>

        <Link href={`/nauczyciel/edytor?duplikuj=${z.id}`}>
          📄 Duplikuj
        </Link>

        <button type="button" onClick={() => onDelete(z.id)}>
          🗑 Usuń
        </button>
      </section>

      <section className="task">
        <h3>Treść zadania</h3>
        <div className="task-card-preview">
          <DocumentViewer value={currentVariant.tresc} preview />
        </div>
      </section>

      {showOdpowiedz && (
        <section className="answer">
          <h3>Odpowiedź</h3>
          <div className="task-card-preview">
            <DocumentViewer
              value={currentVariant.odpowiedz}
              preview
              compact
            />
          </div>
        </section>
      )}

      <section className="solution">
        <button
          type="button"
          className="solution-toggle"
          aria-expanded={solutionOpen}
          onClick={() => setSolutionOpen((open) => !open)}
        >
          Rozwiązanie
        </button>

        {solutionOpen &&
          (hasRozwiazanie ? (
            <div className="task-card-preview">
              <DocumentViewer
                value={currentVariant.rozwiazanie}
                preview
              />
            </div>
          ) : (
            <p className="solution-empty">Brak rozwiązania</p>
          ))}
      </section>
    </article>
  );
}

export default function TaskTable() {
  const searchParams = useSearchParams();
  const [zadania, setZadania] = useState<Zadanie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState(
    searchParams.get("zapisane") === "1"
  );
  const [typ, setTyp] = useState("");
  const [poziom, setPoziom] = useState("");
  const [zrodlo, setZrodlo] = useState("");
  const [identyfikator, setIdentyfikator] = useState("");

  const {
    klasy,
    dzialy,
    tematy,
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

  const {
    mainTopics,
    subtopics,
    mainTopicId,
    subtopicId,
    setMainTopicId,
    setSubtopicId,
    loadingMainTopics,
    loadingSubtopics,
  } = useCurriculumTopics();

  const { labels } = useCurriculumLabels();
  const [topicLabels, setTopicLabels] = useState<{
    main: Map<string, string>;
    sub: Map<string, string>;
  }>({ main: new Map(), sub: new Map() });

  useEffect(() => {
    let cancelled = false;

    async function loadTopicLabels() {
      try {
        const response = await fetch("/api/tematy-glowne");
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as Array<{
          id: string;
          nazwa: string;
          subtopics?: Array<{ id: string; nazwa: string }>;
        }>;

        if (cancelled) {
          return;
        }

        const main = new Map<string, string>();
        const sub = new Map<string, string>();

        for (const topic of data) {
          main.set(topic.id, topic.nazwa);

          for (const item of topic.subtopics ?? []) {
            sub.set(item.id, item.nazwa);
          }
        }

        setTopicLabels({ main, sub });
      } catch {
        /* ignore */
      }
    }

    void loadTopicLabels();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (searchParams.get("zapisane") !== "1") {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("zapisane");
    window.history.replaceState({}, "", url.pathname);
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/zadania");

        if (!res.ok) {
          setError("Nie udało się pobrać listy zadań.");
          return;
        }

        const data = await res.json();

        if (!Array.isArray(data)) {
          setError("Nie udało się pobrać listy zadań.");
          return;
        }

        setZadania(data);
      } catch {
        setError("Nie udało się pobrać listy zadań.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filteredZadania = useMemo(() => {
    return zadania.filter((zadanie) => {
      if (mainTopicId && zadanie.mainTopicId !== mainTopicId) {
        return false;
      }

      if (subtopicId && zadanie.subtopicId !== subtopicId) {
        return false;
      }

      if (klasaId && zadanie.klasaId !== klasaId) {
        return false;
      }

      if (dzialId && zadanie.dzialId !== dzialId) {
        return false;
      }

      if (tematId && zadanie.tematId !== tematId) {
        return false;
      }

      if (typ && zadanie.typ !== typ) {
        return false;
      }

      if (poziom && String(zadanie.poziom) !== poziom) {
        return false;
      }

      if (zrodlo && zadanie.zrodlo !== zrodlo) {
        return false;
      }

      if (identyfikator.trim()) {
        const query = identyfikator.trim().toLowerCase();
        const value = normalizeTaskIdentifier(zadanie.identyfikator).toLowerCase();

        if (!value.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [
    zadania,
    mainTopicId,
    subtopicId,
    klasaId,
    dzialId,
    tematId,
    typ,
    poziom,
    zrodlo,
    identyfikator,
  ]);

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
      <div className="rounded-lg border border-zinc-200 bg-white p-6 text-zinc-600">
        Ładowanie...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Baza zadań
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/nauczyciel/import"
            className="inline-flex items-center rounded-lg border-2 border-[#F7B500] bg-[#F7B500]/10 px-4 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-[#F7B500]/20"
          >
            Importuj PDF
          </Link>

          <Link
            href="/nauczyciel/edytor"
            className="inline-flex items-center rounded-lg bg-[#F7B500] px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#e5a800]"
          >
            + Dodaj zadanie
          </Link>
        </div>
      </div>

      <FilterBar
        mainTopics={mainTopics}
        subtopics={subtopics}
        mainTopicId={mainTopicId}
        subtopicId={subtopicId}
        loadingMainTopics={loadingMainTopics}
        loadingSubtopics={loadingSubtopics}
        onMainTopicChange={setMainTopicId}
        onSubtopicChange={setSubtopicId}
        klasy={klasy}
        dzialy={dzialy}
        tematy={tematy}
        klasaId={klasaId}
        dzialId={dzialId}
        tematId={tematId}
        typ={typ}
        poziom={poziom}
        zrodlo={zrodlo}
        identyfikator={identyfikator}
        loadingKlasy={loadingKlasy}
        loadingDzialy={loadingDzialy}
        loadingTematy={loadingTematy}
        onKlasaChange={setKlasaId}
        onDzialChange={setDzialId}
        onTematChange={setTematId}
        onTypChange={setTyp}
        onPoziomChange={setPoziom}
        onZrodloChange={setZrodlo}
        onIdentyfikatorChange={setIdentyfikator}
      />

      {saveNotice && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          Zadanie zapisane.
        </div>
      )}

      {filteredZadania.length === 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-zinc-600">
          Brak zadań dla wybranych filtrów.
        </div>
      )}

      <div className="space-y-3">
        {filteredZadania.map((z) => (
          <TaskCard
            key={z.id}
            z={z}
            onDelete={usun}
            klasaLabel={
              z.klasaId
                ? labels.klasy.get(z.klasaId)?.replace(/^Klasa\s+/i, "") ??
                  z.klasaId
                : "—"
            }
            dzialLabel={
              z.dzialId
                ? labels.dzialy.get(z.dzialId) ?? z.dzialId
                : "—"
            }
            tematLabel={
              z.tematId
                ? labels.tematy.get(z.tematId) ?? z.tematId
                : "—"
            }
            mainTopicLabel={
              z.mainTopic?.nazwa ??
              (z.mainTopicId
                ? topicLabels.main.get(z.mainTopicId) ?? z.mainTopicId
                : "Bez tematu")
            }
            subtopicLabel={
              z.subtopic?.nazwa ??
              (z.subtopicId
                ? topicLabels.sub.get(z.subtopicId) ?? z.subtopicId
                : "")
            }
          />
        ))}
      </div>
    </div>
  );
}
