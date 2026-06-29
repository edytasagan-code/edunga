import Navbar from "../../../../components/Navbar";
import Sidebar from "../../../../components/Sidebar";

import LessonLayout from "../../../../components/lesson/LessonLayout";
import InfoBox from "../../../../components/lesson/InfoBox";
import ExampleBox from "../../../../components/lesson/ExampleBox";
import WarningBox from "../../../../components/lesson/WarningBox";
import RememberBox from "../../../../components/lesson/RememberBox";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function TeoriaPage({ params }: Props) {
  const { slug } = await params;

  return (
    <>
      <Navbar />

      <main className="flex min-h-screen bg-[#1E2128]">
        <Sidebar />

        <LessonLayout
          title={slug.replaceAll("-", " ")}
          subtitle="Klasa 1 LO • Matematyka"
          toc={[
            "Definicja",
            "Przykład",
            "Uwaga",
            "Zapamiętaj",
          ]}
        >
          <InfoBox title="Definicja">
            <p>
              Zbiór jest dobrze określoną grupą elementów.
            </p>

            <p>
              Każdy element należy do zbioru lub do niego nie należy.
            </p>
          </InfoBox>

          <ExampleBox title="Przykład">
            <p>A = {"{1,2,3,4}"}</p>

            <p>2 ∈ A</p>

            <p>5 ∉ A</p>
          </ExampleBox>

          <WarningBox>
            <p>
              Nie myl symbolu ∈ z symbolem ⊂.
            </p>
          </WarningBox>

          <RememberBox>
            <ul className="list-disc pl-6">
              <li>∈ oznacza „należy do zbioru”.</li>
              <li>∉ oznacza „nie należy do zbioru”.</li>
            </ul>
          </RememberBox>

        </LessonLayout>
      </main>
    </>
  );
}