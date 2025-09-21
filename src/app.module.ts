import { Module } from '@nestjs/common';
import { LectureModule } from './lecture/lecture.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [LectureModule, PrismaModule, QueueModule],
})
export class AppModule {}
