-- Reportes de Chat (CH-T09; D-77, D-86-D-88, D-146, D-147): dos tablas nuevas y vacías.
-- Guardan referencias a los mensajes originales sin copiar su texto; sin estados de revisión ni acceso del personal (D-87).
BEGIN;
-- CreateTable
CREATE TABLE "ChatReport" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedUserId" TEXT NOT NULL,
    "note" VARCHAR(500),
    "clientKey" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatReportMessage" (
    "reportId" INTEGER NOT NULL,
    "messageId" INTEGER NOT NULL,

    CONSTRAINT "ChatReportMessage_pkey" PRIMARY KEY ("reportId","messageId")
);

-- CreateIndex
CREATE INDEX "ChatReport_conversationId_idx" ON "ChatReport"("conversationId");

-- CreateIndex
CREATE INDEX "ChatReport_reportedUserId_idx" ON "ChatReport"("reportedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatReport_reporterId_clientKey_key" ON "ChatReport"("reporterId", "clientKey");

-- CreateIndex
CREATE INDEX "ChatReportMessage_messageId_idx" ON "ChatReportMessage"("messageId");

-- AddForeignKey
ALTER TABLE "ChatReport" ADD CONSTRAINT "ChatReport_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatReport" ADD CONSTRAINT "ChatReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatReport" ADD CONSTRAINT "ChatReport_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatReportMessage" ADD CONSTRAINT "ChatReportMessage_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ChatReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatReportMessage" ADD CONSTRAINT "ChatReportMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- La explicación es opcional, pero si se envía debe tener contenido (D-146).
ALTER TABLE "ChatReport" ADD CONSTRAINT "ChatReport_note_not_blank_check" CHECK ("note" IS NULL OR char_length(btrim("note")) > 0);
COMMIT;
