import { Injectable } from '@nestjs/common';
import { CreateLectureDto } from './dto/create-lecture.dto';
import { UpdateLectureDto } from './dto/update-lecture.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class LectureService {
  constructor(private readonly prisma: PrismaService,
    @InjectQueue("transcription") private txQ: Queue,
  ) {}

  create(createLectureDto: CreateLectureDto) {
    const lecture = await this.prisma.lecture.create({
      data: {
        title: createLectureDto.title,
        language: createLectureDto.language,
        status: createLectureDto.status,
      },
    });

    this.txQ.add('transcribe', { lectureId: lecture.id });

    return lecture;
  }

  findAll() {
    return this.prisma.lecture.findMany();
  }
}
