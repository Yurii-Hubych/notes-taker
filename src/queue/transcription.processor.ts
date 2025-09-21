import { Processor, WorkerHost } from '@nestjs/bullmq';
import { LectureService } from 'src/lecture/lecture.service';
import { Job, Queue } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { LectureStatus } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';

@Processor('transcription')
export class TranscriptionProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('summarization') private sumQ: Queue,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { lectureId } = job.data;

    await this.prisma.transcription.upsert({
      where: {
        lectureId,
      },
      update: {
        text: job.data.text,
      },
      create: {
        lectureId,
        text: job.data.text,
      },
    });

    await this.prisma.lecture.update({
      where: {
        id: lectureId,
      },
      data: {
        status: LectureStatus.SUMMARIZING,
      },
    });

    await this.sumQ.add('summarize', { lectureId });
  }
}
