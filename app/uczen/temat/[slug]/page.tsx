import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import Link from "next/link";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function TematPage({ params }: Props) {
  const { slug } = await params;

  return (
    <>
      <Navbar />

      <main className="flex min-h-screen bg-[#1E2128]">
        <Sidebar />

        <section className="flex-1 p-10">

          <button className="mb-8 text-zinc-400 transition hover:text-[#F7B500]">
            ← Powrót
          </button>

          <h1 className="text-4xl font-bold capitalize text-white">
            {slug.replaceAll("-", " ")}
          </h1>

          <p className="mt-2 text-zinc-400">
            Klasa 1 LO • Matematyka
          </p>

          <div className="mt-10 grid grid-cols-3 gap-6">

            {/* TEORIA */}

            <Link
              href={`/uczen/temat/${slug}/teoria`}
              className="rounded-2xl border border-zinc-700 bg-[#252934] p-6 transition hover:border-[#F7B500]"
            >
              <h2 className="text-xl font-bold text-white">
                📖 Teoria
              </h2>

              <p className="mt-3 text-zinc-400">
                Wyjaśnienia krok po kroku.
              </p>
            </Link>

            {/* ZADANIA */}

            <div className="cursor-pointer rounded-2xl border border-zinc-700 bg-[#252934] p-6 transition hover:border-[#F7B500]">
              <h2 className="text-xl font-bold text-white">
                ✍ Zadania
              </h2>

              <p className="mt-3 text-zinc-400">
                Ćwiczenia o różnym poziomie.
              </p>
            </div>

            {/* AI */}

            <div className="cursor-pointer rounded-2xl border border-zinc-700 bg-[#252934] p-6 transition hover:border-[#F7B500]">
              <h2 className="text-xl font-bold text-white">
                🤖 Zapytaj AI
              </h2>

              <p className="mt-3 text-zinc-400">
                Rozwiąż zadanie z pomocą AI.
              </p>
            </div>

            {/* KARTA PRACY */}

            <div className="cursor-pointer rounded-2xl border border-zinc-700 bg-[#252934] p-6 transition hover:border-[#F7B500]">
              <h2 className="text-xl font-bold text-white">
                📄 Karta pracy
              </h2>

              <p className="mt-3 text-zinc-400">
                Pobierz kartę do wydruku.
              </p>
            </div>

            {/* SPRAWDŹ SIĘ */}

            <div className="cursor-pointer rounded-2xl border border-zinc-700 bg-[#252934] p-6 transition hover:border-[#F7B500]">
              <h2 className="text-xl font-bold text-white">
                📝 Sprawdź się
              </h2>

              <p className="mt-3 text-zinc-400">
                Krótki test z działu.
              </p>
            </div>

            {/* POSTĘPY */}

            <div className="cursor-pointer rounded-2xl border border-zinc-700 bg-[#252934] p-6 transition hover:border-[#F7B500]">
              <h2 className="text-xl font-bold text-white">
                📊 Postępy
              </h2>

              <p className="mt-3 text-zinc-400">
                Zobacz swoje wyniki.
              </p>
            </div>

          </div>

        </section>
      </main>
    </>
  );
}