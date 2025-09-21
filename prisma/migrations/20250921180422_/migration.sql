-- DropForeignKey
ALTER TABLE "public"."AudioFile" DROP CONSTRAINT "AudioFile_lectureId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Job" DROP CONSTRAINT "Job_lectureId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Lecture" DROP CONSTRAINT "Lecture_transcriptionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."NoteArtifact" DROP CONSTRAINT "NoteArtifact_lectureId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TranscriptionSegment" DROP CONSTRAINT "TranscriptionSegment_transcriptionId_fkey";

-- AddForeignKey
ALTER TABLE "public"."AudioFile" ADD CONSTRAINT "AudioFile_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "public"."Lecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transcription" ADD CONSTRAINT "Transcription_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "public"."Lecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TranscriptionSegment" ADD CONSTRAINT "TranscriptionSegment_transcriptionId_fkey" FOREIGN KEY ("transcriptionId") REFERENCES "public"."Transcription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NoteArtifact" ADD CONSTRAINT "NoteArtifact_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "public"."Lecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Job" ADD CONSTRAINT "Job_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "public"."Lecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
