import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as https from 'https';
import * as http from 'http';

@Injectable()
export class StorageService {
  private tmpDir = process.env.TMP_DIR ?? path.resolve(process.cwd(), 'tmp');

  constructor() {
    if (!fs.existsSync(this.tmpDir)) {
      fs.mkdirSync(this.tmpDir, { recursive: true });
    }
  }

  async downloadAudio(fileUrl: string): Promise<string> {
    const parsed = url.parse(fileUrl);
    let fileName = path.basename(parsed.pathname || `audio-${Date.now()}.mp3`);
    // Sanitize filename: decode URL encoding and replace special chars with underscores
    fileName = decodeURIComponent(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const dest = path.join(this.tmpDir, `${Date.now()}-${fileName}`);

    const client = parsed.protocol === 'https:' ? https : http;
    await new Promise<void>((resolve, reject) => {
      const request = client.get(fileUrl, (response) => {
        const status = response.statusCode ?? 0;
        if (status >= 400) {
          reject(new Error(`Download failed: HTTP ${status}`));
          return;
        }
        if (status >= 300 && status < 400) {
          reject(
            new Error(
              `Redirect not followed: HTTP ${status}. Use a direct URL.`,
            ),
          );
          return;
        }
        const stream = fs.createWriteStream(dest);
        response.pipe(stream);
        stream.on('finish', () => stream.close(() => resolve()));
        stream.on('error', reject);
      });
      request.on('error', reject);
    });

    const stat = fs.statSync(dest);
    if (stat.size < 1024) {
      fs.unlinkSync(dest);
      throw new Error(`Downloaded file too small: ${stat.size} bytes`);
    }

    return dest;
  }
}
