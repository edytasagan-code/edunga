import "dotenv/config";
import { PrismaClient } from "@prisma/client";

import { klasy } from "../app/data/program/klasy";
import { dzialy } from "../app/data/program/dzialy";
import { tematy } from "../app/data/program/tematy";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seedowanie bazy...");

  // Klasy
  for (const klasa of klasy) {
    await prisma.klasa.upsert({
      where: { id: klasa.id },
      update: {
        nazwa: klasa.nazwa,
      },
      create: {
        id: klasa.id,
        nazwa: klasa.nazwa,
      },
    });
  }

  // Działy
  for (const dzial of dzialy) {
    await prisma.dzial.upsert({
      where: { id: dzial.id },
      update: {
        nazwa: dzial.nazwa,
        klasaId: dzial.klasaId,
      },
      create: {
        id: dzial.id,
        nazwa: dzial.nazwa,
        klasaId: dzial.klasaId,
      },
    });
  }

  // Tematy
  for (const temat of tematy) {
    await prisma.temat.upsert({
      where: { id: temat.id },
      update: {
        nazwa: temat.nazwa,
        dzialId: temat.dzialId,
      },
      create: {
        id: temat.id,
        nazwa: temat.nazwa,
        dzialId: temat.dzialId,
      },
    });
  }

  console.log("✅ Seed zakończony");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
  