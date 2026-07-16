import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";

import { editorDocumentToPlainPreview } from "../app/lib/import/textToDocument.ts";
import { getImportSession } from "../app/lib/import/sessionStore.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sessionId = process.argv[2] ?? "a416c580-7e74-4bea-85b2-62e5dc65a049";
const targets = ["1.39", "1.40", "1.41"];

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

const session = getImportSession(sessionId);
if (!session) {
  console.error("Session not found:", sessionId);
  process.exit(1);
}

const prisma = new PrismaClient();
const dbTasks = await prisma.zadanie.findMany({
  where: { identyfikator: { in: targets }, kod: { startsWith: "EDU-00005" } },
  orderBy: { createdAt: "desc" },
  select: { kod: true, identyfikator: true, odpowiedz: true },
});

for (const target of targets) {
  const ex = session.exercises.find((e) => e.number === target);
  const db = dbTasks.find((t) => t.identyfikator === target);

  console.log("\n" + "=".repeat(60));
  console.log("EXERCISE", target);
  console.log("=".repeat(60));
  console.log("\nImport session odpowiedz:");
  console.log("  has content:", ex ? hasContent(ex.odpowiedz) : false);
  console.log(
    "  preview:",
    ex ? editorDocumentToPlainPreview(ex.odpowiedz) : "(missing)"
  );
  console.log("\nDB odpowiedz (" + (db?.kod ?? "n/a") + "):");
  console.log("  has content:", db ? hasContent(db.odpowiedz) : false);
  console.log(
    "  preview:",
    db ? editorDocumentToPlainPreview(db.odpowiedz) : "(missing)"
  );
}

await prisma.$disconnect();
