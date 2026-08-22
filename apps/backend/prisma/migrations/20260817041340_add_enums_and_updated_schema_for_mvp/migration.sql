/*
  Warnings:

  - You are about to drop the column `Bio` on the `Pet` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CommunityRol" AS ENUM ('ADMIN', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('GENERAL', 'TIP', 'QUESTION', 'LOST_PET');

-- AlterTable
ALTER TABLE "Pet" DROP COLUMN "Bio",
ADD COLUMN     "bio" TEXT;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "communityId" INTEGER,
ADD COLUMN     "type" "PostType" NOT NULL DEFAULT 'GENERAL';

-- CreateTable
CREATE TABLE "Community" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photoUrl" TEXT,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityMember" (
    "userId" INTEGER NOT NULL,
    "communityId" INTEGER NOT NULL,
    "role" "CommunityRol" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityMember_pkey" PRIMARY KEY ("userId","communityId")
);

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
