import { Module } from '@nestjs/common';
import { LectureService } from './lecture.service';
import { LectureController } from './lecture.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { QueueModule } from 'src/queue/queue.module';

@Module({
  imports: [PrismaModule, QueueModule],
  controllers: [LectureController],
  providers: [LectureService],
})
export class LectureModule {}
