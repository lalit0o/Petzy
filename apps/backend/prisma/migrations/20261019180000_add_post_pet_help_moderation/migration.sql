-- Existing categories retain their stored values.
ALTER TYPE "PostType" ADD VALUE IF NOT EXISTS 'HELP';

-- Existing posts receive NULL and remain unlinked to a pet.
ALTER TABLE "Post" ADD COLUMN "petId" INTEGER;
CREATE INDEX "Post_petId_idx" ON "Post"("petId");
ALTER TABLE "Post" ADD CONSTRAINT "Post_petId_fkey"
  FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ModerationRemoval" (
  "id" SERIAL NOT NULL,
  "postId" INTEGER,
  "commentId" INTEGER,
  "moderatorId" TEXT NOT NULL,
  "removedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "restoredAt" TIMESTAMP(3),
  "restoredById" TEXT,
  CONSTRAINT "ModerationRemoval_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ModerationRemoval_one_target_check"
    CHECK (("postId" IS NOT NULL) <> ("commentId" IS NOT NULL)),
  CONSTRAINT "ModerationRemoval_restoration_pair_check"
    CHECK (("restoredAt" IS NULL) = ("restoredById" IS NULL))
);

CREATE INDEX "ModerationRemoval_postId_idx" ON "ModerationRemoval"("postId");
CREATE INDEX "ModerationRemoval_commentId_idx" ON "ModerationRemoval"("commentId");
CREATE INDEX "ModerationRemoval_moderatorId_idx" ON "ModerationRemoval"("moderatorId");
CREATE INDEX "ModerationRemoval_restoredById_idx" ON "ModerationRemoval"("restoredById");
CREATE UNIQUE INDEX "ModerationRemoval_open_post_key"
  ON "ModerationRemoval"("postId") WHERE "postId" IS NOT NULL AND "restoredAt" IS NULL;
CREATE UNIQUE INDEX "ModerationRemoval_open_comment_key"
  ON "ModerationRemoval"("commentId") WHERE "commentId" IS NOT NULL AND "restoredAt" IS NULL;

ALTER TABLE "ModerationRemoval" ADD CONSTRAINT "ModerationRemoval_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ModerationRemoval" ADD CONSTRAINT "ModerationRemoval_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ModerationRemoval" ADD CONSTRAINT "ModerationRemoval_moderatorId_fkey"
  FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ModerationRemoval" ADD CONSTRAINT "ModerationRemoval_restoredById_fkey"
  FOREIGN KEY ("restoredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
