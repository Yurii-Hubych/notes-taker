import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseStorageService {
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !key) {
      throw new Error('Supabase config is missing');
    }

    this.client = createClient(url, key);
    this.bucket =
      this.configService.get<string>('SUPABASE_STORAGE_PDF_BUCKET') ??
      'lecture-pdfs';
  }

  private buildPdfPath(lectureId: string, userId?: string): string {
    const safeUserId =
      userId && userId.trim().length > 0 ? userId : 'anonymous';
    return `${safeUserId}/${lectureId}.pdf`;
  }

  async uploadPdf(
    lectureId: string,
    userId: string | undefined,
    buffer: Buffer,
  ): Promise<{ path: string }> {
    const filePath = this.buildPdfPath(lectureId, userId);

    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) {
      throw new InternalServerErrorException(
        `Failed to upload PDF to Supabase: ${error.message}`,
      );
    }

    return { path: filePath };
  }

  async getSignedPdfUrl(
    lectureId: string,
    userId?: string,
    expiresInSeconds = 60 * 60,
  ): Promise<string> {
    const filePath = this.buildPdfPath(lectureId, userId);

    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(filePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new NotFoundException('PDF not found in Supabase storage');
    }

    return data.signedUrl;
  }
}

