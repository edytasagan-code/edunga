type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function DzialPage({ params }: Props) {
  const { slug } = await params;

  return (
    <div className="p-10 text-white">
      {slug}
    </div>
  );
}