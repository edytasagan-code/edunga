"use client";

import Navbar from "../../../components/Navbar";

export default function NoweZadaniePage() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#1E2128]">

        <section className="mx-auto max-w-5xl p-8">

          <h1 className="mb-8 text-4xl font-bold text-white">
            Nowe zadanie
          </h1>

          <div className="rounded-2xl bg-[#252934] p-8">

            <div className="space-y-6">

              <div>
                <label className="mb-2 block text-zinc-300">
                  Treść zadania
                </label>

                <textarea
                  rows={6}
                  className="w-full rounded-xl bg-[#1E2128] p-4 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-zinc-300">
                  Odpowiedź
                </label>

                <textarea
                  rows={2}
                  className="w-full rounded-xl bg-[#1E2128] p-4 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-zinc-300">
                  Rozwiązanie
                </label>

                <textarea
                  rows={5}
                  className="w-full rounded-xl bg-[#1E2128] p-4 text-white outline-none"
                />
              </div>

            </div>
            <div className="grid grid-cols-2 gap-6">

  <div>
    <label className="mb-2 block text-zinc-300">
      Klasa
    </label>

    <select className="w-full rounded-xl bg-[#1E2128] p-3 text-white">
      <option>Klasa 1 LO</option>
      <option>Klasa 2 LO</option>
      <option>Klasa 3 LO</option>
      <option>Klasa 4 LO</option>
      <option>Matura</option>
    </select>
  </div>

  <div>
    <label className="mb-2 block text-zinc-300">
      Dział
    </label>

    <select className="w-full rounded-xl bg-[#1E2128] p-3 text-white">
      <option>Wybierz dział...</option>
    </select>
  </div>

  <div>
    <label className="mb-2 block text-zinc-300">
      Temat
    </label>

    <select className="w-full rounded-xl bg-[#1E2128] p-3 text-white">
      <option>Wybierz temat...</option>
    </select>
  </div>

  <div>
    <label className="mb-2 block text-zinc-300">
      Punkty
    </label>

    <input
      type="number"
      className="w-full rounded-xl bg-[#1E2128] p-3 text-white"
    />
  </div>

</div>

          </div>

        </section>

      </main>

    </>
  );
}