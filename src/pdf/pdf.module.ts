import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MongooseModule } from '@nestjs/mongoose';
import { PdfController } from './pdf.controller';
import { PdfQueueProcessor } from './pdf.processor';
import { PdfGenerationService } from './pdf-generation.service';
import { PdfService } from './pdf.service';
import { SupabaseStorageService } from './supabase-storage.service';
import { LoggerService } from '../logger/logger.service';
import {
  LectureResult,
  LectureResultSchema,
} from '../db/schemas/lecture-result.schema';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'pdf-jobs',
    }),
    MongooseModule.forFeature([
      { name: LectureResult.name, schema: LectureResultSchema },
    ]),
  ],
  controllers: [PdfController],
  providers: [
    LoggerService,
    PdfQueueProcessor,
    PdfGenerationService,
    PdfService,
    SupabaseStorageService,
  ],
})
export class PdfModule {}
