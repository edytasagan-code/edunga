import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile() {
  const envPath = join(__dirname, "..", ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
}

function hasContent(doc) {
  return (
    doc?.paragraphs?.some((p) =>
      p.children.some((n) =>
        n.type === "text"
          ? n.text.trim().length > 0
          : n.type === "math"
            ? n.latex.trim().length > 0
            : false
      )
    ) ?? false
  );
}

loadEnvFile();

const prisma = new PrismaClient();
const targets = ["1.39", "1.40", "1.41"];

try {
  const tasks = await prisma.zadanie.findMany({
    where: { identyfikator: { in: targets } },
    orderBy: { createdAt: "desc" },
    select: {
      kod: true,
      identyfikator: true,
      odpowiedz: true,
      createdAt: true,
    },
  });

  for (const id of targets) {
    const task = tasks.find((t) => t.identyfikator === id);
    console.log(`\n=== DB ${id} ===`);
    if (!task) {
      console.log("Not found");
      continue;
    }
    console.log(task.kod, task.createdAt);
    console.log("Has answer:", hasContent(task.odpowiedz));
    console.log(JSON.stringify(task.odpowiedz, null, 2));
  }
} finally {
  await prisma.$disconnect();
}
