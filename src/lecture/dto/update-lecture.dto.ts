import { PartialType } from '@nestjs/mapped-types';
import { CreateLectureDto } from './create-lecture.dto';
import { LectureStatus } from '@prisma/client';

export class UpdateLectureDto extends PartialType(CreateLectureDto) {
  title?: string;
  language?: string;
  status?: LectureStatus;
}
