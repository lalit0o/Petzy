-- Adopción (AD-T02, D-89–D-98): cuatro tablas nuevas y vacías, separadas de Post.
-- No modifica filas ni columnas existentes.
BEGIN;

-- CreateEnum
CREATE TYPE "AdoptionStatus" AS ENUM ('SEEKING_HOME', 'FOUND_HOME');

-- CreateEnum
CREATE TYPE "AdoptionReportReason" AS ENUM ('POSSIBLE_SALE', 'MISLEADING_INFO', 'INAPPROPRIATE_CONTENT', 'OTHER');

-- CreateTable
CREATE TABLE "AdoptionListing" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(3000) NOT NULL,
    "status" "AdoptionStatus" NOT NULL DEFAULT 'SEEKING_HOME',
    "petId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdoptionListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdoptionPhoto" (
    "id" SERIAL NOT NULL,
    "listingId" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdoptionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdoptionReport" (
    "id" SERIAL NOT NULL,
    "listingId" INTEGER NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" "AdoptionReportReason" NOT NULL,
    "explanation" VARCHAR(500),
    "snapshotTitle" VARCHAR(120) NOT NULL,
    "snapshotDescription" VARCHAR(3000) NOT NULL,
    "snapshotStatus" "AdoptionStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdoptionReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdoptionReportPhoto" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "AdoptionReportPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdoptionListing_isActive_status_id_idx" ON "AdoptionListing"("isActive", "status", "id");

-- CreateIndex
CREATE INDEX "AdoptionListing_userId_isActive_id_idx" ON "AdoptionListing"("userId", "isActive", "id");

-- CreateIndex
CREATE INDEX "AdoptionPhoto_listingId_idx" ON "AdoptionPhoto"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "AdoptionPhoto_listingId_position_key" ON "AdoptionPhoto"("listingId", "position");

-- CreateIndex
CREATE INDEX "AdoptionReport_listingId_createdAt_idx" ON "AdoptionReport"("listingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdoptionReport_listingId_reporterId_key" ON "AdoptionReport"("listingId", "reporterId");

-- CreateIndex
CREATE INDEX "AdoptionReportPhoto_reportId_idx" ON "AdoptionReportPhoto"("reportId");

-- CreateIndex
CREATE INDEX "AdoptionReportPhoto_storageKey_idx" ON "AdoptionReportPhoto"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "AdoptionReportPhoto_reportId_position_key" ON "AdoptionReportPhoto"("reportId", "position");

-- AddForeignKey
ALTER TABLE "AdoptionListing" ADD CONSTRAINT "AdoptionListing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdoptionListing" ADD CONSTRAINT "AdoptionListing_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdoptionPhoto" ADD CONSTRAINT "AdoptionPhoto_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "AdoptionListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdoptionReport" ADD CONSTRAINT "AdoptionReport_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "AdoptionListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdoptionReport" ADD CONSTRAINT "AdoptionReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdoptionReportPhoto" ADD CONSTRAINT "AdoptionReportPhoto_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "AdoptionReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Reglas extra en la base: textos con contenido y una a tres posiciones de foto.
ALTER TABLE "AdoptionListing" ADD CONSTRAINT "AdoptionListing_title_not_blank_check" CHECK (btrim("title") <> '');
ALTER TABLE "AdoptionListing" ADD CONSTRAINT "AdoptionListing_description_not_blank_check" CHECK (btrim("description") <> '');
ALTER TABLE "AdoptionPhoto" ADD CONSTRAINT "AdoptionPhoto_position_check" CHECK ("position" BETWEEN 0 AND 2);
ALTER TABLE "AdoptionReport" ADD CONSTRAINT "AdoptionReport_explanation_not_blank_check" CHECK ("explanation" IS NULL OR btrim("explanation") <> '');
ALTER TABLE "AdoptionReportPhoto" ADD CONSTRAINT "AdoptionReportPhoto_position_check" CHECK ("position" BETWEEN 0 AND 2);

COMMIT;
