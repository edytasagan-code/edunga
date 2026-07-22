import { TASK_SOURCE_OPTIONS } from "@/app/lib/taskSource";

type KlasaOption = {
  id: string;
  nazwa: string;
};

type DzialOption = {
  id: string;
  nazwa: string;
};

type TematOption = {
  id: string;
  nazwa: string;
};

type TopicOption = {
  id: string;
  nazwa: string;
};

const TYP_OPTIONS = [
  { value: "", label: "Typ" },
  { value: "otwarte", label: "Otwarte" },
  { value: "wybor-wielokrotny", label: "Wielokrotny wybór" },
  { value: "zamkniete", label: "Zamknięte" },
  { value: "prawda-falsz", label: "Prawda / Fałsz" },
  { value: "uzupelnij", label: "Uzupełnij" },
  { value: "dobierz", label: "Dobierz" },
  { value: "test", label: "Test" },
];

const POZIOM_OPTIONS = [
  { value: "", label: "Poziom" },
  { value: "1", label: "★☆☆☆☆" },
  { value: "2", label: "★★☆☆☆" },
  { value: "3", label: "★★★☆☆" },
  { value: "4", label: "★★★★☆" },
  { value: "5", label: "★★★★★" },
];

type Props = {
  mainTopics: TopicOption[];
  subtopics: TopicOption[];
  mainTopicId: string;
  subtopicId: string;
  loadingMainTopics?: boolean;
  loadingSubtopics?: boolean;
  onMainTopicChange: (value: string) => void;
  onSubtopicChange: (value: string) => void;
  klasy: KlasaOption[];
  dzialy: DzialOption[];
  tematy: TematOption[];
  klasaId: string;
  dzialId: string;
  tematId: string;
  typ: string;
  poziom: string;
  zrodlo: string;
  identyfikator: string;
  loadingKlasy?: boolean;
  loadingDzialy?: boolean;
  loadingTematy?: boolean;
  onKlasaChange: (value: string) => void;
  onDzialChange: (value: string) => void;
  onTematChange: (value: string) => void;
  onTypChange: (value: string) => void;
  onPoziomChange: (value: string) => void;
  onZrodloChange: (value: string) => void;
  onIdentyfikatorChange: (value: string) => void;
};

export default function FilterBar({
  mainTopics,
  subtopics,
  mainTopicId,
  subtopicId,
  loadingMainTopics = false,
  loadingSubtopics = false,
  onMainTopicChange,
  onSubtopicChange,
  klasy,
  dzialy,
  tematy,
  klasaId,
  dzialId,
  tematId,
  typ,
  poziom,
  zrodlo,
  identyfikator,
  loadingKlasy = false,
  loadingDzialy = false,
  loadingTematy = false,
  onKlasaChange,
  onDzialChange,
  onTematChange,
  onTypChange,
  onPoziomChange,
  onZrodloChange,
  onIdentyfikatorChange,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        <select
          value={mainTopicId}
          onChange={(e) => onMainTopicChange(e.target.value)}
          disabled={loadingMainTopics}
          className="edunga-input rounded-xl p-3 disabled:opacity-50"
          aria-label="Temat główny"
        >
          <option value="">Temat główny</option>
          {mainTopics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.nazwa}
            </option>
          ))}
        </select>

        <select
          value={subtopicId}
          onChange={(e) => onSubtopicChange(e.target.value)}
          disabled={!mainTopicId || loadingSubtopics}
          className="edunga-input rounded-xl p-3 disabled:opacity-50"
          aria-label="Podtemat"
        >
          <option value="">Podtemat</option>
          {subtopics.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.nazwa}
            </option>
          ))}
        </select>

        <select
          value={typ}
          onChange={(e) => onTypChange(e.target.value)}
          className="edunga-input rounded-xl p-3"
        >
          {TYP_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={poziom}
          onChange={(e) => onPoziomChange(e.target.value)}
          className="edunga-input rounded-xl p-3"
        >
          {POZIOM_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={zrodlo}
          onChange={(e) => onZrodloChange(e.target.value)}
          className="edunga-input rounded-xl p-3"
        >
          <option value="">Źródło</option>
          {TASK_SOURCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={identyfikator}
          onChange={(e) => onIdentyfikatorChange(e.target.value)}
          placeholder="Identyfikator (np. 1.39)"
          className="edunga-input rounded-xl p-3 placeholder:text-[var(--edunga-muted)]"
        />
      </div>

      <details className="rounded-xl border border-[var(--edunga-border, #e4e4e7)] bg-transparent">
        <summary className="cursor-pointer select-none px-3 py-2 text-sm text-[var(--edunga-muted,#71717a)]">
          Program źródłowy (Klasa / Dział / Temat — Pazdro)
        </summary>
        <div className="grid grid-cols-2 gap-4 px-3 pb-3 md:grid-cols-3">
          <select
            value={klasaId}
            onChange={(e) => onKlasaChange(e.target.value)}
            disabled={loadingKlasy}
            className="edunga-input rounded-xl p-3 disabled:opacity-50"
          >
            <option value="">Klasa</option>
            {klasy.map((klasa) => (
              <option key={klasa.id} value={klasa.id}>
                {klasa.nazwa}
              </option>
            ))}
          </select>

          <select
            value={dzialId}
            onChange={(e) => onDzialChange(e.target.value)}
            disabled={!klasaId || loadingDzialy}
            className="edunga-input rounded-xl p-3 disabled:opacity-50"
          >
            <option value="">Dział</option>
            {dzialy.map((dzial) => (
              <option key={dzial.id} value={dzial.id}>
                {dzial.nazwa}
              </option>
            ))}
          </select>

          <select
            value={tematId}
            onChange={(e) => onTematChange(e.target.value)}
            disabled={!dzialId || loadingTematy}
            className="edunga-input rounded-xl p-3 disabled:opacity-50"
          >
            <option value="">Temat (Pazdro)</option>
            {tematy.map((temat) => (
              <option key={temat.id} value={temat.id}>
                {temat.nazwa}
              </option>
            ))}
          </select>
        </div>
      </details>
    </div>
  );
}
