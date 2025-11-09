import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { PdfGenerationService } from './pdf-generation.service';
import { PdfJob } from './pdf.types';
import { LoggerService } from '../logger/logger.service';

@Injectable()
@Processor('pdf-jobs')
export class PdfQueueProcessor extends WorkerHost {
  constructor(
    private readonly pdfGenerationService: PdfGenerationService,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  async process(job: Job<PdfJob>): Promise<void> {
    const { lectureId, userId } = job.data;
    this.logger.start(lectureId, 'pdf');

    try {
      const { path } = await this.pdfGenerationService.generateForLectureId(
        lectureId,
        userId,
      );
      this.logger.stage(`pdf-uploaded: ${path}`);
      this.logger.done(lectureId);
    } catch (err) {
      this.logger.error(lectureId, err, 'pdf');
      throw err;
    }
  }
}

