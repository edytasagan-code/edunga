import LessonToc from "./LessonToc";

type Props = {
  title: string;
  subtitle: string;
  toc: string[];
  children: React.ReactNode;
};

export default function LessonLayout({
  title,
  subtitle,
  toc,
  children,
}: Props) {
  return (
    <section className="flex-1 p-10">

      <button className="mb-8 text-zinc-400 transition hover:text-[#F7B500]">
        ← Powrót
      </button>

      <h1 className="text-4xl font-bold text-white">
        {title}
      </h1>

      <p className="mt-2 text-zinc-400">
        {subtitle}
      </p>

      <div className="mt-10 grid grid-cols-[1fr_280px] gap-8">

        <div className="space-y-8">

          {children}

        </div>

        <LessonToc items={toc} />

      </div>

    </section>
  );
}