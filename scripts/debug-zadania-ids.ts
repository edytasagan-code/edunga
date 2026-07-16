import { prisma } from "../app/lib/prisma";

async function main() {
  const zadania = await prisma.zadanie.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      kod: true,
      klasaId: true,
      dzialId: true,
      tematId: true,
    },
  });

  console.log(JSON.stringify(zadania, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
