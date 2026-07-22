"use client";

import { useCallback, useEffect, useState } from "react";

export type MainTopicOption = {
  id: string;
  nazwa: string;
  kolejnosc: number;
};

export type SubtopicOption = {
  id: string;
  nazwa: string;
  kolejnosc: number;
  mainTopicId: string;
};

type MainTopicWithSubs = MainTopicOption & {
  subtopics?: SubtopicOption[];
};

export function useCurriculumTopics(initialMainTopicId = "") {
  const [mainTopics, setMainTopics] = useState<MainTopicOption[]>([]);
  const [subtopics, setSubtopics] = useState<SubtopicOption[]>([]);
  const [mainTopicId, setMainTopicIdState] = useState(initialMainTopicId);
  const [subtopicId, setSubtopicIdState] = useState("");
  const [loadingMainTopics, setLoadingMainTopics] = useState(true);
  const [loadingSubtopics, setLoadingSubtopics] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingMainTopics(true);

      try {
        const response = await fetch("/api/tematy-glowne");
        if (!response.ok) {
          throw new Error("failed");
        }

        const data = (await response.json()) as MainTopicWithSubs[];

        if (cancelled) {
          return;
        }

        setMainTopics(
          data.map((topic) => ({
            id: topic.id,
            nazwa: topic.nazwa,
            kolejnosc: topic.kolejnosc,
          }))
        );
      } catch {
        if (!cancelled) {
          setMainTopics([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingMainTopics(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mainTopicId) {
      setSubtopics([]);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoadingSubtopics(true);

      try {
        const response = await fetch(
          `/api/podtematy?mainTopicId=${encodeURIComponent(mainTopicId)}`
        );

        if (!response.ok) {
          throw new Error("failed");
        }

        const data = (await response.json()) as SubtopicOption[];

        if (!cancelled) {
          setSubtopics(data);
        }
      } catch {
        if (!cancelled) {
          setSubtopics([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingSubtopics(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [mainTopicId]);

  const setMainTopicId = useCallback(
    (value: string, options?: { preserveChildren?: boolean }) => {
      setMainTopicIdState(value);

      if (!options?.preserveChildren) {
        setSubtopicIdState("");
      }
    },
    []
  );

  const setSubtopicId = useCallback((value: string) => {
    setSubtopicIdState(value);
  }, []);

  return {
    mainTopics,
    subtopics,
    mainTopicId,
    subtopicId,
    setMainTopicId,
    setSubtopicId,
    loadingMainTopics,
    loadingSubtopics,
  };
}
