import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

import {
  classDisplayName,
  classIdFromName,
  normalizeClassName,
  normalizeLabel,
  slugify,
} from "../app/lib/curriculum/slug";

const prisma = new PrismaClient();

type CurriculumRow = {
  klasa: string;
  dzial: string;
  temat: string;
};

type ImportStats = {
  klasy: number;
  dzialy: number;
  tematy: number;
  skippedRows: number;
};

function cellValue(
  entry: Record<string, unknown>,
  keys: string[]
): string {
  for (const key of keys) {
    if (key in entry) {
      return String(entry[key] ?? "").trim();
    }
  }

  return "";
}

function readRows(filePath: string): CurriculumRow[] {
  const absolutePath = resolve(filePath);
  const workbook = XLSX.read(readFileSync(absolutePath), {
    type: "buffer",
  });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const rows: CurriculumRow[] = [];

  for (const entry of raw) {
    const klasa = cellValue(entry, ["Klasa", "klasa", "KLASA", "Class"]);
    const dzial = cellValue(entry, [
      "Dział",
      "Dzial",
      "dział",
      "dzial",
      "DZIAL",
      "Department",
    ]);
    const temat = cellValue(entry, ["Temat", "temat", "TEMAT", "Topic"]);

    if (!klasa || !dzial || !temat) {
      continue;
    }

    if (
      normalizeLabel(klasa) === "klasa" &&
      (normalizeLabel(dzial) === "dzial" ||
        normalizeLabel(dzial) === "dział")
    ) {
      continue;
    }

    rows.push({ klasa, dzial, temat });
  }

  return rows;
}

async function resolveUniqueId(
  baseId: string,
  exists: (id: string) => Promise<boolean>
): Promise<string> {
  if (!(await exists(baseId))) {
    return baseId;
  }

  let index = 2;

  while (await exists(`${baseId}-${index}`)) {
    index += 1;
  }

  return `${baseId}-${index}`;
}

async function upsertKlasa(name: string) {
  const normalized = normalizeClassName(name);
  const existing = await prisma.klasa.findMany();
  const match = existing.find(
    (item) => normalizeClassName(item.nazwa) === normalized
  );

  if (match) {
    return match;
  }

  const id = await resolveUniqueId(
    classIdFromName(name),
    async (candidate) =>
      Boolean(await prisma.klasa.findUnique({ where: { id: candidate } }))
  );

  return prisma.klasa.upsert({
    where: { id },
    update: {
      nazwa: classDisplayName(name),
    },
    create: {
      id,
      nazwa: classDisplayName(name),
      kolejnosc: classOrderFromName(name),
    },
  });
}

function classOrderFromName(name: string): number {
  const normalized = normalizeClassName(name);
  const match = normalized.match(/^(\d+)\s*lo$/);

  if (match) {
    return Number(match[1]);
  }

  if (normalized === "matura") {
    return 99;
  }

  return 0;
}

async function upsertDzial(
  klasaId: string,
  nazwa: string,
  kolejnosc: number
) {
  const existing = await prisma.dzial.findFirst({
    where: {
      klasaId,
      nazwa,
    },
  });

  if (existing) {
    return prisma.dzial.update({
      where: { id: existing.id },
      data: { kolejnosc },
    });
  }

  const baseId = slugify(nazwa);
  const id = await resolveUniqueId(baseId, async (candidate) =>
    Boolean(await prisma.dzial.findUnique({ where: { id: candidate } }))
  );

  return prisma.dzial.create({
    data: {
      id,
      nazwa,
      klasaId,
      kolejnosc,
    },
  });
}

async function upsertTemat(
  dzialId: string,
  nazwa: string,
  kolejnosc: number
) {
  const existing = await prisma.temat.findFirst({
    where: {
      dzialId,
      nazwa,
    },
  });

  if (existing) {
    return prisma.temat.update({
      where: { id: existing.id },
      data: { kolejnosc },
    });
  }

  const baseId = slugify(nazwa);
  const id = await resolveUniqueId(baseId, async (candidate) =>
    Boolean(await prisma.temat.findUnique({ where: { id: candidate } }))
  );

  return prisma.temat.create({
    data: {
      id,
      nazwa,
      dzialId,
      kolejnosc,
    },
  });
}

export async function importCurriculumFromExcel(
  filePath: string
): Promise<ImportStats> {
  const rows = readRows(filePath);

  if (rows.length === 0) {
    throw new Error("Nie znaleziono wierszy programu nauczania w pliku Excel.");
  }

  const stats: ImportStats = {
    klasy: 0,
    dzialy: 0,
    tematy: 0,
    skippedRows: 0,
  };

  const touchedKlasy = new Set<string>();
  const dzialOrder = new Map<string, number>();
  const tematOrder = new Map<string, number>();
  const dzialByKey = new Map<string, { id: string }>();
  const tematKeys = new Set<string>();

  for (const row of rows) {
    const klasa = await upsertKlasa(row.klasa);
    touchedKlasy.add(klasa.id);

    const dzialKey = `${klasa.id}::${normalizeLabel(row.dzial)}`;
    let dzial = dzialByKey.get(dzialKey);

    if (!dzial) {
      const kolejnosc = (dzialOrder.get(klasa.id) ?? 0) + 1;
      dzialOrder.set(klasa.id, kolejnosc);
      const saved = await upsertDzial(
        klasa.id,
        row.dzial.trim(),
        kolejnosc
      );
      dzial = { id: saved.id };
      dzialByKey.set(dzialKey, dzial);
      stats.dzialy += 1;
    }

    const tematKey = `${dzial.id}::${normalizeLabel(row.temat)}`;

    if (tematKeys.has(tematKey)) {
      stats.skippedRows += 1;
      continue;
    }

    tematKeys.add(tematKey);
    const kolejnosc = (tematOrder.get(dzial.id) ?? 0) + 1;
    tematOrder.set(dzial.id, kolejnosc);
    await upsertTemat(dzial.id, row.temat.trim(), kolejnosc);
    stats.tematy += 1;
  }

  stats.klasy = touchedKlasy.size;
  return stats;
}

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error(
      "Użycie: npm run import-curriculum -- <ścieżka-do-pliku.xlsx>"
    );
    process.exit(1);
  }

  console.log(`Importowanie programu z: ${resolve(filePath)}`);
  const stats = await importCurriculumFromExcel(filePath);

  console.log("Import zakończony:");
  console.log(`  Klasy: ${stats.klasy}`);
  console.log(`  Działy: ${stats.dzialy}`);
  console.log(`  Tematy: ${stats.tematy}`);
  console.log(`  Pominięte duplikaty tematów: ${stats.skippedRows}`);
}

if (process.argv[1]) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
