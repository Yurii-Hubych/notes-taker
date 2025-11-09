import { Injectable } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { WhisperService } from '../whisper/whisper.service';
import { GptService } from '../gpt/gpt.service';
import { DbService } from '../db/db.service';
import { LoggerService } from '../logger/logger.service';
import { AudioService } from '../audio/audio.service';
import { LectureJob } from '../types/lecture-job';
import * as fsp from 'fs/promises';

@Injectable()
export class PipelineService {
  constructor(
    private readonly storage: StorageService,
    private readonly audio: AudioService,
    private readonly whisper: WhisperService,
    private readonly gpt: GptService,
    private readonly db: DbService,
    private readonly logger: LoggerService,
  ) {}

  async run(job: LectureJob): Promise<void> {
    const filesToCleanup = new Set<string>();
    try {
      this.logger.start(job.lectureId, 'download');
      const tmpFile = await this.storage.downloadAudio(job.fileUrl);
      filesToCleanup.add(tmpFile);

      this.logger.stage('split');
      const chunks = await this.audio.splitAudio(tmpFile);
      for (const c of chunks) filesToCleanup.add(c);

      console.log('chunks', chunks);
      this.logger.stage('transcribe');
      // Transcribe all chunks in parallel, preserving order
      const transcripts = await Promise.all(
        chunks.map((chunk, idx) => {
          console.log(`transcribe chunk ${idx + 1}/${chunks.length}:`, chunk);
          return this.whisper.transcribe(chunk);
        }),
      );

      const fullText = transcripts.join(' ');

      this.logger.stage('summarize');
      const summary = await this.gpt.summarize(fullText, {
        strictCoverage: job.strictCoverage,
      });

      this.logger.stage('save');
      await this.db.saveResult({
        lectureId: job.lectureId,
        transcript: fullText,
        ...summary,
        userId: job.userId,
      });

      this.logger.done(job.lectureId);
    } catch (err) {
      this.logger.error(job.lectureId, err, 'pipeline');
      throw err;
    } finally {
      if (!process.env.KEEP_TMP) {
        for (const f of filesToCleanup) {
          try {
            await fsp.unlink(f);
          } catch {}
        }
      }
    }
  }
}
