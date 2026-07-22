"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { CellFitScaleResult } from "@/app/lib/printLayout/cellAutoScale";

export type RegisteredCellScale = CellFitScaleResult & {
  key: string;
};

type PrintCellScaleContextValue = {
  registerCellScale: (key: string, result: CellFitScaleResult) => void;
  getCellScales: () => Map<string, RegisteredCellScale>;
  overflowWarnings: string[];
};

const PrintCellScaleContext = createContext<PrintCellScaleContextValue | null>(
  null
);

export function PrintCellScaleProvider({ children }: { children: ReactNode }) {
  const scalesRef = useRef<Map<string, RegisteredCellScale>>(new Map());
  const [revision, setRevision] = useState(0);
  const [overflowWarnings, setOverflowWarnings] = useState<string[]>([]);

  const registerCellScale = useCallback(
    (key: string, result: CellFitScaleResult) => {
      const previous = scalesRef.current.get(key);
      scalesRef.current.set(key, { ...result, key });

      const changed =
        !previous ||
        previous.scale !== result.scale ||
        previous.tooLarge !== result.tooLarge;

      if (!changed) {
        return;
      }

      setRevision((value) => value + 1);
      setOverflowWarnings(
        [...scalesRef.current.values()]
          .filter((entry) => entry.tooLarge)
          .map((entry) => entry.key)
      );
    },
    []
  );

  const getCellScales = useCallback(() => new Map(scalesRef.current), [revision]);

  const value = useMemo(
    () => ({
      registerCellScale,
      getCellScales,
      overflowWarnings,
    }),
    [registerCellScale, getCellScales, overflowWarnings, revision]
  );

  return (
    <PrintCellScaleContext.Provider value={value}>
      {children}
    </PrintCellScaleContext.Provider>
  );
}

export function usePrintCellScale() {
  return useContext(PrintCellScaleContext);
}

export function buildMeasuredScalesRecord(
  scales: Map<string, RegisteredCellScale>
): Record<string, number> {
  const record: Record<string, number> = {};

  for (const [key, entry] of scales) {
    record[key] = entry.scale;
  }

  return record;
}
