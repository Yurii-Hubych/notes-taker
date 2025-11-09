import { LectureResultDocument } from '../db/schemas/lecture-result.schema';

export function buildLectureHtml(
  lecture: LectureResultDocument | any,
): string {
  const title = `Lecture: ${lecture.lectureId}`;
  const createdAt = lecture.createdAt
    ? new Date(lecture.createdAt).toLocaleString()
    : '';

  const outline = (lecture.outline ?? [])
    .map((item: string) => `<li>${item}</li>`)
    .join('');

  const keywords = (lecture.keywords ?? [])
    .map((kw: string) => `<span class="keyword">${kw}</span>`)
    .join(' ');

  const sections = (lecture.sections ?? [])
    .map(
      (section: any) => `
        <section class="section">
          <h2>${section.title}</h2>
          <p>${section.summary}</p>
          ${
            section.bullets && section.bullets.length
              ? `<ul>${section.bullets
                  .map((b: string) => `<li>${b}</li>`)
                  .join('')}</ul>`
              : ''
          }
        </section>
      `,
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin: 40px;
      line-height: 1.5;
    }
    h1, h2, h3 {
      color: #111827;
    }
    h1 { font-size: 26px; margin-bottom: 8px; }
    h2 { font-size: 20px; margin-top: 24px; margin-bottom: 8px; }
    .meta {
      color: #6B7280;
      font-size: 12px;
      margin-bottom: 24px;
    }
    .keywords {
      margin: 12px 0 24px;
    }
    .keyword {
      display: inline-block;
      border-radius: 9999px;
      padding: 2px 10px;
      border: 1px solid #D1D5DB;
      margin: 2px;
      font-size: 11px;
      color: #374151;
    }
    .section {
      margin-bottom: 24px;
    }
    ul {
      margin-left: 20px;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">
    Generated at: ${createdAt}
  </div>

  <h2>Overview</h2>
  <p>${lecture.summary || ''}</p>

  ${
    lecture.outline && lecture.outline.length
      ? `<h2>Outline</h2><ul>${outline}</ul>`
      : ''
  }

  ${
    lecture.keywords && lecture.keywords.length
      ? `<div class="keywords">${keywords}</div>`
      : ''
  }

  ${sections}
</body>
</html>
`;
}

