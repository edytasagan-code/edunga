import Link from "next/link";
import Navbar from "../../components/Navbar";
import Sidebar from "../../components/Sidebar";

export default function GeneratoryPage() {
  const generatory = [
    {
      title: "📝 Generator kartkówek",
      href: "/nauczyciel/generatory/kartkowki",
      desc: "Twórz kartkówki z jednego lub kilku tematów.",
    },
    {
      title: "📚 Generator sprawdzianów",
      href: "/nauczyciel/generatory/sprawdziany",
      desc: "Twórz sprawdziany z całych działów.",
    },
    {
      title: "🎓 Generator matur",
      href: "/nauczyciel/generatory/matura",
      desc: "Generuj arkusze maturalne.",
    },
    {
      title: "📄 Generator kart pracy",
      href: "/nauczyciel/generatory/karty-pracy",
      desc: "Twórz zestawy ćwiczeń.",
    },
  ];

  return (
    <>
      <Navbar />

      <main className="flex min-h-screen bg-[#1E2128]">
        <Sidebar />

        <section className="flex-1 p-10">

          <h1 className="text-4xl font-bold text-white">
            Generatory
          </h1>

          <p className="mt-2 text-zinc-400">
            Wybierz generator.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-6">

            {generatory.map((g) => (
              <Link
                key={g.href}
                href={g.href}
                className="rounded-2xl border border-zinc-700 bg-[#252934] p-8 transition hover:border-[#F7B500]"
              >
                <h2 className="text-2xl font-bold text-white">
                  {g.title}
                </h2>

                <p className="mt-4 text-zinc-400">
                  {g.desc}
                </p>
              </Link>
            ))}

          </div>

        </section>
      </main>
    </>
  );
}