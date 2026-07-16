"use client";

import type { ReactNode } from "react";

import type { TrueFalseTableNode } from "../types";

type Props = {
  node: TrueFalseTableNode;
  renderStatement: (
    rowId: string,
    children: ReactNode[],
    rowIndex: number
  ) => ReactNode;
};

function CheckboxCell() {
  return (
    <span
      className="inline-flex h-4 w-4 items-center justify-center border border-zinc-400 bg-white align-middle"
      aria-hidden
    />
  );
}

export default function TrueFalseTableView({
  node,
  renderStatement,
}: Props) {
  return (
    <table
      className="my-2 w-full border-collapse text-base leading-7"
      data-node-type="true-false-table"
      data-node-id={node.id}
    >
      <thead>
        <tr>
          <th className="border border-zinc-300 px-3 py-1.5 text-left font-semibold">
            Stwierdzenie
          </th>
          <th className="w-12 border border-zinc-300 px-2 py-1.5 text-center font-semibold">
            P
          </th>
          <th className="w-12 border border-zinc-300 px-2 py-1.5 text-center font-semibold">
            F
          </th>
        </tr>
      </thead>
      <tbody>
        {node.rows.map((row, rowIndex) => (
          <tr key={row.id}>
            <td className="border border-zinc-300 px-3 py-1.5 align-top">
              {row.label ? (
                <span className="mr-1 font-normal">{row.label}.</span>
              ) : null}
              {renderStatement(row.id, [], rowIndex)}
            </td>
            <td className="border border-zinc-300 px-2 py-1.5 text-center align-middle">
              <CheckboxCell />
            </td>
            <td className="border border-zinc-300 px-2 py-1.5 text-center align-middle">
              <CheckboxCell />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
