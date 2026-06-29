export default function FilterBar() {
  return (
    <div className="grid grid-cols-5 gap-4">

      <select className="rounded-xl border border-zinc-700 bg-[#252934] p-3 text-white">
        <option>Klasa</option>
      </select>

      <select className="rounded-xl border border-zinc-700 bg-[#252934] p-3 text-white">
        <option>Dział</option>
      </select>

      <select className="rounded-xl border border-zinc-700 bg-[#252934] p-3 text-white">
        <option>Temat</option>
      </select>

      <select className="rounded-xl border border-zinc-700 bg-[#252934] p-3 text-white">
        <option>Typ</option>
      </select>

      <select className="rounded-xl border border-zinc-700 bg-[#252934] p-3 text-white">
        <option>Poziom</option>
      </select>

    </div>
  );
}