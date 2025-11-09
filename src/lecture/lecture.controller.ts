import { Body, Controller, Post } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { LectureJob } from '../types/lecture-job';

@Controller('lectures')
export class LectureController {
  constructor(
    @InjectQueue('lecture-jobs') private readonly queue: Queue<LectureJob>,
  ) {}

  /**
   * Enqueue a lecture processing job.
   *
   * @param body.lectureId - Unique identifier for the lecture
   * @param body.fileUrl - URL to the audio file
   * @param body.userId - Optional user identifier
   * @param body.strictCoverage - Optional: Enable high-coverage mode (2-step topic map extraction + enforced coverage)
   */
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
