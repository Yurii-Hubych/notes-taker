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
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bullmq';
import { Model } from 'mongoose';
import { PdfJob } from './pdf.types';
import { SupabaseStorageService } from './supabase-storage.service';
import {
  LectureResult,
  LectureResultDocument,
} from '../db/schemas/lecture-result.schema';

@Controller('lectures')
export class PdfController {
  constructor(
    @InjectQueue('pdf-jobs') private readonly pdfQueue: Queue<PdfJob>,
    private readonly supabaseStorage: SupabaseStorageService,
    @InjectModel(LectureResult.name)
    private readonly lectureResultModel: Model<LectureResultDocument>,
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
      const query: any = { lectureId };
      if (userId) {
        query.userId = userId;
      }
      const lecture = await this.lectureResultModel.findOne(query).lean();
      
      if (!lecture) {
        throw new NotFoundException('Lecture result not found');
      }

      const url = await this.supabaseStorage.getSignedPdfUrl(
        lectureId,
        userId,
        lecture.title,
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

