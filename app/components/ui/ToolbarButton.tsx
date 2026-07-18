"use client";

type Props = {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
};

export default function ToolbarButton({
  children,
  active = false,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`
        h-9
        min-w-9
        px-3
        rounded-md
        border
        text-sm
        transition-colors
        ${
          active
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-white hover:bg-zinc-100 border-zinc-300"
        }
      `}
    >
      {children}
    </button>
  );
}