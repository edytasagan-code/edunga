type Props = {
  items: string[];
};

export default function LessonToc({ items }: Props) {
  return (
    <aside className="sticky top-24 h-fit rounded-2xl border border-zinc-700 bg-[#252934] p-6">

      <h2 className="mb-6 text-xl font-bold text-white">
        Spis treści
      </h2>

      <ul className="space-y-3">

        {items.map((item) => (
          <li key={item}>
            <a
              href={`#${item}`}
              className="text-zinc-400 transition hover:text-[#F7B500]"
            >
              {item}
            </a>
          </li>
        ))}

      </ul>

    </aside>
  );
}