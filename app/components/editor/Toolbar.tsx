"use client";

import {
  type RefObject,
  useEffect,
  useState,
} from "react";

import {
  insertLatex,
  insertMathSymbol,
  insertMathTemplate,
  toggleVirtualKeyboard,
} from "./commands";
import type { ImageAlign } from "./types";
import { INK_PALETTE } from "./core/inkStrokeUtils";

type EditorMode = "select" | "pen" | "eraser";

type Props = {
  editorRoot: RefObject<HTMLDivElement | null>;
  onInsertMath: () => Promise<string | null>;
  ensureMathFocus: () => Promise<void>;
  onInsertImage: () => void;
  onReplaceImage?: () => void;
  onAlignImage?: (align: ImageAlign) => void;
  hasSelectedImage?: boolean;
  selectedImageAlign?: ImageAlign;
  editorMode?: EditorMode;
  onEditorModeChange?: (mode: EditorMode) => void;
  inkColor?: string;
  onInkColorChange?: (color: string) => void;
  onInsertInk?: () => void;
  onAlignInk?: (align: ImageAlign) => void;
  hasSelectedInk?: boolean;
  selectedInkAlign?: ImageAlign;
  onDuplicateBlocks?: () => void;
  onMoveBlocksUp?: () => void;
  onMoveBlocksDown?: () => void;
  onToggleOutline?: () => void;
  outlineVisible?: boolean;
  hasBlockSelection?: boolean;
};

type ButtonProps = {
  children: React.ReactNode;
  onAction?: () => void | Promise<void>;
  active?: boolean;
  title?: string;
};

function ToolbarButton({
  children,
  onAction,
  active = false,
  title,
}: ButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(event) => {
        event.preventDefault();
        void onAction?.();
      }}
      className={`
        rounded px-2 py-1 text-sm text-white
        ${
          active
            ? "bg-yellow-500 text-black"
            : "bg-zinc-700 hover:bg-zinc-600"
        }
      `}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return (
    <div
      className="mx-1 h-6 w-px bg-zinc-600"
      aria-hidden
    />
  );
}

export default function Toolbar({
  editorRoot,
  onInsertMath,
  ensureMathFocus,
  onInsertImage,
  onReplaceImage,
  onAlignImage,
  hasSelectedImage = false,
  selectedImageAlign = "left",
  editorMode = "select",
  onEditorModeChange,
  inkColor = INK_PALETTE[0].color,
  onInkColorChange,
  onInsertInk,
  onAlignInk,
  hasSelectedInk = false,
  selectedInkAlign = "left",
  onDuplicateBlocks,
  onMoveBlocksUp,
  onMoveBlocksDown,
  onToggleOutline,
  outlineVisible = false,
  hasBlockSelection = false,
}: Props) {
  const [keyboardVisible, setKeyboardVisible] =
    useState(false);

  useEffect(() => {
    const keyboard = window.mathVirtualKeyboard;

    if (!keyboard) {
      return;
    }

    const sync = () => {
      setKeyboardVisible(keyboard.visible);
    };

    sync();
    keyboard.addEventListener(
      "virtual-keyboard-toggle",
      sync
    );

    return () => {
      keyboard.removeEventListener(
        "virtual-keyboard-toggle",
        sync
      );
    };
  }, []);

  async function runMathAction(
    action: (root: HTMLDivElement | null) => boolean | void
  ) {
    await ensureMathFocus();
    action(editorRoot.current);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-700 bg-zinc-800 p-2">
      <ToolbarButton
        title="Wstaw formułę matematyczną"
        onAction={async () => {
          await onInsertMath();
        }}
      >
        fx
      </ToolbarButton>

      <ToolbarButton
        title="Klawiatura matematyczna"
        active={keyboardVisible}
        onAction={async () => {
          await ensureMathFocus();
          toggleVirtualKeyboard();
        }}
      >
        ⌨
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        title="Wstaw obraz"
        onAction={onInsertImage}
      >
        🖼
      </ToolbarButton>

      {hasSelectedImage ? (
        <>
          <ToolbarButton
            title="Wyrównaj do lewej"
            active={selectedImageAlign === "left"}
            onAction={() => onAlignImage?.("left")}
          >
            ⬅
          </ToolbarButton>

          <ToolbarButton
            title="Wyśrodkuj"
            active={selectedImageAlign === "center"}
            onAction={() => onAlignImage?.("center")}
          >
            ↔
          </ToolbarButton>

          <ToolbarButton
            title="Wyrównaj do prawej"
            active={selectedImageAlign === "right"}
            onAction={() => onAlignImage?.("right")}
          >
            ➡
          </ToolbarButton>

          <ToolbarButton
            title="Zamień obraz"
            onAction={() => onReplaceImage?.()}
          >
            ↻
          </ToolbarButton>
        </>
      ) : null}

      <ToolbarDivider />

      <ToolbarButton
        title="Tryb zaznaczania"
        active={editorMode === "select"}
        onAction={() => onEditorModeChange?.("select")}
      >
        ↖
      </ToolbarButton>

      <ToolbarButton
        title="Tryb pisania odręcznego"
        active={editorMode === "pen"}
        onAction={() => onEditorModeChange?.("pen")}
      >
        ✎
      </ToolbarButton>

      <ToolbarButton
        title="Gumka — usuń całą kreskę"
        active={editorMode === "eraser"}
        onAction={() => onEditorModeChange?.("eraser")}
      >
        🧹
      </ToolbarButton>

      {editorMode === "pen" || hasSelectedInk ? (
        <div
          className="edunga-ink-color-palette"
          role="group"
          aria-label="Kolor pisaka"
        >
          {INK_PALETTE.map(({ label, color }) => (
            <button
              key={color}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={inkColor === color}
              className={`edunga-ink-color-swatch${
                inkColor === color ? " is-active" : ""
              }`}
              style={{ backgroundColor: color }}
              onMouseDown={(event) => {
                event.preventDefault();
                onInkColorChange?.(color);
              }}
            />
          ))}
        </div>
      ) : null}

      <ToolbarButton
        title="Wstaw pole odręczne"
        onAction={() => {
          onEditorModeChange?.("pen");
          onInsertInk?.();
        }}
      >
        ✎+
      </ToolbarButton>

      {hasSelectedInk ? (
        <>
          <ToolbarButton
            title="Wyrównaj do lewej"
            active={selectedInkAlign === "left"}
            onAction={() => onAlignInk?.("left")}
          >
            ⬅
          </ToolbarButton>

          <ToolbarButton
            title="Wyśrodkuj"
            active={selectedInkAlign === "center"}
            onAction={() => onAlignInk?.("center")}
          >
            ↔
          </ToolbarButton>

          <ToolbarButton
            title="Wyrównaj do prawej"
            active={selectedInkAlign === "right"}
            onAction={() => onAlignInk?.("right")}
          >
            ➡
          </ToolbarButton>
        </>
      ) : null}

      <ToolbarDivider />

      <ToolbarButton
        title="Duplikuj blok (Ctrl+D)"
        onAction={() => onDuplicateBlocks?.()}
      >
        ⧉
      </ToolbarButton>

      <ToolbarButton
        title="Przesuń blok wyżej (Alt+↑)"
        onAction={() => onMoveBlocksUp?.()}
      >
        ↑
      </ToolbarButton>

      <ToolbarButton
        title="Przesuń blok niżej (Alt+↓)"
        onAction={() => onMoveBlocksDown?.()}
      >
        ↓
      </ToolbarButton>

      <ToolbarButton
        title="Spis bloków"
        active={outlineVisible}
        onAction={() => onToggleOutline?.()}
      >
        ≡
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        title="Ułamek"
        onAction={() =>
          runMathAction((root) =>
            insertMathTemplate("frac", root)
          )
        }
      >
        □/□
      </ToolbarButton>

      <ToolbarButton
        title="Pierwiastek"
        onAction={() =>
          runMathAction((root) =>
            insertMathTemplate("sqrt", root)
          )
        }
      >
        √
      </ToolbarButton>

      <ToolbarButton
        title="Potęga 2"
        onAction={() =>
          runMathAction((root) =>
            insertMathTemplate("superscript", root)
          )
        }
      >
        x²
      </ToolbarButton>

      <ToolbarButton
        title="Wykładnik"
        onAction={() =>
          runMathAction((root) =>
            insertMathTemplate("exponent", root)
          )
        }
      >
        xⁿ
      </ToolbarButton>

      <ToolbarButton
        title="Indeks dolny"
        onAction={() =>
          runMathAction((root) =>
            insertLatex("_{#0}", root)
          )
        }
      >
        xₙ
      </ToolbarButton>

      <ToolbarButton
        title="Logarytm"
        onAction={() =>
          runMathAction((root) =>
            insertMathTemplate("log", root)
          )
        }
      >
        log
      </ToolbarButton>

      <ToolbarButton
        title="Logarytm naturalny"
        onAction={() =>
          runMathAction((root) =>
            insertMathTemplate("ln", root)
          )
        }
      >
        ln
      </ToolbarButton>

      <ToolbarButton
        title="Nawias okrągły"
        onAction={() =>
          runMathAction((root) =>
            insertMathTemplate("paren", root)
          )
        }
      >
        ( )
      </ToolbarButton>

      <ToolbarButton
        title="Nawias kwadratowy"
        onAction={() =>
          runMathAction((root) =>
            insertMathTemplate("bracket", root)
          )
        }
      >
        [ ]
      </ToolbarButton>

      <ToolbarButton
        title="Nawias klamrowy"
        onAction={() =>
          runMathAction((root) =>
            insertMathTemplate("brace", root)
          )
        }
      >
        {"{}"}
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        title="Pi"
        onAction={() =>
          runMathAction((root) =>
            insertMathTemplate("pi", root)
          )
        }
      >
        π
      </ToolbarButton>

      <ToolbarButton
        title="Delta"
        onAction={() =>
          runMathAction((root) =>
            insertLatex("\\Delta", root)
          )
        }
      >
        Δ
      </ToolbarButton>

      <ToolbarButton
        title="Mniejsze lub równe"
        onAction={() =>
          runMathAction((root) =>
            insertMathTemplate("le", root)
          )
        }
      >
        ≤
      </ToolbarButton>

      <ToolbarButton
        title="Większe lub równe"
        onAction={() =>
          runMathAction((root) =>
            insertMathTemplate("ge", root)
          )
        }
      >
        ≥
      </ToolbarButton>

      <ToolbarButton
        title="Różne od"
        onAction={() =>
          runMathAction((root) =>
            insertLatex("\\ne", root)
          )
        }
      >
        ≠
      </ToolbarButton>

      <ToolbarButton
        title="Należy do"
        onAction={() =>
          runMathAction((root) =>
            insertMathSymbol("in", root)
          )
        }
      >
        ∈
      </ToolbarButton>

      <ToolbarButton
        title="Nie należy do"
        onAction={() =>
          runMathAction((root) =>
            insertMathSymbol("notin", root)
          )
        }
      >
        ∉
      </ToolbarButton>

      <ToolbarButton
        title="Podzbiór"
        onAction={() =>
          runMathAction((root) =>
            insertMathSymbol("subset", root)
          )
        }
      >
        ⊂
      </ToolbarButton>

      <ToolbarButton
        title="Suma zbiorów"
        onAction={() =>
          runMathAction((root) =>
            insertMathSymbol("cup", root)
          )
        }
      >
        ∪
      </ToolbarButton>

      <ToolbarButton
        title="Część wspólna"
        onAction={() =>
          runMathAction((root) =>
            insertMathSymbol("cap", root)
          )
        }
      >
        ∩
      </ToolbarButton>

      <ToolbarButton
        title="Plus-minus"
        onAction={() =>
          runMathAction((root) =>
            insertMathSymbol("pm", root)
          )
        }
      >
        ±
      </ToolbarButton>

      <ToolbarButton
        title="Nieskończoność"
        onAction={() =>
          runMathAction((root) =>
            insertMathSymbol("infty", root)
          )
        }
      >
        ∞
      </ToolbarButton>

      <span
        className="edunga-editor-shortcuts-help"
        title="Skróty: Alt+↑/↓ przesuń blok, Ctrl+D duplikuj, Ctrl+G przejdź, Shift+klik zaznacz zakres"
      >
        {hasBlockSelection ? "Zaznaczone bloki" : "Alt+↑/↓ · Ctrl+D · Ctrl+G"}
      </span>
    </div>
  );
}
