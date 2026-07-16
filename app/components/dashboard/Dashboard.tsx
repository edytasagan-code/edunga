import Link from "next/link";
import { Caveat } from "next/font/google";
import type { ReactNode } from "react";

import DashboardRecent from "./DashboardRecent";
import {
  DocumentIcon,
  FolderIcon,
  PencilIcon,
  SearchIcon,
  SettingsIcon,
  UploadIcon,
} from "./DashboardIcons";

import "./dashboard.css";

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
});

type DashboardModule = {
  icon: ReactNode;
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
};

const MODULES: DashboardModule[] = [
  {
    icon: <SearchIcon className="dashboard-card__svg" />,
    title: "Baza zadań",
    description: "Przeglądaj i wyszukuj zadania.",
    href: "/nauczyciel/baza-zadan",
  },
  {
    icon: <PencilIcon className="dashboard-card__svg" />,
    title: "Generator dokumentów",
    description: "Twórz kartkówki, sprawdziany i karty pracy.",
    href: "/nauczyciel/generator",
  },
  {
    icon: <FolderIcon className="dashboard-card__svg" />,
    title: "Biblioteka dokumentów",
    description: "Otwieraj i zarządzaj swoimi dokumentami.",
    href: "/nauczyciel/biblioteka-dokumentow",
  },
  {
    icon: <UploadIcon className="dashboard-card__svg" />,
    title: "Import PDF",
    description: "Importuj zadania z podręczników i arkuszy.",
    href: "/nauczyciel/import",
  },
  {
    icon: <DocumentIcon className="dashboard-card__svg" />,
    title: "Biblioteka egzaminów",
    description: "Arkusze, Matura, egzamin ósmoklasisty.",
    comingSoon: true,
  },
  {
    icon: <SettingsIcon className="dashboard-card__svg" />,
    title: "Administracja",
    description: "Źródła, klasy, tematy i metadane.",
    href: "/nauczyciel/program",
  },
];

function DashboardCard({ module }: { module: DashboardModule }) {
  const content = (
    <>
      <span className="dashboard-card__clip dashboard-card__clip--tl" aria-hidden />
      <span className="dashboard-card__clip dashboard-card__clip--tr" aria-hidden />
      <span className="dashboard-card__clip dashboard-card__clip--bl" aria-hidden />
      <span className="dashboard-card__clip dashboard-card__clip--br" aria-hidden />
      <span className="dashboard-card__icon">{module.icon}</span>
      <h2 className="dashboard-card__title">
        <span>{module.title}</span>
      </h2>
      <p className="dashboard-card__description">{module.description}</p>
      {module.comingSoon ? (
        <span className="dashboard-card__badge">Wkrótce</span>
      ) : null}
    </>
  );

  if (module.comingSoon || !module.href) {
    return (
      <article
        className="dashboard-card dashboard-card--disabled"
        aria-disabled="true"
      >
        {content}
      </article>
    );
  }

  return (
    <Link href={module.href} className="dashboard-card">
      {content}
    </Link>
  );
}

export default function Dashboard() {
  return (
    <main className="dashboard">
      <div className="dashboard__doodle dashboard__doodle--math" aria-hidden />

      <div className="dashboard__container">
        <header className="dashboard__header">
          <div className="dashboard__brand">
            <div className="dashboard__logo" aria-hidden>
              <svg
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <polygon
                  points="50,5 87,27 87,73 50,95 13,73 13,27"
                  stroke="#F7B500"
                  strokeWidth="5"
                  fill="#FFF8E7"
                />
                <text
                  x="50"
                  y="58"
                  textAnchor="middle"
                  fill="#1B2B44"
                  fontSize="34"
                  fontFamily="Georgia, serif"
                  fontWeight="700"
                >
                  Σ
                </text>
              </svg>
            </div>
            <div>
              <h1 className="dashboard__brand-name">EDUNGA</h1>
              <p className="dashboard__brand-tagline">
                KIEDY LOGIKA SPOTYKA WYOBRAŹNIĘ
              </p>
            </div>
          </div>

          <p className={`dashboard__intro ${caveat.className}`}>
            Twoja przestrzeń do nauki i tworzenia
          </p>
        </header>

        <div className="dashboard__grid">
          {MODULES.map((module) => (
            <DashboardCard key={module.title} module={module} />
          ))}
        </div>

        <DashboardRecent />
      </div>
    </main>
  );
}
