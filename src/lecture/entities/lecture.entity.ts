import { LectureStatus } from '@prisma/client';

export class LectureEntity {
  id: string;
  title: string;
  language: string;
  status: LectureStatus;
  createdAt: Date;
  updatedAt: Date;
}
