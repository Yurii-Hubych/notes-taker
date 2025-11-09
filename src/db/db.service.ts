import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SaveResultInput } from '../types/lecture-job';
import {
  LectureResult,
  LectureResultDocument,
} from './schemas/lecture-result.schema';

@Injectable()
export class DbService {
  constructor(
    @InjectModel(LectureResult.name)
    private readonly lectureResultModel: Model<LectureResultDocument>,
  ) {}

  async saveResult(input: SaveResultInput): Promise<void> {
    const doc = new this.lectureResultModel({ ...input });
    await doc.save();
  }
}
