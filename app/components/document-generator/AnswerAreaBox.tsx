"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  answerAreaStyleKey,
  pxToAnswerAreaCm,
  type AnswerAreaItemType,
} from "@/app/lib/documentGenerator";
import {
  clampAnswerAreaHeightPx,
  resolveAnswerAreaHeightPx,
} from "@/app/lib/answerAreaStyle";
import {
  createGuideGeometry,
  createPreviewAnswerAreaPlan,
} from "@/app/lib/answerAreaRenderPlan";
import type { DocumentAnswerAreaItem } from "@/app/lib/documentGenerator";

type Props = {
  areaType: AnswerAreaItemType;
  heightPx: number;
  resizable?: boolean;
  onResize?: (heightPx: number) => void;
  className?: string;
};

export function AnswerAreaBoxFromItem({
  item,
  resizable = false,
  onResize,
  className = "",
}: {
  item: DocumentAnswerAreaItem;
  resizable?: boolean;
  onResize?: (heightPx: number) => void;
  className?: string;
}) {
  return (
    <AnswerAreaBox
      areaType={item.areaType}
      heightPx={resolveAnswerAreaHeightPx(item)}
      resizable={resizable}
      onResize={onResize}
      className={className}
    />
  );
}

export default function AnswerAreaBox({
  areaType,
  heightPx,
  resizable = false,
  onResize,
  className = "",
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [resizing, setResizing] = useState(false);
  const [boxWidthPx, setBoxWidthPx] = useState(0);
  const styleKey = answerAreaStyleKey(areaType);
  const renderPlan = createPreviewAnswerAreaPlan(areaType, heightPx, boxWidthPx);
  const guideGeometry = createGuideGeometry(
    renderPlan.horizontalCount,
    renderPlan.verticalCount,
    renderPlan.step
  );

  useEffect(() => {
    const box = boxRef.current;
    if (!box) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setBoxWidthPx(entry.contentRect.width);
    });

    observer.observe(box);
    setBoxWidthPx(box.clientWidth);

    return () => observer.disconnect();
  }, []);

  const startResize = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!resizable || !onResize) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const resize = onResize;
      if (!resize) {
        return;
      }

      const startY = event.clientY;
      const startHeight = heightPx;
      const handle = event.currentTarget;

      setResizing(true);
      window.document.body.classList.add("document-answer-area--resizing");
      handle.setPointerCapture(event.pointerId);

      function onPointerMove(moveEvent: PointerEvent) {
        const nextHeight = clampAnswerAreaHeightPx(
          startHeight + (moveEvent.clientY - startY)
        );
        resize(nextHeight);
      }

      function onPointerUp(upEvent: PointerEvent) {
        const nextHeight = clampAnswerAreaHeightPx(
          startHeight + (upEvent.clientY - startY)
        );
        resize(nextHeight);
        setResizing(false);
        window.document.body.classList.remove("document-answer-area--resizing");

        if (handle.hasPointerCapture(upEvent.pointerId)) {
          handle.releasePointerCapture(upEvent.pointerId);
        }

        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      }

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [heightPx, onResize, resizable]
  );

  return (
    <div
      ref={boxRef}
      className={`document-preview-answer-area document-preview-answer-area--${styleKey} ${
        resizing ? "document-preview-answer-area--resizing" : ""
      } ${className}`.trim()}
      style={{ height: `${heightPx}px` }}
    >
      {renderPlan.showGuides ? (
        <div className="document-preview-answer-area__guides" aria-hidden>
          {guideGeometry.horizontalOffsets.map((offset, index) => (
            <div
              key={`h-${index}`}
              className="document-preview-answer-area__guide-line--h"
              style={{
                top: offset,
                height: renderPlan.lineThickness,
                backgroundColor: renderPlan.lineColor,
              }}
            />
          ))}

          {renderPlan.isGrid
            ? guideGeometry.verticalOffsets.map((offset, index) => (
                <div
                  key={`v-${index}`}
                  className="document-preview-answer-area__guide-line--v"
                  style={{
                    left: offset,
                    width: renderPlan.lineThickness,
                    backgroundColor: renderPlan.lineColor,
                  }}
                />
              ))
            : null}
        </div>
      ) : null}

      {resizable ? (
        <button
          type="button"
          aria-label="Zmień wysokość pola na rozwiązanie"
          className="document-preview-answer-area__resize-handle"
          onPointerDown={startResize}
          onClick={(event) => event.stopPropagation()}
        />
      ) : null}
    </div>
  );
}

export function patchAnswerAreaHeight(heightPx: number) {
  return {
    heightPx,
    heightCm: pxToAnswerAreaCm(heightPx),
  };
}
