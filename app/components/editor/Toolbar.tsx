"use client";

type Props = {
  onInsertMath: () => void;
};

export default function Toolbar({
  onInsertMath,
}: Props) {
  return (
    <div className="flex items-center gap-2 border-b border-zinc-700 bg-zinc-800 p-2">

      <button
        className="rounded bg-zinc-700 px-3 py-1 text-white hover:bg-zinc-600"
        onClick={onInsertMath}
      >
        fx
      </button>

    </div>
  );
}