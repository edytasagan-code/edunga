import type { TableNode } from "../types";

type Props = {
  node: TableNode;
};

export default function TableReadOnly({ node }: Props) {
  const headers = node.headers ?? [];
  const rows = node.rows ?? [];

  return (
    <table
      className="my-2 w-full border-collapse text-sm"
      data-node-type="table"
      data-node-id={node.id}
    >
      {headers.length > 0 ? (
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th
                key={`${node.id}-h-${index}`}
                className="border border-gray-300 px-2 py-1 text-left font-medium"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
      ) : null}
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={`${node.id}-r-${rowIndex}`}>
            {row.map((cell, cellIndex) => (
              <td
                key={`${node.id}-r-${rowIndex}-c-${cellIndex}`}
                className="border border-gray-300 px-2 py-1"
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
