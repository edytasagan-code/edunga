import { useState } from "react";
import { klasa1, klasa2, klasa3, klasa4, matura } from "../../data/matematyka";

type Props = {
  wybraneDzialy: string[];
  setWybraneDzialy: React.Dispatch<React.SetStateAction<string[]>>;
};

export default function FiltersPanel({
  wybraneDzialy,
  setWybraneDzialy,
}: Props) {
  const [klasa, setKlasa] = useState("1");
  const [otwarteDzialy, setOtwarteDzialy] = useState<string[]>([]);

  const dzialy =
    klasa === "1"
      ? klasa1
      : klasa === "2"
      ? klasa2
      : klasa === "3"
      ? klasa3
      : klasa === "4"
      ? klasa4
      : matura;

  function toggleDzial(nazwa: string) {
    if (wybraneDzialy.includes(nazwa)) {
      setWybraneDzialy(wybraneDzialy.filter((d) => d !== nazwa));
    } else {
      setWybraneDzialy([...wybraneDzialy, nazwa]);
    }
  }
function toggleOpen(nazwa: string) {
  if (otwarteDzialy.includes(nazwa)) {
    setOtwarteDzialy(
      otwarteDzialy.filter((d) => d !== nazwa)
    );
  } else {
    setOtwarteDzialy([
      ...otwarteDzialy,
      nazwa,
    ]);
  }
}
  return (
    <aside className="w-80 rounded-2xl bg-[#252934] p-6">

      <h2 className="mb-6 text-2xl font-bold text-white">
        Filtry
      </h2>

      <div className="mb-6">

        <label className="mb-2 block text-sm text-zinc-400">
          Klasa
        </label>

        <select
          value={klasa}
          onChange={(e) => setKlasa(e.target.value)}
          className="w-full rounded-xl bg-[#1E2128] p-3 text-white"
        >
          <option value="1">Klasa 1 LO</option>
          <option value="2">Klasa 2 LO</option>
          <option value="3">Klasa 3 LO</option>
          <option value="4">Klasa 4 LO</option>
          <option value="m">Matura</option>
        </select>

      </div>

      <div className="space-y-5">

        {dzialy.map((dzial) => (

          <div key={dzial.id}>

            <div
  onClick={() => toggleOpen(dzial.nazwa)}
  className="flex cursor-pointer items-center justify-between rounded-lg p-2 text-white hover:bg-[#303541]"
>

  <span>{dzial.nazwa}</span>

  <span>
    {otwarteDzialy.includes(dzial.nazwa) ? "▼" : "▶"}
  </span>

</div>

              

            {otwarteDzialy.includes(dzial.nazwa) && (

              <div className="mt-3 ml-7 space-y-2">

                {dzial.tematy.map((temat: any, index: number) => (

                  <label
                    key={index}
                    className="flex items-center gap-2 text-sm text-zinc-300"
                  >

                    <input type="checkbox" />

                    {typeof temat === "string"
                      ? temat
                      : temat.nazwa}

                  </label>

                ))}

              </div>

            )}

          </div>

        ))}

      </div>

    </aside>
  );
}