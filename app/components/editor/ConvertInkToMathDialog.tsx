"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

import type { InkPoint, InkStroke } from "./types";
import {
  findStrokeIndexAtPoint,
  pointsToSvgPath,
} from "./core/inkStrokeUtils";

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 280;
/** Wait until writing pauses — ONNX on the main thread must not fight the pen. */
const RECOGNIZE_DEBOUNCE_MS = 650;

type CanvasTool = "pen" | "eraser";

type Props = {
  open: boolean;
  onAccept: (latex: string) => void;
  onCancel: () => void;
};

function clientToCanvasPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): InkPoint {
  const rect = svg.getBoundingClientRect();
  const x = ((clientX - rect.left) / Math.max(1, rect.width)) * CANVAS_WIDTH;
  const y = ((clientY - rect.top) / Math.max(1, rect.height)) * CANVAS_HEIGHT;
  return {
    x: Math.max(0, Math.min(CANVAS_WIDTH, x)),
    y: Math.max(0, Math.min(CANVAS_HEIGHT, y)),
  };
}

export default function ConvertInkToMathDialog({
  open,
  onAccept,
  onCancel,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const livePathRef = useRef<SVGPathElement>(null);
  const drawingRef = useRef<{
    pointerId: number;
    stroke: InkStroke;
  } | null>(null);
  const recognizeTimerRef = useRef<number | null>(null);
  const recognizeSeqRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [tool, setTool] = useState<CanvasTool>("pen");
  const [latex, setLatex] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const strokesRef = useRef<InkStroke[]>([]);
  const erasingRef = useRef<{ pointerId: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    setStrokes([]);
    strokesRef.current = [];
    setTool("pen");
    setLatex("");
    setLoading(false);
    setError(null);
    drawingRef.current = null;
    erasingRef.current = null;
    if (livePathRef.current) {
      livePathRef.current.setAttribute("d", "");
    }

    // Warm the engine only after paint, so opening the dialog stays snappy.
    const warmId = window.setTimeout(() => {
      void import("@/app/lib/ink-hwr/engine")
        .then(({ getMathHwrEngine }) => getMathHwrEngine())
        .catch(() => {
          // Errors surface on first recognition.
        });
    }, 400);

    return () => window.clearTimeout(warmId);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  const runRecognition = useCallback(async (nextStrokes: InkStroke[]) => {
    if (nextStrokes.length === 0) {
      setLatex("");
      setError(null);
      setLoading(false);
      return;
    }

    const seq = ++recognizeSeqRef.current;
    setLoading(true);
    setError(null);

    try {
      const { recognizeInkStrokesToLatex } = await import(
        "@/app/lib/ink-hwr/engine"
      );
      const result = await recognizeInkStrokesToLatex(nextStrokes);
      if (seq !== recognizeSeqRef.current) {
        return;
      }
      setLatex(result.latex);
      setError(null);
    } catch (err) {
      if (seq !== recognizeSeqRef.current) {
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : "Nie udało się rozpoznać pisma."
      );
    } finally {
      if (seq === recognizeSeqRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const scheduleRecognition = useCallback(
    (nextStrokes: InkStroke[]) => {
      if (recognizeTimerRef.current !== null) {
        window.clearTimeout(recognizeTimerRef.current);
      }

      recognizeTimerRef.current = window.setTimeout(() => {
        recognizeTimerRef.current = null;
        void runRecognition(nextStrokes);
      }, RECOGNIZE_DEBOUNCE_MS);
    },
    [runRecognition]
  );

  useEffect(() => {
    return () => {
      if (recognizeTimerRef.current !== null) {
        window.clearTimeout(recognizeTimerRef.current);
      }
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const livePointsRef = useRef<InkPoint[] | null>(null);

  function updateLivePath(points: InkPoint[]) {
    const path = livePathRef.current;
    if (!path) {
      return;
    }
    path.setAttribute("d", pointsToSvgPath(points));
  }

  function scheduleLivePathUpdate(points: InkPoint[]) {
    livePointsRef.current = points;
    if (rafRef.current !== null) {
      return;
    }
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const latest = livePointsRef.current;
      if (latest) {
        updateLivePath(latest);
      }
    });
  }

  function cancelPendingRecognition() {
    if (recognizeTimerRef.current !== null) {
      window.clearTimeout(recognizeTimerRef.current);
      recognizeTimerRef.current = null;
    }
    // Invalidate in-flight ONNX results so they cannot update UI mid-stroke.
    recognizeSeqRef.current += 1;
    setLoading(false);
  }

  const previewHtml = useMemo(() => {
    if (!latex.trim()) {
      return null;
    }

    try {
      return katex.renderToString(latex, {
        throwOnError: true,
        displayMode: true,
      });
    } catch {
      return null;
    }
  }, [latex]);

  function eraseStrokeAt(clientX: number, clientY: number): boolean {
    const svg = svgRef.current;
    if (!svg) {
      return false;
    }

    const point = clientToCanvasPoint(svg, clientX, clientY);
    const current = strokesRef.current;
    const index = findStrokeIndexAtPoint(current, point, 16);

    if (index === -1) {
      return false;
    }

    strokesRef.current = current.filter((_, i) => i !== index);
    return true;
  }

  function commitStrokesFromRef() {
    setStrokes([...strokesRef.current]);
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    event.preventDefault();
    cancelPendingRecognition();

    if (tool === "eraser") {
      eraseStrokeAt(event.clientX, event.clientY);
      erasingRef.current = { pointerId: event.pointerId };
      svg.setPointerCapture(event.pointerId);
      return;
    }

    const point = clientToCanvasPoint(svg, event.clientX, event.clientY);
    const stroke: InkStroke = {
      points: [point],
      color: "#1e293b",
      width: 2,
    };

    drawingRef.current = {
      pointerId: event.pointerId,
      stroke,
    };
    updateLivePath(stroke.points);
    svg.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const erasing = erasingRef.current;
    if (erasing && erasing.pointerId === event.pointerId) {
      eraseStrokeAt(event.clientX, event.clientY);
      return;
    }

    const drawing = drawingRef.current;
    if (!drawing || drawing.pointerId !== event.pointerId) {
      return;
    }

    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const point = clientToCanvasPoint(svg, event.clientX, event.clientY);
    const points = drawing.stroke.points;
    const last = points[points.length - 1];
    if (
      last &&
      Math.hypot(point.x - last.x, point.y - last.y) < 0.75
    ) {
      return;
    }
    points.push(point);
    scheduleLivePathUpdate(points);
  }

  function handlePointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    const erasing = erasingRef.current;

    if (erasing && erasing.pointerId === event.pointerId) {
      if (svg?.hasPointerCapture(event.pointerId)) {
        svg.releasePointerCapture(event.pointerId);
      }
      erasingRef.current = null;
      commitStrokesFromRef();
      scheduleRecognition(strokesRef.current);
      return;
    }

    const drawing = drawingRef.current;
    if (!drawing || drawing.pointerId !== event.pointerId) {
      return;
    }

    if (svg?.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId);
    }

    if (drawing.stroke.points.length >= 2) {
      strokesRef.current = [...strokesRef.current, drawing.stroke];
      commitStrokesFromRef();
    }

    drawingRef.current = null;
    updateLivePath([]);
    scheduleRecognition(strokesRef.current);
  }

  function handleClear() {
    if (recognizeTimerRef.current !== null) {
      window.clearTimeout(recognizeTimerRef.current);
      recognizeTimerRef.current = null;
    }
    recognizeSeqRef.current += 1;
    drawingRef.current = null;
    erasingRef.current = null;
    strokesRef.current = [];
    setStrokes([]);
    if (livePathRef.current) {
      livePathRef.current.setAttribute("d", "");
    }
    setLatex("");
    setError(null);
    setLoading(false);
  }

  if (!open || !mounted) {
    return null;
  }

  return (
    <div
      className="edunga-ink-math-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edunga-ink-math-dialog-title"
    >
      <button
        type="button"
        className="edunga-ink-math-dialog__backdrop"
        aria-label="Zamknij"
        onClick={onCancel}
      />
      <div className="edunga-ink-math-dialog__panel edunga-ink-math-dialog__panel--write">
        <h2
          id="edunga-ink-math-dialog-title"
          className="edunga-ink-math-dialog__title"
        >
          Pismo → matematyka
        </h2>
        <p className="edunga-ink-math-dialog__hint">
          Napisz formułę po lewej. Podgląd jest po prawej, a LaTeX możesz
          poprawić na dole przed wstawieniem do rozwiązania.
        </p>

        <div className="edunga-ink-math-dialog__layout">
          <div className="edunga-ink-math-dialog__write-col">
            <div className="edunga-ink-math-dialog__write-header">
              <span className="edunga-ink-math-dialog__label">Pisz tutaj</span>
              <div className="edunga-ink-math-dialog__tools">
                <button
                  type="button"
                  className={`edunga-ink-math-dialog__tool${
                    tool === "pen" ? " is-active" : ""
                  }`}
                  title="Ołówek"
                  onClick={() => setTool("pen")}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className={`edunga-ink-math-dialog__tool${
                    tool === "eraser" ? " is-active" : ""
                  }`}
                  title="Gumka — usuń kreskę"
                  onClick={() => setTool("eraser")}
                >
                  🧹
                </button>
                <button
                  type="button"
                  className="edunga-ink-math-dialog__btn edunga-ink-math-dialog__btn--secondary"
                  onClick={handleClear}
                >
                  Wyczyść
                </button>
              </div>
            </div>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
              width="100%"
              height={CANVAS_HEIGHT}
              className={`edunga-ink-math-dialog__canvas${
                tool === "pen"
                  ? " is-drawing"
                  : tool === "eraser"
                    ? " is-erasing"
                    : ""
              }`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <rect
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                fill="#ffffff"
                stroke="#d4d4d8"
                strokeWidth={1}
              />
              {strokes.map((stroke, index) => (
                <path
                  key={index}
                  d={pointsToSvgPath(stroke.points)}
                  fill="none"
                  stroke={stroke.color}
                  strokeWidth={stroke.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <path
                ref={livePathRef}
                d=""
                fill="none"
                stroke="#1e293b"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {loading ? (
              <p className="edunga-ink-math-dialog__status">
                Rozpoznawanie lokalne… (pierwsze uruchomienie może potrwać)
              </p>
            ) : (
              <p className="edunga-ink-math-dialog__canvas-hint">
                {tool === "eraser"
                  ? "Kliknij lub przeciągnij po kresce, żeby ją usunąć."
                  : "Pisz naturalnie — podgląd odświeża się po każdej kresce."}
              </p>
            )}
          </div>

          <div className="edunga-ink-math-dialog__preview-col">
            <span className="edunga-ink-math-dialog__label">Podgląd</span>
            <div className="edunga-ink-math-dialog__preview">
              {previewHtml ? (
                <span
                  className="edunga-ink-math-dialog__katex"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              ) : latex.trim() ? (
                <span className="edunga-ink-math-dialog__preview-error">
                  Niepoprawny LaTeX — popraw przed wstawieniem.
                </span>
              ) : (
                <span className="edunga-ink-math-dialog__preview-empty">
                  Podgląd matematyki
                </span>
              )}
            </div>
          </div>

          <div className="edunga-ink-math-dialog__latex-col">
            <label
              className="edunga-ink-math-dialog__label"
              htmlFor="ink-math-latex"
            >
              LaTeX (możesz poprawić)
            </label>
            <textarea
              id="ink-math-latex"
              className="edunga-ink-math-dialog__latex"
              value={latex}
              onChange={(event) => {
                setLatex(event.target.value);
                setError(null);
              }}
              rows={3}
              spellCheck={false}
              placeholder="Tu pojawi się rozpoznany zapis…"
            />
            {error ? (
              <p className="edunga-ink-math-dialog__error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <div className="edunga-ink-math-dialog__actions">
          <button
            type="button"
            className="edunga-ink-math-dialog__btn edunga-ink-math-dialog__btn--secondary"
            onClick={onCancel}
          >
            Anuluj
          </button>
          <button
            type="button"
            className="edunga-ink-math-dialog__btn edunga-ink-math-dialog__btn--primary"
            onClick={() => onAccept(latex.trim())}
            disabled={loading || !latex.trim()}
            title={
              !previewHtml && latex.trim()
                ? "Podgląd KaTeX nieudany — LaTeX i tak zostanie wstawiony"
                : undefined
            }
          >
            Wstaw do edytora
          </button>
        </div>
      </div>
    </div>
  );
}
