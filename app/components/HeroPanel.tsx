export default function HeroPanel() {
  return (
    <div className="rounded-3xl border border-zinc-700 bg-[#242833] p-8 shadow-2xl">

      <h2 className="text-3xl font-bold text-white">
        Wybierz klasę i zacznij
        <br />
        uczyć się <span className="text-[#F7B500]">mądrzej.</span>
      </h2>

      <p className="mt-3 text-zinc-400">
        Dopasowane materiały krok po kroku.
      </p>

      <div className="mt-8 grid grid-cols-3 gap-4">

        <div className="rounded-2xl border-2 border-[#F7B500] bg-[#1E2128] p-5 text-center">
          <p className="text-zinc-400 text-sm">Klasa</p>
          <h3 className="mt-2 text-4xl font-bold text-white">1</h3>
        </div>

        <div className="rounded-2xl border border-zinc-600 bg-[#1E2128] p-5 text-center">
          <p className="text-zinc-400 text-sm">Klasa</p>
          <h3 className="mt-2 text-4xl font-bold">2</h3>
        </div>

        <div className="rounded-2xl border border-zinc-600 bg-[#1E2128] p-5 text-center">
          <p className="text-zinc-400 text-sm">Klasa</p>
          <h3 className="mt-2 text-4xl font-bold">3</h3>
        </div>

        <div className="rounded-2xl border border-zinc-600 bg-[#1E2128] p-5 text-center">
          <p className="text-zinc-400 text-sm">Klasa</p>
          <h3 className="mt-2 text-4xl font-bold">4</h3>
        </div>

        <div className="col-span-2 rounded-2xl border border-zinc-600 bg-[#1E2128] p-5 flex items-center justify-center">
          <span className="text-2xl font-bold text-[#F7B500]">
            MATURA
          </span>
        </div>

      </div>

      <button className="mt-8 w-full rounded-xl bg-[#F7B500] py-4 font-bold text-black hover:opacity-90">
        Rozpocznij naukę
      </button>

    </div>
  );
}