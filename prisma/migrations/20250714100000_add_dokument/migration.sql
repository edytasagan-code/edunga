CREATE SEQUENCE IF NOT EXISTS dokument_kod_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE "Dokument" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "tytul" TEXT NOT NULL,
    "typ" TEXT NOT NULL,
    "wyswietlanie" JSONB NOT NULL,
    "ukladWydruku" JSONB NOT NULL,
    "elementy" JSONB NOT NULL,
    "zarchiwizowany" BOOLEAN NOT NULL DEFAULT false,
    "autor" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dokument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Dokument_kod_key" ON "Dokument"("kod");
