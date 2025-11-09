import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LectureQueueProcessor } from './queue/lecture.processor';
import { LoggerService } from './logger/logger.service';
import { DbService } from './db/db.service';
import { StorageService } from './storage/storage.service';
import { AudioService } from './audio/audio.service';
import { WhisperService } from './whisper/whisper.service';
import { GptService } from './gpt/gpt.service';
import { PipelineService } from './pipeline/pipeline.service';
import { LectureController } from './lecture/lecture.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import {
  LectureResult,
  LectureResultSchema,
} from './db/schemas/lecture-result.schema';
import { PdfModule } from './pdf/pdf.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: Joi.object({
        MONGO_URI: Joi.string().uri().required(),
        MONGO_DB: Joi.string().default('notes_taker'),
        REDIS_HOST: Joi.string().default('127.0.0.1'),
        REDIS_PORT: Joi.number().default(6379),
        OPENAI_API_KEY: Joi.string().required(),
        OPENAI_MODEL: Joi.string().default('gpt-4o-mini'),
        TMP_DIR: Joi.string().optional(),
        SUPABASE_URL: Joi.string().uri().required(),
        SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
        SUPABASE_STORAGE_PDF_BUCKET: Joi.string().default('lecture-pdfs'),
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST'),
          port: Number(config.get<number>('REDIS_PORT')),
        },
      }),
    }),
    BullModule.registerQueue(
      {
        name: 'lecture-jobs',
      },
      {
        name: 'pdf-jobs',
      },
    ),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
        dbName: config.get<string>('MONGO_DB'),
      }),
    }),
    MongooseModule.forFeature([
      { name: LectureResult.name, schema: LectureResultSchema },
    ]),
    PdfModule,
  ],
  controllers: [LectureController],
  providers: [
    LoggerService,
    DbService,
    StorageService,
    AudioService,
    WhisperService,
    GptService,
    PipelineService,
    LectureQueueProcessor,
  ],
})
export class AppModule {}
