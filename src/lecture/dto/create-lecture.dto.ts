import { LectureStatus } from '@prisma/client';

export class CreateLectureDto {
  title?: string;
  language?: string;
  status?: LectureStatus;
}
