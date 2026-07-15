-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('NONE', 'REQUESTED', 'IN_REVIEW', 'CERTIFIED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'TECNICO';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "certificateUrl" TEXT,
ADD COLUMN     "certifiedAt" TIMESTAMP(3),
ADD COLUMN     "reviewRequestedAt" TIMESTAMP(3),
ADD COLUMN     "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "reviewTechnicianId" TEXT;

-- CreateIndex
CREATE INDEX "Project_reviewStatus_idx" ON "Project"("reviewStatus");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_reviewTechnicianId_fkey" FOREIGN KEY ("reviewTechnicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
