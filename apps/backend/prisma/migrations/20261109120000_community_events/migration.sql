-- Eventos de comunidad (D-115, D-116, D-144): tres tablas nuevas y vacías.
-- No modifica Post, User ni Community; no inventa eventos anteriores.
BEGIN;
-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventAttendanceStatus" AS ENUM ('GOING', 'NOT_GOING');

-- CreateEnum
CREATE TYPE "EventNoticeKind" AS ENUM ('CHANGED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "communityId" INTEGER NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(3000) NOT NULL,
    "placeLabel" VARCHAR(200) NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "timeZone" VARCHAR(64) NOT NULL,
    "coverImagePath" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'PUBLISHED',
    "confirmedCountAtStart" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventAttendance" (
    "eventId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "EventAttendanceStatus" NOT NULL,
    "respondedAt" TIMESTAMP(3) NOT NULL,
    "invalidatedAt" TIMESTAMP(3),

    CONSTRAINT "EventAttendance_pkey" PRIMARY KEY ("eventId","userId")
);

-- CreateTable
CREATE TABLE "EventNotice" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "recipientId" TEXT NOT NULL,
    "kind" "EventNoticeKind" NOT NULL,
    "summary" VARCHAR(300) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "pushSentAt" TIMESTAMP(3),
    "changeKey" VARCHAR(120) NOT NULL,

    CONSTRAINT "EventNotice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_communityId_status_startsAt_id_idx" ON "Event"("communityId", "status", "startsAt", "id");

-- CreateIndex
CREATE INDEX "Event_communityId_status_endsAt_id_idx" ON "Event"("communityId", "status", "endsAt", "id");

-- CreateIndex
CREATE INDEX "Event_status_startsAt_idx" ON "Event"("status", "startsAt");

-- CreateIndex
CREATE INDEX "EventAttendance_eventId_status_idx" ON "EventAttendance"("eventId", "status");

-- CreateIndex
CREATE INDEX "EventAttendance_userId_idx" ON "EventAttendance"("userId");

-- CreateIndex
CREATE INDEX "EventNotice_recipientId_createdAt_id_idx" ON "EventNotice"("recipientId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "EventNotice_eventId_idx" ON "EventNotice"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventNotice_recipientId_changeKey_key" ON "EventNotice"("recipientId", "changeKey");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventNotice" ADD CONSTRAINT "EventNotice_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventNotice" ADD CONSTRAINT "EventNotice_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;
