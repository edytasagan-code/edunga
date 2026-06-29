import { Zadanie } from "../../lib/models/Zadanie";

type Props = {
  zadanie: Zadanie;
};

export default function TaskRow({ zadanie }: Props) {
  return (
    <tr className="border-b border-zinc-700">

      <td className="p-4 text-white">
        {zadanie.tytul}
      </td>

      <td className="p-4 text-zinc-400">
        {zadanie.typ}
      </td>

      <td className="p-4 text-zinc-400">
        {zadanie.poziom}
      </td>

      <td className="p-4 text-zinc-400">
        {zadanie.punkty}
      </td>

    </tr>
  );
}