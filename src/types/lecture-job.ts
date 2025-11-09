export interface LectureJob {
  lectureId: string;
  fileUrl: string;
  userId?: string;
  strictCoverage?: boolean;
}

export interface SaveResultInput {
  lectureId: string;
  transcript: string;
  title?: string;
  summary: string;
  outline: string[];
  keywords: string[];
  userId?: string;
  sections?: Array<{
    title: string;
    summary: string;
    bullets?: string[];
  }>;
}
