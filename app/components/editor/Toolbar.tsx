"use client";

import {
  type ReactNode,
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
import "./styles.css";

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
  onConvertInkToMath?: () => void;
  onDuplicateBlocks?: () => void;
  onMoveBlocksUp?: () => void;
  onMoveBlocksDown?: () => void;
  onToggleOutline?: () => void;
  outlineVisible?: boolean;
  hasBlockSelection?: boolean;
};

type ButtonProps = {
  children: ReactNode;
  onAction?: () => void | Promise<void>;
  active?: boolean;
  title?: string;
  /** Green outline (handwriting / eraser / insert ink). */
  tool?: boolean;
  /** 2× width + darker green (convert ink → math). */
  toolWideDark?: boolean;
};

function ToolbarButton({
  children,
  onAction,
  active = false,
  title,
  tool = false,
  toolWideDark = false,
}: ButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(event) => {
        event.preventDefault();
        void onAction?.();
      }}
      className={`edunga-toolbar-btn${tool ? " edunga-toolbar-btn--tool" : ""}${
        toolWideDark ? " edunga-toolbar-btn--tool-wide-dark" : ""
      }${active ? " edunga-toolbar-btn--active" : ""}`}
    >
      <span className="edunga-toolbar-btn__label">{children}</span>
    </button>
  );
}

function ToolbarRow({ children }: { children: ReactNode }) {
  return <div className="edunga-editor-toolbar__row">{children}</div>;
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
  onConvertInkToMath,
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

  const items: ReactNode[] = [
    <ToolbarButton
      key="fx"
      title="Wstaw formułę matematyczną"
      onAction={async () => {
        await onInsertMath();
      }}
    >
      fx
    </ToolbarButton>,
    <ToolbarButton
      key="keyboard"
      title="Klawiatura matematyczna"
      active={keyboardVisible}
      onAction={async () => {
        await ensureMathFocus();
        toggleVirtualKeyboard();
      }}
    >
      ⌨
    </ToolbarButton>,
    <ToolbarButton
      key="image"
      title="Wstaw obraz"
      onAction={onInsertImage}
    >
      🖼
    </ToolbarButton>,
  ];

  if (hasSelectedImage) {
    items.push(
      <ToolbarButton
        key="img-left"
        title="Wyrównaj do lewej"
        active={selectedImageAlign === "left"}
        onAction={() => onAlignImage?.("left")}
      >
        ⬅
      </ToolbarButton>,
      <ToolbarButton
        key="img-center"
        title="Wyśrodkuj"
        active={selectedImageAlign === "center"}
        onAction={() => onAlignImage?.("center")}
      >
        ↔
      </ToolbarButton>,
      <ToolbarButton
        key="img-right"
        title="Wyrównaj do prawej"
        active={selectedImageAlign === "right"}
        onAction={() => onAlignImage?.("right")}
      >
        ➡
      </ToolbarButton>,
      <ToolbarButton
        key="img-replace"
        title="Zamień obraz"
        onAction={() => onReplaceImage?.()}
      >
        ↻
      </ToolbarButton>
    );
  }

  items.push(
    <ToolbarButton
      key="select"
      title="Tryb zaznaczania"
      active={editorMode === "select"}
      onAction={() => onEditorModeChange?.("select")}
    >
      ↖
    </ToolbarButton>,
    <ToolbarButton
      key="pen"
      title="Tryb pisania odręcznego"
      active={editorMode === "pen"}
      tool
      onAction={() => onEditorModeChange?.("pen")}
    >
      ✎
    </ToolbarButton>,
    <ToolbarButton
      key="eraser"
      title="Gumka — usuń całą kreskę"
      active={editorMode === "eraser"}
      tool
      onAction={() => onEditorModeChange?.("eraser")}
    >
      🧹
    </ToolbarButton>,
    <ToolbarButton
      key="ink-insert"
      title="Wstaw pole odręczne"
      tool
      onAction={() => {
        onEditorModeChange?.("pen");
        onInsertInk?.();
      }}
    >
      ✎+
    </ToolbarButton>
  );

  if (editorMode === "pen" || hasSelectedInk) {
    for (const { label, color } of INK_PALETTE) {
      items.push(
        <button
          key={`ink-color-${color}`}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={inkColor === color}
          className={`edunga-toolbar-btn edunga-toolbar-btn--swatch${
            inkColor === color ? " edunga-toolbar-btn--active" : ""
          }`}
          style={{ backgroundColor: color }}
          onMouseDown={(event) => {
            event.preventDefault();
            onInkColorChange?.(color);
          }}
        />
      );
    }
  }

  if (hasSelectedInk) {
    items.push(
      <ToolbarButton
        key="ink-left"
        title="Wyrównaj do lewej"
        active={selectedInkAlign === "left"}
        onAction={() => onAlignInk?.("left")}
      >
        ⬅
      </ToolbarButton>,
      <ToolbarButton
        key="ink-center"
        title="Wyśrodkuj"
        active={selectedInkAlign === "center"}
        onAction={() => onAlignInk?.("center")}
      >
        ↔
      </ToolbarButton>,
      <ToolbarButton
        key="ink-right"
        title="Wyrównaj do prawej"
        active={selectedInkAlign === "right"}
        onAction={() => onAlignInk?.("right")}
      >
        ➡
      </ToolbarButton>
    );
  }

  items.push(
    <ToolbarButton
      key="ink-to-math"
      title="Napisz pismo odręczne i wstaw jako matematykę"
      toolWideDark
      onAction={() => onConvertInkToMath?.()}
    >
      ✎→fx
    </ToolbarButton>,
    <ToolbarButton
      key="dup"
      title="Duplikuj blok (Ctrl+D)"
      onAction={() => onDuplicateBlocks?.()}
    >
      ⧉
    </ToolbarButton>,
    <ToolbarButton
      key="up"
      title="Przesuń blok wyżej (Alt+↑)"
      onAction={() => onMoveBlocksUp?.()}
    >
      ↑
    </ToolbarButton>,
    <ToolbarButton
      key="down"
      title="Przesuń blok niżej (Alt+↓)"
      onAction={() => onMoveBlocksDown?.()}
    >
      ↓
    </ToolbarButton>,
    <ToolbarButton
      key="outline"
      title="Spis bloków"
      active={outlineVisible}
      onAction={() => onToggleOutline?.()}
    >
      ≡
    </ToolbarButton>,
    <ToolbarButton
      key="frac"
      title="Ułamek"
      onAction={() =>
        runMathAction((root) => insertMathTemplate("frac", root))
      }
    >
      □/□
    </ToolbarButton>,
    <ToolbarButton
      key="sqrt"
      title="Pierwiastek"
      onAction={() =>
        runMathAction((root) => insertMathTemplate("sqrt", root))
      }
    >
      √
    </ToolbarButton>,
    <ToolbarButton
      key="x2"
      title="Potęga 2"
      onAction={() =>
        runMathAction((root) =>
          insertMathTemplate("superscript", root)
        )
      }
    >
      x²
    </ToolbarButton>,
    <ToolbarButton
      key="xn"
      title="Wykładnik"
      onAction={() =>
        runMathAction((root) =>
          insertMathTemplate("exponent", root)
        )
      }
    >
      xⁿ
    </ToolbarButton>,
    <ToolbarButton
      key="sub"
      title="Indeks dolny"
      onAction={() =>
        runMathAction((root) => insertLatex("_{#0}", root))
      }
    >
      xₙ
    </ToolbarButton>,
    <ToolbarButton
      key="log"
      title="Logarytm"
      onAction={() =>
        runMathAction((root) => insertMathTemplate("log", root))
      }
    >
      log
    </ToolbarButton>,
    <ToolbarButton
      key="ln"
      title="Logarytm naturalny"
      onAction={() =>
        runMathAction((root) => insertMathTemplate("ln", root))
      }
    >
      ln
    </ToolbarButton>,
    <ToolbarButton
      key="paren"
      title="Nawias okrągły"
      onAction={() =>
        runMathAction((root) => insertMathTemplate("paren", root))
      }
    >
      ( )
    </ToolbarButton>,
    <ToolbarButton
      key="bracket"
      title="Nawias kwadratowy"
      onAction={() =>
        runMathAction((root) => insertMathTemplate("bracket", root))
      }
    >
      [ ]
    </ToolbarButton>,
    <ToolbarButton
      key="brace"
      title="Nawias klamrowy"
      onAction={() =>
        runMathAction((root) => insertMathTemplate("brace", root))
      }
    >
      {"{}"}
    </ToolbarButton>,
    <ToolbarButton
      key="pi"
      title="Pi"
      onAction={() =>
        runMathAction((root) => insertMathTemplate("pi", root))
      }
    >
      π
    </ToolbarButton>,
    <ToolbarButton
      key="delta"
      title="Delta"
      onAction={() =>
        runMathAction((root) => insertLatex("\\Delta", root))
      }
    >
      Δ
    </ToolbarButton>,
    <ToolbarButton
      key="le"
      title="Mniejsze lub równe"
      onAction={() =>
        runMathAction((root) => insertMathTemplate("le", root))
      }
    >
      ≤
    </ToolbarButton>,
    <ToolbarButton
      key="ge"
      title="Większe lub równe"
      onAction={() =>
        runMathAction((root) => insertMathTemplate("ge", root))
      }
    >
      ≥
    </ToolbarButton>,
    <ToolbarButton
      key="ne"
      title="Różne od"
      onAction={() =>
        runMathAction((root) => insertLatex("\\ne", root))
      }
    >
      ≠
    </ToolbarButton>,
    <ToolbarButton
      key="in"
      title="Należy do"
      onAction={() =>
        runMathAction((root) => insertMathSymbol("in", root))
      }
    >
      ∈
    </ToolbarButton>,
    <ToolbarButton
      key="notin"
      title="Nie należy do"
      onAction={() =>
        runMathAction((root) => insertMathSymbol("notin", root))
      }
    >
      ∉
    </ToolbarButton>,
    <ToolbarButton
      key="subset"
      title="Podzbiór"
      onAction={() =>
        runMathAction((root) => insertMathSymbol("subset", root))
      }
    >
      ⊂
    </ToolbarButton>,
    <ToolbarButton
      key="cup"
      title="Suma zbiorów"
      onAction={() =>
        runMathAction((root) => insertMathSymbol("cup", root))
      }
    >
      ∪
    </ToolbarButton>,
    <ToolbarButton
      key="cap"
      title="Część wspólna"
      onAction={() =>
        runMathAction((root) => insertMathSymbol("cap", root))
      }
    >
      ∩
    </ToolbarButton>,
    <ToolbarButton
      key="pm"
      title="Plus-minus"
      onAction={() =>
        runMathAction((root) => insertMathSymbol("pm", root))
      }
    >
      ±
    </ToolbarButton>,
    <ToolbarButton
      key="infty"
      title="Nieskończoność"
      onAction={() =>
        runMathAction((root) => insertMathSymbol("infty", root))
      }
    >
      ∞
    </ToolbarButton>
  );

  const splitAt = Math.ceil(items.length / 2);

  return (
    <div
      className="edunga-editor-toolbar"
      role="toolbar"
      aria-label="Narzędzia edytora"
    >
      <ToolbarRow>{items.slice(0, splitAt)}</ToolbarRow>
      <ToolbarRow>{items.slice(splitAt)}</ToolbarRow>
      <p
        className="edunga-editor-shortcuts-help"
        title="Skróty: Alt+↑/↓ przesuń blok, Ctrl+D duplikuj, Ctrl+G przejdź, Shift+klik zaznacz zakres"
      >
        {hasBlockSelection ? "Zaznaczone bloki" : "Alt+↑/↓ · Ctrl+D · Ctrl+G"}
      </p>
    </div>
  );
}
