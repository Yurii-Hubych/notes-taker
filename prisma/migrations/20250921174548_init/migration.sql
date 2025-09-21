-- CreateEnum
CREATE TYPE "public"."LectureStatus" AS ENUM ('QUEUED', 'TRANSCRIBING', 'SUMMARIZING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'FAILED', 'DONE');

-- CreateEnum
CREATE TYPE "public"."JobType" AS ENUM ('TRANSCRIPTION', 'SUMMARIZATION', 'EMBEDDING');

-- CreateTable
CREATE TABLE "public"."Lecture" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "language" TEXT,
    "status" "public"."LectureStatus" NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "transcriptionId" TEXT,

    CONSTRAINT "Lecture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AudioFile" (
    "id" TEXT NOT NULL,
    "lectureId" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudioFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transcription" (
    "id" TEXT NOT NULL,
    "lectureId" TEXT NOT NULL,
    "text" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transcription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TranscriptionSegment" (
    "id" TEXT NOT NULL,
    "transcriptionId" TEXT NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "speakerLabel" TEXT,
    "idx" INTEGER NOT NULL,

    CONSTRAINT "TranscriptionSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NoteArtifact" (
    "id" TEXT NOT NULL,
    "lectureId" TEXT NOT NULL,
    "json" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Job" (
    "id" TEXT NOT NULL,
    "lectureId" TEXT NOT NULL,
    "type" "public"."JobType" NOT NULL,
    "status" "public"."JobStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AudioFile_lectureId_idx" ON "public"."AudioFile"("lectureId");

-- CreateIndex
CREATE UNIQUE INDEX "Transcription_lectureId_key" ON "public"."Transcription"("lectureId");

-- CreateIndex
CREATE INDEX "Transcription_lectureId_idx" ON "public"."Transcription"("lectureId");

-- CreateIndex
CREATE INDEX "TranscriptionSegment_transcriptionId_idx" ON "public"."TranscriptionSegment"("transcriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "NoteArtifact_lectureId_key" ON "public"."NoteArtifact"("lectureId");

-- CreateIndex
CREATE INDEX "NoteArtifact_lectureId_idx" ON "public"."NoteArtifact"("lectureId");

-- CreateIndex
CREATE INDEX "Job_lectureId_idx" ON "public"."Job"("lectureId");

-- AddForeignKey
ALTER TABLE "public"."Lecture" ADD CONSTRAINT "Lecture_transcriptionId_fkey" FOREIGN KEY ("transcriptionId") REFERENCES "public"."Transcription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AudioFile" ADD CONSTRAINT "AudioFile_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "public"."Lecture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TranscriptionSegment" ADD CONSTRAINT "TranscriptionSegment_transcriptionId_fkey" FOREIGN KEY ("transcriptionId") REFERENCES "public"."Transcription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NoteArtifact" ADD CONSTRAINT "NoteArtifact_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "public"."Lecture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Job" ADD CONSTRAINT "Job_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "public"."Lecture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
