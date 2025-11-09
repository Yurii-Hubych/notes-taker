import { Body, Controller, Post } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { LectureJob } from '../types/lecture-job';

@Controller('lectures')
export class LectureController {
  constructor(
    @InjectQueue('lecture-jobs') private readonly queue: Queue<LectureJob>,
  ) {}

  @Post('enqueue')
  async enqueue(@Body() body: LectureJob) {
    if (!body?.lectureId || !body?.fileUrl) {
      return { ok: false, error: 'lectureId and fileUrl are required' };
    }
    const job = await this.queue.add('lecture', body, {
      attempts: 1,
      backoff: { type: 'exponential', delay: 10_000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
    return { ok: true, jobId: job.id };
  }
}
