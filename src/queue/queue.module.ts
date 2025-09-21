import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'transcription',
    }),
    BullModule.registerQueue({
      name: 'summarization',
    }),
  ],
})
export class QueueModule {}
