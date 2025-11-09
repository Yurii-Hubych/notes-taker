import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({
  collection: 'lecture_results',
  timestamps: { createdAt: true, updatedAt: false },
})
export class LectureResult {
  @Prop({ required: true })
  lectureId!: string;

  @Prop()
  userId?: string;

  @Prop({ required: true })
  transcript!: string;

  @Prop({ required: true })
  summary!: string;

  @Prop({ type: [String], default: [] })
  outline!: string[];

  @Prop({ type: [String], default: [] })
  keywords!: string[];

  @Prop({
    type: [
      {
        title: { type: String, required: true },
        summary: { type: String, required: true },
        bullets: { type: [String], default: [] },
      },
    ],
    default: [],
  })
  sections?: Array<{ title: string; summary: string; bullets?: string[] }>;

  @Prop({ type: Date })
  createdAt!: Date;
}

export type LectureResultDocument = HydratedDocument<LectureResult>;
export const LectureResultSchema = SchemaFactory.createForClass(LectureResult);
