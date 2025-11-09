import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggerService {
  private readonly logger = new Logger('Pipeline');

  start(lectureId: string, stage: string): void {
    this.logger.log(`lecture=${lectureId} start stage=${stage}`);
  }

  stage(stage: string): void {
    this.logger.log(`stage=${stage}`);
  }

  done(lectureId: string): void {
    this.logger.log(`lecture=${lectureId} done`);
  }

  error(lectureId: string, err: unknown, stage?: string): void {
    const message = err instanceof Error ? err.message : String(err);
    this.logger.error(
      `lecture=${lectureId} stage=${stage ?? 'unknown'} error=${message}`,
    );
  }
}
