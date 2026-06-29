type Props = {
  variant?: "full" | "compact";
  onInsert?: (text: string) => void;
};

type Button = {
  text: string;
  value: string;
};

const full: Button[] = [
  { text: "𝐁", value: "**" },
  { text: "𝐼", value: "*" },
  { text: "𝑈", value: "__" },

  { text: "√", value: "\\sqrt{}" },
  { text: "³√", value: "\\sqrt[3]{}" },
  { text: "ⁿ√", value: "\\sqrt[n]{}" },

  { text: "□²", value: "^2" },
  { text: "□³", value: "^3" },
  { text: "□ⁿ", value: "^{}" },

  { text: "a/b", value: "\\frac{}{}" },

  { text: "log", value: "\\log" },
  { text: "logₐ", value: "\\log_{}" },
  { text: "ln", value: "\\ln" },

  { text: "π", value: "\\pi" },
  { text: "e", value: "e" },
  { text: "∞", value: "\\infty" },

  { text: "≤", value: "\\le" },
  { text: "≥", value: "\\ge" },
  { text: "≠", value: "\\neq" },
  { text: "≈", value: "\\approx" },
  { text: "±", value: "\\pm" },

  { text: "∈", value: "\\in" },
  { text: "∩", value: "\\cap" },
  { text: "∪", value: "\\cup" },

  { text: "ℝ", value: "\\mathbb{R}" },
  { text: "ℕ", value: "\\mathbb{N}" },
  { text: "ℤ", value: "\\mathbb{Z}" },
  { text: "ℚ", value: "\\mathbb{Q}" },

  { text: "(a;b)", value: "(;)" },
  { text: "[a;b]", value: "[;]" },
  { text: "(a;b]", value: "(;]" },
  { text: "[a;b)", value: "[;)" },

  { text: "Σ", value: "\\sum" },
  { text: "∫", value: "\\int" },

  { text: "📈", value: "" },
  { text: "🖼", value: "" },
  { text: "📋", value: "" },
];

const compact = full.slice(3, 17);

export default function EditorToolbar({
  variant = "full",
  onInsert,
}: Props) {
  const buttons = variant === "full" ? full : compact;

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {buttons.map((button) => (
        <button
          key={button.text}
          type="button"
          onClick={() => onInsert?.(button.value)}
          className="flex h-11 min-w-11 items-center justify-center rounded-lg border border-zinc-600 bg-zinc-800 px-3 text-white transition hover:bg-yellow-400 hover:text-black"
        >
          {button.text}
        </button>
      ))}
    </div>
  );
}