import Card from "./Card";

type Props = {
  children: React.ReactNode;
};

export default function WarningBox({ children }: Props) {
  return (
    <Card>

      <h2 className="mb-6 text-2xl font-bold text-red-400">
        ⚠ Uważaj
      </h2>

      <div className="leading-8 text-zinc-300">
        {children}
      </div>

    </Card>
  );
}