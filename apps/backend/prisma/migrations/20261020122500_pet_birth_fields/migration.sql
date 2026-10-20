-- The old age in years cannot recover a birth date. Stop if test rows appeared
-- after the inventory, so no birth date is invented or silently discarded.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Pet") THEN
    RAISE EXCEPTION 'Review existing Pet rows before replacing age with birth fields';
  END IF;
END $$;

ALTER TABLE "Pet"
  ADD COLUMN "species" TEXT NOT NULL,
  ADD COLUMN "breed" TEXT NOT NULL,
  ADD COLUMN "birthYear" INTEGER NOT NULL,
  ADD COLUMN "birthMonth" INTEGER NOT NULL,
  ADD COLUMN "birthDay" INTEGER,
  DROP COLUMN "age";

ALTER TABLE "Pet"
  ADD CONSTRAINT "Pet_birth_year_check" CHECK ("birthYear" >= 1),
  ADD CONSTRAINT "Pet_birth_month_check" CHECK ("birthMonth" BETWEEN 1 AND 12),
  ADD CONSTRAINT "Pet_birth_day_check" CHECK ("birthDay" IS NULL OR "birthDay" BETWEEN 1 AND 31);

CREATE INDEX "Pet_ownerId_id_idx" ON "Pet"("ownerId", "id");
