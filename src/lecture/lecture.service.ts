import { Injectable } from '@nestjs/common';
import { CreateLectureDto } from './dto/create-lecture.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { LectureStatus } from '@prisma/client';

@Injectable()
export class LectureService {
  constructor(private readonly prisma: PrismaService,
    @InjectQueue("transcription") private txQ: Queue,
  ) {}

  async create(createLectureDto: CreateLectureDto) {
    const lecture = await this.prisma.lecture.create({
      data: {
        title: createLectureDto.title,
        language: createLectureDto.language,
        status: LectureStatus.TRANSCRIBING,
      },
    });

    this.txQ.add('transcribe', { lectureId: lecture.id });

    return lecture;
  }

  findAll() {
    return this.prisma.lecture.findMany();
  }
}
