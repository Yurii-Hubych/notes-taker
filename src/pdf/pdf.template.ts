import { LectureResultDocument } from '../db/schemas/lecture-result.schema';

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Extracts fenced code blocks from text and replaces them with placeholders.
 * Returns the modified text and a map of placeholders to rendered HTML.
 */
function extractCodeBlocks(text: string): {
  text: string;
  codeBlocks: Map<string, string>;
} {
  const codeBlocks = new Map<string, string>();
  let counter = 0;

  // Match fenced code blocks: ```language\ncode\n```
  // Captures optional language label and the code content
  // The closing ``` should be on its own line, but we handle both cases
  const fenceRegex = /```([a-zA-Z0-9+#\-]*)\n([\s\S]*?)\n```/g;

  const processedText = text.replace(fenceRegex, (match, language, code) => {
    const placeholder = `__CODE_BLOCK_${counter}__`;

    // Escape HTML in code content
    const escapedCode = escapeHtml(code);

    // Build the HTML for this code block
    const languageClass =
      language && language.trim().length > 0
        ? ` class="language-${language.trim().toLowerCase()}"`
        : '';

    const codeBlockHtml = `<pre class="code-block"><code${languageClass}>${escapedCode}</code></pre>`;

    codeBlocks.set(placeholder, codeBlockHtml);
    counter++;

    return placeholder;
  });

  return { text: processedText, codeBlocks };
}

function highlightSpecialContent(text: string): string {
  const lines = text.split('\n');
  const processed: string[] = [];
  let inExample = false;
  let exampleBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    const isExampleLine =
      /^(Example\s+\d+|Step\s+\d+|Exercise\s+\d+|Note:|Important:|Definition:)/i.test(
        line,
      );
    const isNumberedStep = /^\d+[\.)]\s+/.test(line);

    if (isExampleLine || isNumberedStep) {
      if (!inExample) {
        inExample = true;
        exampleBuffer = [line];
      } else {
        exampleBuffer.push(line);
      }
    } else if (line.length === 0 && inExample) {
      processed.push(
        `<div class="example">${exampleBuffer.join('<br />')}</div>`,
      );
      exampleBuffer = [];
      inExample = false;
      processed.push(line);
    } else if (inExample) {
      exampleBuffer.push(line);
    } else {
      processed.push(line);
    }
  }

  if (inExample && exampleBuffer.length > 0) {
    processed.push(
      `<div class="example">${exampleBuffer.join('<br />')}</div>`,
    );
  }

  return processed.join('\n');
}

function preserveMathAndEscape(
  text: string,
  skipEscape: boolean = false,
): string {
  const mathPlaceholders: string[] = [];
  let counter = 0;

  let result = text.replace(/\$\$([\s\S]+?)\$\$/g, (match) => {
    const placeholder = `__MATH_DISPLAY_${counter}__`;
    mathPlaceholders.push(match);
    counter++;
    return placeholder;
  });

  result = result.replace(/\$([^\$\n]+?)\$/g, (match) => {
    const placeholder = `__MATH_INLINE_${counter}__`;
    mathPlaceholders.push(match);
    counter++;
    return placeholder;
  });

  result = result.replace(/\\\[([\s\S]+?)\\\]/g, (match) => {
    const placeholder = `__MATH_DISPLAY_${counter}__`;
    mathPlaceholders.push(match);
    counter++;
    return placeholder;
  });

  result = result.replace(/\\\(([^)]+?)\\\)/g, (match) => {
    const placeholder = `__MATH_INLINE_${counter}__`;
    mathPlaceholders.push(match);
    counter++;
    return placeholder;
  });

  result = escapeHtml(result);

  mathPlaceholders.forEach((math, index) => {
    result = result.replace(`__MATH_DISPLAY_${index}__`, math);
    result = result.replace(`__MATH_INLINE_${index}__`, math);
  });

  return result;
}

function normalizeLatex(text: string): string {
  return text
    .replace(/\u000crac/g, '\\frac')
    .replace(/(\$|\\\[|\\\()([^$\\]*)rac\{/g, '$1$2\\frac{');
}

function convertSimpleMarkdown(text: string): string {
  let result = text;

  result = result.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');

  result = result.replace(
    /(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/g,
    '<em>$1</em>',
  );

  result = result.replace(/`([^`\n]+?)`/g, '<code>$1</code>');

  return result;
}

export function toParagraphs(text: string): string {
  if (!text) return '';

  // Step 1: Extract fenced code blocks and replace with placeholders
  const { text: textWithoutCode, codeBlocks } = extractCodeBlocks(text);

  // Step 2: Process the text without code blocks (preserving math, markdown, etc.)
  const normalized = normalizeLatex(textWithoutCode);
  const escaped = preserveMathAndEscape(normalized, true);
  const markdownConverted = convertSimpleMarkdown(escaped);

  const withHighlights = highlightSpecialContent(markdownConverted);

  // Step 3: Split into paragraphs (while placeholders are still in place)
  const paragraphs = withHighlights
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter((para) => para.length > 0);

  // Step 4: Wrap paragraphs appropriately and restore code blocks
  const htmlParagraphs = paragraphs.map((para) => {
    // Check if this paragraph contains a code block placeholder
    const hasCodeBlock = Array.from(codeBlocks.keys()).some((placeholder) =>
      para.includes(placeholder),
    );

    // If it's a code block placeholder by itself, restore it without wrapping
    if (hasCodeBlock && para.match(/^__CODE_BLOCK_\d+__$/)) {
      let restored = para;
      codeBlocks.forEach((html, placeholder) => {
        restored = restored.replace(placeholder, html);
      });
      return restored;
    }

    // Don't wrap <div> or <pre> blocks in <p> tags
    if (para.startsWith('<div') || para.startsWith('<pre')) {
      return para;
    }

    // For regular paragraphs, restore code blocks and wrap
    let processed = para;
    codeBlocks.forEach((html, placeholder) => {
      processed = processed.replace(placeholder, html);
    });

    const withBreaks = processed.replace(/\n/g, '<br />');
    return `<p>${withBreaks}</p>`;
  });

  return htmlParagraphs.join('\n');
}

export function buildLectureHtml(lecture: LectureResultDocument | any): string {
  const title =
    lecture.title && lecture.title.trim().length > 0
      ? lecture.title
      : `Lecture ${lecture.lectureId}`;

  const createdAt = lecture.createdAt
    ? new Date(lecture.createdAt).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'N/A';

  const userId = lecture.userId || 'Anonymous';
  const lectureId = lecture.lectureId || 'N/A';

  const tocHtml =
    lecture.outline && lecture.outline.length > 0
      ? `
      <div class="toc">
        <h3>Table of Contents</h3>
        <ol>
          ${lecture.outline.map((item: string) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ol>
      </div>
    `
      : '';

  const keywords = (lecture.keywords ?? [])
    .map((kw: string) => `<span class="keyword">${escapeHtml(kw)}</span>`)
    .join(' ');

  const keywordsHtml =
    lecture.keywords && lecture.keywords.length > 0
      ? `
      <div class="keywords-section">
        <h3>Key Terms</h3>
        <div class="keywords">${keywords}</div>
      </div>
    `
      : '';

  const sections = (lecture.sections ?? [])
    .map(
      (section: any) => `
        <section class="section">
          <h2>${escapeHtml(section.title || '')}</h2>
          ${toParagraphs(section.summary || '')}
          ${
            section.bullets && section.bullets.length
              ? `<ul class="bullet-list">${section.bullets
                  .map((b: string) => `<li>${escapeHtml(b)}</li>`)
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  
  <!-- KaTeX for math rendering -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
  
  <style>
    /* ===== Base Typography ===== */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.7;
      color: #111827;
      margin: 50px 60px;
      background: #ffffff;
    }
    
    /* ===== Document Header (Metadata) ===== */
    .document-header {
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 16px;
      margin-bottom: 32px;
      color: #6b7280;
      font-size: 9pt;
      font-family: system-ui, -apple-system, sans-serif;
    }
    
    .document-header .header-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    
    .document-header .label {
      font-weight: 600;
      color: #374151;
    }
    
    /* ===== Main Title ===== */
    h1 {
      font-size: 28pt;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 24px;
      line-height: 1.2;
      text-align: left;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 12px;
    }
    
    /* ===== Section Headings ===== */
    h2 {
      font-size: 18pt;
      font-weight: 600;
      color: #1f2937;
      margin-top: 32px;
      margin-bottom: 16px;
      border-left: 4px solid #3b82f6;
      padding-left: 12px;
    }
    
    h3 {
      font-size: 14pt;
      font-weight: 600;
      color: #374151;
      margin-top: 20px;
      margin-bottom: 12px;
    }
    
    /* ===== Paragraphs ===== */
    p {
      margin-bottom: 1.2em;
      text-align: justify;
      hyphens: auto;
    }

    /* ===== Inline Formatting ===== */
    strong {
      font-weight: 600;
      color: #1f2937;
    }
    
    em {
      font-style: italic;
    }
    
    code {
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.9em;
      color: #dc2626;
    }
    
    /* ===== Code Blocks ===== */
    pre.code-block {
      background: #111827;
      color: #f9fafb;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 9pt;
      padding: 12px 16px;
      border-radius: 6px;
      margin: 16px 0;
      overflow-x: auto;
      white-space: pre;
      page-break-inside: avoid;
    }
    
    pre.code-block code {
      font-family: inherit;
      background: transparent;
      padding: 0;
      color: inherit;
      border-radius: 0;
    }
    
    /* ===== Table of Contents ===== */
    .toc {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px 24px;
      margin: 24px 0 32px 0;
      page-break-inside: avoid;
    }
    
    .toc h3 {
      margin-top: 0;
      margin-bottom: 12px;
      color: #1f2937;
      font-size: 13pt;
    }
    
    .toc ol {
      margin-left: 24px;
      line-height: 1.8;
    }
    
    .toc li {
      margin-bottom: 6px;
      color: #374151;
    }
    
    /* ===== Keywords Section ===== */
    .keywords-section {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px 20px;
      margin: 24px 0;
      border-radius: 6px;
      page-break-inside: avoid;
    }
    
    .keywords-section h3 {
      margin-top: 0;
      margin-bottom: 10px;
      color: #92400e;
      font-size: 12pt;
    }
    
    .keywords {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .keyword {
      display: inline-block;
      background: #ffffff;
      border: 1px solid #fbbf24;
      border-radius: 16px;
      padding: 4px 12px;
      font-size: 9pt;
      color: #92400e;
      font-weight: 500;
      font-family: system-ui, sans-serif;
    }
    
    /* ===== Example/Step Highlighting ===== */
    .example {
      background: #f0f9ff;
      border-left: 4px solid #3b82f6;
      padding: 12px 16px;
      margin: 16px 0;
      border-radius: 6px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 10pt;
      line-height: 1.6;
      page-break-inside: avoid;
    }
    
    /* ===== Math Rendering (KaTeX) ===== */
    .katex-display {
      margin: 16px 0;
      overflow-x: auto;
      overflow-y: hidden;
    }
    
    .katex {
      font-size: 1.1em;
    }
    
    /* ===== Lists ===== */
    ul.bullet-list {
      margin: 12px 0 16px 32px;
      line-height: 1.8;
    }
    
    ul.bullet-list li {
      margin-bottom: 8px;
      padding-left: 8px;
    }
    
    ol {
      margin: 12px 0 16px 32px;
      line-height: 1.8;
    }
    
    ol li {
      margin-bottom: 8px;
      padding-left: 8px;
    }
    
    /* ===== Sections ===== */
    .section {
      margin-bottom: 32px;
      page-break-before: always;
      page-break-inside: avoid;
    }
    
    .section:first-of-type {
      page-break-before: auto;
    }
    
    /* ===== Page Settings ===== */
    @page {
      margin: 20mm;
    }
    
    /* ===== Print Optimization ===== */
    @media print {
      body {
        margin: 0;
        padding: 20mm;
      }
      
      .section, .toc, .example, .keywords-section, pre.code-block {
        page-break-inside: avoid;
      }
      
      h1, h2, h3 {
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>
  <!-- Document Metadata Header -->
  <div class="document-header">
    <div class="header-row">
      <div><span class="label">Lecture ID:</span> ${lectureId}</div>
      <div><span class="label">User:</span> ${userId}</div>
    </div>
    <div class="header-row">
      <div><span class="label">Generated:</span> ${createdAt}</div>
    </div>
  </div>

  <!-- Main Title -->
  <h1>${title}</h1>

  <!-- Table of Contents -->
  ${tocHtml}

  <!-- Overview Section -->
  <h2>Overview</h2>
  ${toParagraphs(lecture.summary || '')}

  <!-- Keywords Section -->
  ${keywordsHtml}

  <!-- Main Content Sections -->
  ${sections}

  <!-- KaTeX Auto-render Script -->
  <script>
    document.addEventListener("DOMContentLoaded", function() {
      renderMathInElement(document.body, {
        delimiters: [
          {left: "$$", right: "$$", display: true},
          {left: "\\[", right: "\\]", display: true},
          {left: "$", right: "$", display: false},
          {left: "\\(", right: "\\)", display: false}
        ],
        throwOnError: false
      });
    });
  </script>
</body>
</html>
`;
}
