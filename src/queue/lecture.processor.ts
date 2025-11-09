import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PipelineService } from '../pipeline/pipeline.service';
import { LectureJob } from '../types/lecture-job';

@Processor('lecture-jobs')
export class LectureQueueProcessor extends WorkerHost {
  constructor(private readonly pipeline: PipelineService) {
    super();
  }

  async process(job: Job<LectureJob>): Promise<void> {
    await this.pipeline.run(job.data);
  }
}
