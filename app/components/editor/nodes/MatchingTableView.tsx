"use client";

import type { ReactNode } from "react";

import type { MatchingTableNode } from "../types";

type Props = {
  node: MatchingTableNode;
  renderLeft: (
    rowId: string,
    children: ReactNode[],
    rowIndex: number
  ) => ReactNode;
};

function AnswerCell() {
  return (
    <span
      className="inline-flex h-4 w-8 items-center justify-center border border-zinc-400 bg-white align-middle"
      aria-hidden
    />
  );
}

export default function MatchingTableView({ node, renderLeft }: Props) {
  return (
    <div data-node-type="matching-table" data-node-id={node.id}>
      {node.options.length > 0 ? (
        <div className="mb-2 text-base leading-7">
          {node.options.map((option, index) => (
            <span key={`${node.id}-opt-${option.label}`}>
              {index > 0 ? (
                <span className="mx-3" aria-hidden>
                  {" "}
                </span>
              ) : null}
              <span className="font-normal">{option.label}. </span>
              <span>{option.text}</span>
            </span>
          ))}
        </div>
      ) : null}
      <table className="my-2 w-full border-collapse text-base leading-7">
        <thead>
          <tr>
            <th className="border border-zinc-300 px-3 py-1.5 text-left font-semibold">
              Zdanie
            </th>
            <th className="w-16 border border-zinc-300 px-2 py-1.5 text-center font-semibold">
              Odp.
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
                {renderLeft(row.id, [], rowIndex)}
              </td>
              <td className="border border-zinc-300 px-2 py-1.5 text-center align-middle">
                <AnswerCell />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
