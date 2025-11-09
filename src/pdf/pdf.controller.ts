import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PdfJob } from './pdf.types';
import { SupabaseStorageService } from './supabase-storage.service';

@Controller('lectures')
export class PdfController {
  constructor(
    @InjectQueue('pdf-jobs') private readonly pdfQueue: Queue<PdfJob>,
    private readonly supabaseStorage: SupabaseStorageService,
  ) {}

  @Post(':lectureId/pdf')
  async enqueuePdf(
    @Param('lectureId') lectureId: string,
    @Body('userId') userId?: string,
  ) {
    const job = await this.pdfQueue.add(
      'pdf',
      { lectureId, userId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return { ok: true, jobId: job.id };
  }

  @Get(':lectureId/pdf')
  async getPdfSignedUrl(
    @Param('lectureId') lectureId: string,
    @Query('userId') userId?: string,
  ) {
    try {
      const url = await this.supabaseStorage.getSignedPdfUrl(
        lectureId,
        userId,
      );
      return { ok: true, url };
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      throw err;
    }
  }
}

