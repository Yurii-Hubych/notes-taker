import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  LectureResult,
  LectureResultDocument,
} from '../db/schemas/lecture-result.schema';
import { PdfService } from './pdf.service';
import { SupabaseStorageService } from './supabase-storage.service';

@Injectable()
export class PdfGenerationService {
  constructor(
    @InjectModel(LectureResult.name)
    private readonly lectureResultModel: Model<LectureResultDocument>,
    private readonly pdfService: PdfService,
    private readonly supabaseStorage: SupabaseStorageService,
  ) {}

  async generateForLectureId(
    lectureId: string,
    userId?: string,
  ): Promise<{ path: string }> {
    const query: any = { lectureId };
    if (userId) {
      query.userId = userId;
    }

    const lecture = await this.lectureResultModel.findOne(query).lean();

    if (!lecture) {
      throw new NotFoundException('Lecture result not found');
    }

    const buffer = await this.pdfService.generatePdfBuffer(lecture);
    const { path } = await this.supabaseStorage.uploadPdf(
      lectureId,
      userId,
      buffer,
      lecture.title,
    );

    return { path };
  }
}
