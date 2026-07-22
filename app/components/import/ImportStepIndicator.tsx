import type { ImportStep } from "@/app/lib/import/types";

const STEPS: Array<{ id: ImportStep; label: string }> = [
  { id: "upload", label: "PDF" },
  { id: "ocr", label: "OCR" },
  { id: "parse", label: "Matematyka" },
  { id: "preview", label: "Podgląd" },
  { id: "edit", label: "Edycja" },
  { id: "saved", label: "Zapis" },
];

const ACTIVE_ORDER: ImportStep[] = [
  "upload",
  "ocr",
  "parse",
  "preview",
  "edit",
  "saved",
];

type Props = {
  current: ImportStep;
};

export default function ImportStepIndicator({ current }: Props) {
  const currentIndex = ACTIVE_ORDER.indexOf(current);

  return (
    <ol className="import-steps">
      {STEPS.map((step, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = step.id === current;

        return (
          <li
            key={step.id}
            className={[
              "import-steps__item",
              isComplete ? "import-steps__item--complete" : "",
              isCurrent ? "import-steps__item--current" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="import-steps__index">{index + 1}</span>
            <span className="import-steps__label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
