import { Processor, WorkerHost } from "@nestjs/bullmq";
import { LectureStatus } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { Job } from "bullmq";

@Processor("summarization")
export class SummarizationProcessor extends WorkerHost {
    constructor(private prisma: PrismaService) { super(); }
    async process(job: Job<any, any, string>): Promise<any> {
      const { lectureId } = job.data;
      await this.prisma.noteArtifact.upsert({
        where: { lectureId },
        update: { json: { outline: [], key_points: ['stub'] } as any },
        create: { lectureId, json: { outline: [], key_points: ['stub'] } as any },
      });
      await this.prisma.lecture.update({ where: { id: lectureId }, data: { status: LectureStatus.READY } });
    }
  }