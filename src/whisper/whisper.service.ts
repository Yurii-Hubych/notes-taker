import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import * as fs from 'fs';

@Injectable()
export class WhisperService {
  private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async transcribe(filePath: string): Promise<string> {
    const response = await this.client.audio.transcriptions.create({
      file: fs.createReadStream(filePath) as any,
      model: 'whisper-1',
      response_format: 'text',
    } as any);
    // SDK v4 returns { text }, but v6 uses raw text for 'text' format
    return typeof response === 'string'
      ? response
      : ((response as any).text ?? '');
  }
}
