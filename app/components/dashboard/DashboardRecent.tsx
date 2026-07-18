"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { DocumentLibrarySummary } from "@/app/lib/documentProject";

type RecentItem = {
  label: string;
  href: string;
};

export default function DashboardRecent() {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecent() {
      try {
        const response = await fetch("/api/dokumenty?archived=false");

        if (!response.ok) {
          return;
        }

        const documents = (await response.json()) as DocumentLibrarySummary[];
        const recent = documents.slice(0, 3).map((document) => ({
          label: document.tytul,
          href: `/nauczyciel/generator/${document.id}`,
        }));

        if (!cancelled) {
          setItems(recent);
        }
      } catch {
        // Recent section stays empty when API is unavailable.
      }
    }

    void loadRecent();

    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="dashboard-recent" aria-label="Ostatnio otwarte">
      <div className="dashboard-recent__tape dashboard-recent__tape--left" />
      <div className="dashboard-recent__tape dashboard-recent__tape--right" />
      <h2 className="dashboard-recent__title">Ostatnio otwarte</h2>
      <ul className="dashboard-recent__list">
        {items.map((item, index) => (
          <li key={item.href} className="dashboard-recent__item">
            {index > 0 ? (
              <span className="dashboard-recent__divider" aria-hidden>
                |
              </span>
            ) : null}
            <Link href={item.href}>{item.label}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
