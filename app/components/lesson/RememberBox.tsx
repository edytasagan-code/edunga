import Card from "./Card";

type Props = {
  children: React.ReactNode;
};

export default function RememberBox({ children }: Props) {
  return (
    <Card>

      <h2 className="mb-6 text-2xl font-bold text-green-400">
        ✅ Zapamiętaj
      </h2>

      <div className="leading-8 text-zinc-300">
        {children}
      </div>

    </Card>
  );
}