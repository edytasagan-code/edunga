import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-80 border-r border-zinc-800 bg-[#1B1E24]">

      <div className="p-8">

        <h2 className="text-4xl font-bold text-white">
          Panel ucznia
        </h2>

        <p className="mt-2 text-m text-zinc-300">
          Klasa 1 LO
        </p>

      </div>

      <nav className="px-4">

        <Link
          href="#"
          className="block rounded-xl px-5 py-4 text-lg font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
        >
          Materiały
        </Link>

        <Link
          href="#"
          className="mt-2 block rounded-xl px-5 py-4 text-zinc-400 hover:bg-zinc-800"
        >
          Zadania
        </Link>

        <Link
          href="#"
          className="mt-2 block rounded-xl px-5 py-4 text-zinc-400 hover:bg-zinc-800"
        >
          Karty pracy
        </Link>

        <Link
          href="#"
          className="mt-2 block rounded-xl px-5 py-4 text-zinc-400 hover:bg-zinc-800"
        >
          AI
        </Link>

        <Link
          href="#"
          className="mt-2 block rounded-xl px-5 py-4 text-zinc-400 hover:bg-zinc-800"
        >
          Postępy
        </Link>

      </nav>

    </aside>
  );
}