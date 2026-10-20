-- A technical update (hide or restore) must not mark a comment as edited.
-- Existing comments have no proven text-edit time, so editedAt starts NULL.
ALTER TABLE "Comment" ADD COLUMN "editedAt" TIMESTAMP(3);
