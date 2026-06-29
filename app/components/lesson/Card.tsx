type Props = {
  children: React.ReactNode;
};

export default function Card({ children }: Props) {
  return (
    <div className="rounded-2xl border border-zinc-700 bg-[#252934] p-8">
      {children}
    </div>
  );
}