import { prisma } from "../app/lib/prisma";

async function main() {
  const klasy = await prisma.klasa.findMany({ orderBy: { id: "asc" } });
  const dzialy = await prisma.dzial.findMany({ orderBy: { id: "asc" } });
  const tematy = await prisma.temat.findMany({ orderBy: { id: "asc" } });

  console.log("klasy", klasy.map((item) => item.id));
  console.log("dzialy", dzialy.map((item) => item.id));
  console.log("tematy", tematy.map((item) => item.id));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
