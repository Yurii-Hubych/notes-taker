import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';

@Injectable()
export class AudioService {
  async splitAudio(
    inputPath: string,
    secondsPerChunk = 600,
  ): Promise<string[]> {
    const dir = path.dirname(inputPath);
    const base = path.basename(inputPath, path.extname(inputPath));
    const outPattern = path.join(dir, `${base}-part-%03d.mp3`);
    const maxBytes = Number(process.env.AUDIO_MAX_BYTES ?? 15 * 1024 * 1024);
    const bitrateBytesPerSec = 16_000; // ~128 kbps

    let stat: fs.Stats;
    try {
      stat = fs.statSync(inputPath);
    } catch (e) {
      throw e;
    }

    // If file already small enough, just transcode to a single mp3 and return
    if (stat.size <= maxBytes) {
      const singleOut = path.join(dir, `${base}-part-001.mp3`);
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .noVideo()
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .audioChannels(1)
          .audioFrequency(16000)
          .save(singleOut)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .on('stderr', (line) => console.error('[ffmpeg]', line));
      });
      return [singleOut];
    }

    // Otherwise: segment so each chunk is below maxBytes
    const safeSeconds = Math.max(
      30,
      Math.min(600, Math.floor(maxBytes / bitrateBytesPerSec) - 2),
    );
    const segmentSeconds = secondsPerChunk ?? safeSeconds;

    // Re-encode to mp3 and segment; stream copy can fail depending on input codecs/containers
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .noVideo()
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .audioChannels(1)
        .audioFrequency(16000)
        .outputOptions([
          '-f',
          'segment',
          '-segment_time',
          String(segmentSeconds),
          '-reset_timestamps',
          '1',
          '-map',
          '0:a:0',
        ])
        .output(outPattern)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .on('stderr', (line) => console.error('[ffmpeg]', line))
        .run();
    });
    console.log('resolved promise');

    let files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith(`${base}-part-`) && f.endsWith('.mp3'))
      .map((f) => path.join(dir, f))
      .sort();
    console.log('files', files);

    if (!files.length) {
      // Fallback: produce a single mp3 chunk if segmentation yielded nothing
      const singleOut = path.join(dir, `${base}-part-001.mp3`);
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .noVideo()
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .audioChannels(1)
          .audioFrequency(16000)
          .save(singleOut)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .on('stderr', (line) => console.error('[ffmpeg]', line));
      });
      files = [singleOut];
    }

    return files;
  }
}
