-- No inventar temas para comunidades anteriores. Requieren asignación explícita.
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Community") THEN
    RAISE EXCEPTION 'Asignar temas reales a las comunidades existentes antes de aplicar esta migración';
  END IF;
END $$;
ALTER TABLE "Community" ADD COLUMN "topic" TEXT NOT NULL;
CREATE TABLE "CommunityExpulsion" (
  "communityId" INTEGER NOT NULL,
  "userId" TEXT NOT NULL,
  "expelledById" TEXT NOT NULL,
  "expelledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityExpulsion_pkey" PRIMARY KEY ("communityId", "userId"),
  CONSTRAINT "CommunityExpulsion_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CommunityExpulsion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CommunityExpulsion_expelledById_fkey" FOREIGN KEY ("expelledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "CommunityExpulsion_userId_communityId_idx" ON "CommunityExpulsion"("userId", "communityId");
CREATE INDEX "CommunityMember_communityId_joinedAt_userId_idx" ON "CommunityMember"("communityId", "joinedAt", "userId");
COMMIT;
