import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="edunga-sidebar">

      <div className="p-8">

        <h2 className="text-4xl font-bold edunga-text-body">
          Panel ucznia
        </h2>

        <p className="mt-2 text-m edunga-text-muted">
          Klasa 1 LO
        </p>

      </div>

      <nav className="px-4">

        <Link
          href="#"
          className="edunga-sidebar__link edunga-sidebar__link--active"
        >
          Materiały
        </Link>

        <Link
          href="#"
          className="edunga-sidebar__link mt-2"
        >
          Zadania
        </Link>

        <Link
          href="#"
          className="edunga-sidebar__link mt-2"
        >
          Karty pracy
        </Link>

        <Link
          href="#"
          className="edunga-sidebar__link mt-2"
        >
          AI
        </Link>

        <Link
          href="#"
          className="edunga-sidebar__link mt-2"
        >
          Postępy
        </Link>

      </nav>

    </aside>
  );
}
