export interface LectureJob {
  lectureId: string;
  fileUrl: string;
  userId?: string;
}

export interface SaveResultInput {
  lectureId: string;
  transcript: string;
  summary: string;
  outline: string[];
  keywords: string[];
  userId?: string;
  sections?: Array<{
    title: string;
    summary: string; // multi-paragraph allowed
    bullets?: string[];
  }>;
}
