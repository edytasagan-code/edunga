"use client";

import { useCallback, useEffect, useState } from "react";

export type KlasaOption = {
  id: string;
  nazwa: string;
  kolejnosc: number;
};

export type DzialOption = {
  id: string;
  nazwa: string;
  klasaId: string;
  kolejnosc: number;
};

export type TematOption = {
  id: string;
  nazwa: string;
  dzialId: string;
  kolejnosc: number;
};

type CurriculumState = {
  klasy: KlasaOption[];
  dzialy: DzialOption[];
  tematy: TematOption[];
  loadingKlasy: boolean;
  loadingDzialy: boolean;
  loadingTematy: boolean;
  error: string | null;
};

type Options = {
  initialKlasaId?: string;
  initialDzialId?: string;
  initialTematId?: string;
};

export function useCurriculum(options: Options = {}) {
  const [klasaId, setKlasaId] = useState(options.initialKlasaId ?? "");
  const [dzialId, setDzialId] = useState(options.initialDzialId ?? "");
  const [tematId, setTematId] = useState(options.initialTematId ?? "");
  const [state, setState] = useState<CurriculumState>({
    klasy: [],
    dzialy: [],
    tematy: [],
    loadingKlasy: true,
    loadingDzialy: false,
    loadingTematy: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadKlasy() {
      try {
        const response = await fetch("/api/klasy");

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(
            body?.error ?? "Nie udało się pobrać listy klas."
          );
        }

        const klasy = (await response.json()) as KlasaOption[];

        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            klasy,
            loadingKlasy: false,
            error: null,
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loadingKlasy: false,
            error:
              error instanceof Error
                ? error.message
                : "Nie udało się pobrać listy klas.",
          }));
        }
      }
    }

    loadKlasy();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!klasaId) {
      setState((prev) => ({
        ...prev,
        dzialy: [],
        loadingDzialy: false,
      }));
      return;
    }

    let cancelled = false;
    setState((prev) => ({
      ...prev,
      loadingDzialy: true,
    }));

    async function loadDzialy() {
      try {
        const response = await fetch(
          `/api/dzialy?klasaId=${encodeURIComponent(klasaId)}`
        );

        if (!response.ok) {
          throw new Error("Nie udało się pobrać działów.");
        }

        const dzialy = (await response.json()) as DzialOption[];

        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            dzialy,
            loadingDzialy: false,
            error: null,
          }));
        }
      } catch {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            dzialy: [],
            loadingDzialy: false,
            error: "Nie udało się pobrać działów.",
          }));
        }
      }
    }

    loadDzialy();

    return () => {
      cancelled = true;
    };
  }, [klasaId]);

  useEffect(() => {
    if (!dzialId) {
      setState((prev) => ({
        ...prev,
        tematy: [],
        loadingTematy: false,
      }));
      return;
    }

    let cancelled = false;
    setState((prev) => ({
      ...prev,
      loadingTematy: true,
    }));

    async function loadTematy() {
      try {
        const response = await fetch(
          `/api/tematy?dzialId=${encodeURIComponent(dzialId)}`
        );

        if (!response.ok) {
          throw new Error("Nie udało się pobrać tematów.");
        }

        const tematy = (await response.json()) as TematOption[];

        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            tematy,
            loadingTematy: false,
            error: null,
          }));
        }
      } catch {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            tematy: [],
            loadingTematy: false,
            error: "Nie udało się pobrać tematów.",
          }));
        }
      }
    }

    loadTematy();

    return () => {
      cancelled = true;
    };
  }, [dzialId]);

  const selectKlasa = useCallback(
    (
      nextKlasaId: string,
      options?: { preserveChildren?: boolean }
    ) => {
      setKlasaId(nextKlasaId);

      if (!options?.preserveChildren) {
        setDzialId("");
        setTematId("");
      }
    },
    []
  );

  const selectDzial = useCallback(
    (
      nextDzialId: string,
      options?: { preserveChildren?: boolean }
    ) => {
      setDzialId(nextDzialId);

      if (!options?.preserveChildren) {
        setTematId("");
      }
    },
    []
  );

  const selectTemat = useCallback((nextTematId: string) => {
    setTematId(nextTematId);
  }, []);

  return {
    klasy: state.klasy,
    dzialy: state.dzialy,
    tematy: state.tematy,
    klasaId,
    dzialId,
    tematId,
    loadingKlasy: state.loadingKlasy,
    loadingDzialy: state.loadingDzialy,
    loadingTematy: state.loadingTematy,
    error: state.error,
    setKlasaId: selectKlasa,
    setDzialId: selectDzial,
    setTematId: selectTemat,
  };
}

export function useCurriculumLabels() {
  const [labels, setLabels] = useState({
    klasy: new Map<string, string>(),
    dzialy: new Map<string, string>(),
    tematy: new Map<string, string>(),
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const klasyResponse = await fetch("/api/klasy");

        if (!klasyResponse.ok) {
          throw new Error("labels");
        }

        const klasy = (await klasyResponse.json()) as KlasaOption[];
        const klasyMap = new Map(
          klasy.map((item) => [item.id, item.nazwa])
        );
        const dzialyMap = new Map<string, string>();
        const tematyMap = new Map<string, string>();

        await Promise.all(
          klasy.map(async (klasa) => {
            const dzialyResponse = await fetch(
              `/api/dzialy?klasaId=${encodeURIComponent(klasa.id)}`
            );

            if (!dzialyResponse.ok) {
              return;
            }

            const dzialy =
              (await dzialyResponse.json()) as DzialOption[];

            for (const dzial of dzialy) {
              dzialyMap.set(dzial.id, dzial.nazwa);

              const tematyResponse = await fetch(
                `/api/tematy?dzialId=${encodeURIComponent(dzial.id)}`
              );

              if (!tematyResponse.ok) {
                continue;
              }

              const tematy =
                (await tematyResponse.json()) as TematOption[];

              for (const temat of tematy) {
                tematyMap.set(temat.id, temat.nazwa);
              }
            }
          })
        );

        if (!cancelled) {
          setLabels({
            klasy: klasyMap,
            dzialy: dzialyMap,
            tematy: tematyMap,
          });
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { labels, loading };
}
