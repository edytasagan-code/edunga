import type { Zadanie } from "../../lib/types";
import Badge from "../ui/Badge";

type Props = {
  zadanie: Zadanie;
  onAdd: (id: string) => void;
  isAdded: boolean;
};

export default function TaskCard({
  zadanie,
  onAdd,
  isAdded,
}: Props) {

  return (
    <div className="rounded-xl border border-zinc-700 bg-[#1E2128] p-5">

      <div className="flex items-start justify-between">

        <div className="flex-1">

          <div className="mb-2 flex gap-2">

            <Badge>
  {zadanie.temat}
</Badge>

<Badge
  variant={
    zadanie.poziom === "Łatwy"
      ? "success"
      : zadanie.poziom === "Średni"
      ? "warning"
      : "danger"
  }
>
  {zadanie.poziom}
</Badge>

          </div>

          <p className="text-white">
            {zadanie.tresc}
          </p>

        </div>

        {isAdded ? (
  <span className="rounded-lg bg-zinc-700 px-3 py-2 text-sm text-zinc-300">
    ✓ Dodane
  </span>
) : (
  <button
    onClick={() => onAdd(zadanie.id)}
    className="ml-4 rounded-lg bg-[#F7B500] px-4 py-2 font-bold text-black"
  >
    +
  </button>
)}

      </div>

    </div>
  );
}