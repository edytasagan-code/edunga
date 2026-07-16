import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const dzialy = await prisma.dzial.findMany({
    where: { klasaId: "1lo" },
    include: { tematy: true },
    orderBy: { kolejnosc: "asc" },
  });

  for (const dzial of dzialy) {
    console.log(`${dzial.id} | ${dzial.nazwa}`);
    for (const temat of dzial.tematy) {
      console.log(`  - ${temat.id} | ${temat.nazwa}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
