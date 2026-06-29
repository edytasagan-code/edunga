import Card from "./Card";

type Props = {
  title: string;
  children: React.ReactNode;
};

export default function ExampleBox({ title, children }: Props) {
  return (
    <Card>

      <div className="mb-6 flex items-center gap-3">

        <div className="h-4 w-4 rounded-full bg-sky-500" />

        <h2 className="text-2xl font-bold text-white">
          {title}
        </h2>

      </div>

      <div className="leading-8 text-zinc-300">
        {children}
      </div>

    </Card>
  );
}