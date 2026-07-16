-- AlterTable
ALTER TABLE "Klasa" ADD COLUMN "kolejnosc" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Dzial" ADD COLUMN "kolejnosc" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Temat" ADD COLUMN "kolejnosc" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Dzial_klasaId_nazwa_key" ON "Dzial"("klasaId", "nazwa");

-- CreateIndex
CREATE UNIQUE INDEX "Temat_dzialId_nazwa_key" ON "Temat"("dzialId", "nazwa");
