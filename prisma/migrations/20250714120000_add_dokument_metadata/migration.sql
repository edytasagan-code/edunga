-- AlterTable
ALTER TABLE "Dokument" ADD COLUMN "klasa" TEXT NOT NULL DEFAULT 'cross-grade';
ALTER TABLE "Dokument" ADD COLUMN "poziom" TEXT NOT NULL DEFAULT 'pp';
ALTER TABLE "Dokument" ADD COLUMN "opis" TEXT;

-- Migrate legacy document types
UPDATE "Dokument" SET "typ" = 'sprawdzian' WHERE "typ" IN ('test', 'worksheet', 'homework');
UPDATE "Dokument" SET "typ" = 'kartkowka' WHERE "typ" = 'quiz';
