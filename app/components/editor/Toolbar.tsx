"use client";

type Props = {
  onInsertMath: () => void;
};

export default function Toolbar({
  onInsertMath,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-zinc-700 bg-zinc-800 p-2">

      <button
        type="button"
        onClick={onInsertMath}
        className="rounded border border-zinc-600 px-3 py-1 text-white hover:bg-zinc-700"
      >
        ∑
      </button>

      <button
        type="button"
        className="rounded border border-zinc-600 px-3 py-1 text-white"
      >
        √
      </button>

      <button
        type="button"
        className="rounded border border-zinc-600 px-3 py-1 text-white"
      >
        x²
      </button>

      <button
        type="button"
        className="rounded border border-zinc-600 px-3 py-1 text-white"
      >
        x³
      </button>

      <button
        type="button"
        className="rounded border border-zinc-600 px-3 py-1 text-white"
      >
        π
      </button>

    </div>
  );
}