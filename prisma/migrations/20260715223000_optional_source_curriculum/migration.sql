-- Make Pazdro / source curriculum FKs optional
ALTER TABLE "Zadanie" ALTER COLUMN "klasaId" DROP NOT NULL;
ALTER TABLE "Zadanie" ALTER COLUMN "dzialId" DROP NOT NULL;
ALTER TABLE "Zadanie" ALTER COLUMN "tematId" DROP NOT NULL;

-- Defaults for optional task attributes
ALTER TABLE "Zadanie" ALTER COLUMN "typ" SET DEFAULT '';
ALTER TABLE "Zadanie" ALTER COLUMN "poziom" SET DEFAULT 0;
ALTER TABLE "Zadanie" ALTER COLUMN "punkty" SET DEFAULT 0;
ALTER TABLE "Zadanie" ALTER COLUMN "czas" SET DEFAULT 0;
