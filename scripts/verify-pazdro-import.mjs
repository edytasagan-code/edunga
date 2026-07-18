import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.zadanie.findMany({
    where: {
      identyfikator: {
        in: ["1.39", "1.40", "1.148", "1.155"],
      },
    },
    select: {
      id: true,
      kod: true,
      identyfikator: true,
      zrodlo: true,
      tagi: true,
      poziom: true,
      klasaId: true,
      dzialId: true,
      tematId: true,
      tresc: true,
    },
    orderBy: { identyfikator: "asc" },
  });

  console.log(`Found ${tasks.length} sample tasks`);
  for (const task of tasks) {
    const text = JSON.stringify(task.tresc);
    console.log(
      `${task.kod} | ${task.identyfikator} | ${task.zrodlo} | tags=${task.tagi.join(",")} | poziom=${task.poziom} | ${task.klasaId}/${task.dzialId}/${task.tematId} | contentLen=${text.length}`
    );
    console.log(`  editor: http://localhost:3000/nauczyciel/edytor/${task.id}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
