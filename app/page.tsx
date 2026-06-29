import Navbar from "./components/Navbar";
import HeroPanel from "./components/HeroPanel";

export default function Home() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#1E2128] text-white">
        <section className="mx-auto max-w-7xl px-4 pt-4 pb-8">

          <div className="grid grid-cols-2 gap-20 items-center">

            {/* LEWA STRONA */}

            <div>

              <div className="inline-flex items-center rounded-full border border-[#F7B500]/30 bg-[#F7B500]/10 px-4 py-2 text-sm text-[#F7B500]">
                Nowoczesna edukacja matematyczna
              </div>

              <h1 className="mt-8 text-6xl font-extrabold leading-tight">
                Matematyka,
                <br />
                <span className="text-[#F7B500]">
                  która ma sens.
                </span>
              </h1>

              <p className="mt-8 max-w-lg text-xl leading-9 text-zinc-300">
                Platforma dla uczniów i nauczycieli.
                <br />
                Zadania, karty pracy, generator AI oraz
                przygotowanie do matury —
                wszystko w jednym miejscu.
              </p>

              <div className="mt-12 flex gap-5">

                <button className="rounded-xl bg-[#F7B500] px-8 py-4 font-bold text-black transition hover:opacity-90">
                  Rozpocznij za darmo
                </button>

                <button className="rounded-xl border border-zinc-600 px-8 py-4 transition hover:border-[#F7B500] hover:text-[#F7B500]">
                  Zobacz demo
                </button>

              </div>

            </div>

            {/* PRAWA STRONA */}

            <HeroPanel />

          </div>

        </section>
      </main>
    </>
  );
}