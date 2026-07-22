import { PrismaClient } from "@prisma/client";

import { CURRICULUM_TOPICS } from "../app/lib/curriculum/topics";

const prisma = new PrismaClient();

const KLASY = [
  { id: "1lo", nazwa: "Klasa 1 LO", kolejnosc: 1 },
  { id: "2lo", nazwa: "Klasa 2 LO", kolejnosc: 2 },
  { id: "3lo", nazwa: "Klasa 3 LO", kolejnosc: 3 },
  { id: "4lo", nazwa: "Klasa 4 LO", kolejnosc: 4 },
  { id: "matura", nazwa: "Matura", kolejnosc: 99 },
] as const;

async function seedCurriculumTopics() {
  console.log("Seedowanie tematów głównych (Excel: Zadania wybor pol_Edunga)...");

  const keepMainIds = CURRICULUM_TOPICS.map((t) => t.id);
  const keepSubIds = CURRICULUM_TOPICS.flatMap((t) =>
    t.subtopics.map((s) => s.id)
  );

  // Clear FKs pointing at topics that will be removed
  await prisma.zadanie.updateMany({
    where: {
      OR: [
        { mainTopicId: { notIn: keepMainIds } },
        { subtopicId: { notIn: keepSubIds } },
      ],
    },
    data: {
      mainTopicId: null,
      subtopicId: null,
    },
  });

  await prisma.subtopic.deleteMany({
    where: { id: { notIn: keepSubIds } },
  });

  await prisma.mainTopic.deleteMany({
    where: { id: { notIn: keepMainIds } },
  });

  for (const topic of CURRICULUM_TOPICS) {
    await prisma.mainTopic.upsert({
      where: { id: topic.id },
      update: {
        nazwa: topic.nazwa,
        kolejnosc: topic.kolejnosc,
      },
      create: {
        id: topic.id,
        nazwa: topic.nazwa,
        kolejnosc: topic.kolejnosc,
      },
    });

    for (const sub of topic.subtopics) {
      await prisma.subtopic.upsert({
        where: { id: sub.id },
        update: {
          nazwa: sub.nazwa,
          kolejnosc: sub.kolejnosc,
          mainTopicId: topic.id,
        },
        create: {
          id: sub.id,
          nazwa: sub.nazwa,
          kolejnosc: sub.kolejnosc,
          mainTopicId: topic.id,
        },
      });
    }
  }

  console.log(
    `Tematy główne: ${CURRICULUM_TOPICS.length}; podtematy (tylko Ciągi): ${keepSubIds.length}.`
  );
}

async function main() {
  console.log("Seedowanie klas...");

  for (const klasa of KLASY) {
    await prisma.klasa.upsert({
      where: { id: klasa.id },
      update: {
        nazwa: klasa.nazwa,
        kolejnosc: klasa.kolejnosc,
      },
      create: klasa,
    });
  }

  await seedCurriculumTopics();

  console.log(
    "Klasy gotowe. Program Pazdro (dział/temat) importuj z Excel: npm run import-curriculum -- <plik.xlsx>"
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
