-- Exercise variants (A–D) stored as JSON array

ALTER TABLE "Zadanie" ADD COLUMN IF NOT EXISTS "warianty" JSONB;

UPDATE "Zadanie"
SET "warianty" = jsonb_build_array(
  jsonb_build_object(
    'tresc', "tresc",
    'rozwiazanie', "rozwiazanie",
    'odpowiedz', "odpowiedz"
  )
)
WHERE "warianty" IS NULL;

ALTER TABLE "Zadanie" ALTER COLUMN "warianty" SET NOT NULL;
