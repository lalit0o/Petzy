-- D-142: el autor confirma con «Entendido» el aviso de una retirada comunitaria.
-- Las retiradas anteriores a esta función se marcan como vistas para no
-- avisar de golpe sobre contenido retirado antes de que existiera el aviso.
BEGIN;
ALTER TABLE "ModerationRemoval" ADD COLUMN "acknowledgedAt" TIMESTAMP(3);
UPDATE "ModerationRemoval" SET "acknowledgedAt" = CURRENT_TIMESTAMP;
CREATE INDEX "ModerationRemoval_acknowledgedAt_idx" ON "ModerationRemoval"("acknowledgedAt");
COMMIT;
