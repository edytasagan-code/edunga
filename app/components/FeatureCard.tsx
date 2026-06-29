import { LucideIcon } from "lucide-react";

type FeatureCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export default function FeatureCard({
  title,
  description,
  icon: Icon,
}: FeatureCardProps) {
  return (
    <button className="rounded-2xl border border-zinc-700 bg-[#252934] p-6 text-left transition hover:border-[#F7B500] hover:-translate-y-1">
      <Icon className="h-8 w-8 text-[#F7B500]" />

      <h2 className="mt-5 text-xl font-bold text-white">
        {title}
      </h2>

      <p className="mt-3 text-zinc-400">
        {description}
      </p>
    </button>
  );
}