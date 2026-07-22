-- CreateTable
CREATE TABLE "MainTopic" (
    "id" TEXT NOT NULL,
    "nazwa" TEXT NOT NULL,
    "kolejnosc" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MainTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subtopic" (
    "id" TEXT NOT NULL,
    "nazwa" TEXT NOT NULL,
    "kolejnosc" INTEGER NOT NULL DEFAULT 0,
    "mainTopicId" TEXT NOT NULL,

    CONSTRAINT "Subtopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MainTopic_nazwa_key" ON "MainTopic"("nazwa");

-- CreateIndex
CREATE UNIQUE INDEX "Subtopic_mainTopicId_nazwa_key" ON "Subtopic"("mainTopicId", "nazwa");

-- AddForeignKey
ALTER TABLE "Subtopic" ADD CONSTRAINT "Subtopic_mainTopicId_fkey" FOREIGN KEY ("mainTopicId") REFERENCES "MainTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Zadanie" ADD COLUMN "mainTopicId" TEXT;
ALTER TABLE "Zadanie" ADD COLUMN "subtopicId" TEXT;

-- AddForeignKey
ALTER TABLE "Zadanie" ADD CONSTRAINT "Zadanie_mainTopicId_fkey" FOREIGN KEY ("mainTopicId") REFERENCES "MainTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Zadanie" ADD CONSTRAINT "Zadanie_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "Subtopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
