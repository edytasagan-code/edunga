-- Permanent public task codes (EDU-000001, ...)

CREATE SEQUENCE IF NOT EXISTS zadanie_kod_seq START WITH 1 INCREMENT BY 1;

ALTER TABLE "Zadanie" ADD COLUMN IF NOT EXISTS "kod" TEXT;

WITH numbered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "Zadanie"
  WHERE "kod" IS NULL
)
UPDATE "Zadanie" AS z
SET "kod" = 'EDU-' || LPAD(numbered.rn::text, 6, '0')
FROM numbered
WHERE z."id" = numbered."id";

SELECT setval(
  'zadanie_kod_seq',
  GREATEST(
    COALESCE(
      (
        SELECT MAX(
          NULLIF(
            regexp_replace("kod", '^EDU-', ''),
            ''
          )::integer
        )
        FROM "Zadanie"
      ),
      0
    ),
    1
  )
);

ALTER TABLE "Zadanie" ALTER COLUMN "kod" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Zadanie_kod_key" ON "Zadanie"("kod");
