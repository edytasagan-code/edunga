type Props = {
  children: React.ReactNode;
  variant?:
    | "default"
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "outline";
  className?: string;
};

export default function Badge({
  children,
  variant = "default",
  className = "",
}: Props) {
  const variants = {
    default: "bg-zinc-700 text-white",
    primary: "bg-blue-600 text-white",
    success: "bg-green-600 text-white",
    warning: "bg-yellow-400 text-black",
    danger: "bg-red-600 text-white",
    outline: "border border-zinc-400 text-zinc-700 bg-transparent",
  };

  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        px-2.5
        py-1
        text-xs
        font-medium
        transition-colors
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}