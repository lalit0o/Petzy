-- D-140: motivo cerrado y nota opcional al retirar contenido de una comunidad.
-- Las retiradas comunitarias anteriores quedan con motivo OTHER (sin nota);
-- las ocultaciones de publicaciones generales (D-56) no tienen motivo.
BEGIN;
CREATE TYPE "RemovalReason" AS ENUM ('SPAM', 'OFFENSIVE', 'HARASSMENT', 'OFF_TOPIC', 'FALSE_INFO', 'OTHER');
ALTER TABLE "ModerationRemoval" ADD COLUMN "reason" "RemovalReason", ADD COLUMN "note" VARCHAR(200);
UPDATE "ModerationRemoval" AS m SET "reason" = 'OTHER'
WHERE (m."postId" IS NOT NULL AND EXISTS (SELECT 1 FROM "Post" p WHERE p."id" = m."postId" AND p."communityId" IS NOT NULL))
   OR (m."commentId" IS NOT NULL AND EXISTS (SELECT 1 FROM "Comment" c JOIN "Post" p ON p."id" = c."postId" WHERE c."id" = m."commentId" AND p."communityId" IS NOT NULL));
COMMIT;
