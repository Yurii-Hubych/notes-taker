import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

export interface TopicMap {
  topics: string[];
  subtopics: Record<string, string[]>;
  examples: { title: string; context: string }[];
  experiments: { title: string; purpose: string }[];
  entities: string[];
  formulas: string[];
  key_terms: string[];
}

const TOPIC_MAP_SYSTEM_PROMPT = `
You are an academic analysis assistant specialized in extracting structured information from lecture transcripts.

Your role is to EXTRACT, not summarize or interpret. Your goal is to create a comprehensive catalogue of all meaningful content elements in the transcript.

Output strictly valid JSON matching this exact structure:
{
  "topics": ["array of top-level themes or major sections"],
  "subtopics": {
    "topic_name": ["array of subtopics under this topic"],
    "another_topic": ["its subtopics"]
  },
  "examples": [
    {"title": "brief example name", "context": "what it demonstrates or illustrates"}
  ],
  "experiments": [
    {"title": "experiment or study name", "purpose": "what it tests or demonstrates"}
  ],
  "entities": ["named entities: people, genes, proteins, pathways, diseases, algorithms, models, organizations, etc."],
  "formulas": ["mathematical expressions or equations in LaTeX syntax, e.g., E = mc^2, \\\\frac{x^2}{2}"],
  "key_terms": ["domain-specific terminology, abbreviations, technical terms, jargon"]
}

Instructions:
1. List ALL meaningful topics and subtopics - do not compress or merge unless they are truly identical
2. Capture EVERY example, case study, or illustrative scenario mentioned
3. Capture EVERY experiment, study, or empirical setup described
4. Extract ALL named entities (proper nouns, specific names of things)
5. Extract ALL mathematical formulas, equations, or expressions (use LaTeX syntax: x^2, \\\\frac{a}{b}, \\\\int, etc.)
6. Extract ALL key terms, technical vocabulary, and abbreviations specific to the domain
7. Be thorough and exhaustive - err on the side of including more rather than less
8. All fields must be present in your output; arrays may be empty if no relevant content exists
9. Do NOT add markdown formatting, code fences, or any text outside the JSON object
10. If you're unsure whether something qualifies, include it

Your output will be used to ensure comprehensive coverage in generated study notes.
`;

const SYSTEM_PROMPT = `
You are an academic assistant producing comprehensive, detailed study notes for students.

CRITICAL: These notes must be COMPLETE and DESCRIPTIVE enough that students can learn the material entirely from the notes alone, without needing the original source material.

DO NOT SUMMARIZE. You are NOT creating a summary - you are creating COMPLETE TEACHING MATERIAL that replaces the original source.

Goal: Transform lecture transcripts into structured, study-ready notes that capture all key concepts, explanations, examples, and reasoning.

Requirements:
- Output strictly valid JSON (no top-level markdown wrappers like code fences or headings around the JSON object). Inside string values you may use $...$ and $$...$$ for mathematical expressions and fenced code blocks like \`\`\`lang ... \`\`\` for code examples. If unsure, make a best effort.
- Fields:
  - title: A concise, descriptive lecture title (5–10 words, in title case) that captures the main topic or theme
  - overview: 5–7 sentence executive overview of the entire lecture.
  - sections: array of objects. Each has:
    - title: clear, descriptive topic heading
    - content: COMPLETE and DETAILED teaching explanation (formatted as a single string with paragraphs separated by \\n\\n). 
      
      YOU MUST PRESERVE, NOT SUMMARIZE:
      * Core concepts and definitions with thorough explanations - teach them completely
      * Step-by-step explanations with EVERY SINGLE step and reasoning shown
      * EVERY worked example from the transcript with ALL steps - DO NOT condense, skip steps, or abbreviate
      * Write out all calculations, derivations, or processes explicitly at each step
      * Multiple examples or case studies when provided - include ALL of them, not just one
      * Explain the reasoning, intuition, and context behind every concept
      * Include all important details, nuances, and qualifications mentioned
      * Note common mistakes, misconceptions, or pitfalls if mentioned
      * Make connections to related ideas or broader themes
      
      LENGTH GUIDANCE: Write based on content density in transcript, not arbitrary word counts.
      - Simple, straightforward concepts with one example: 300-500 words minimum
      - Moderate concepts with 2-3 examples: 500-800 words typical
      - Complex concepts with multiple worked examples: 800-1200+ words appropriate
      
      The key is COMPLETENESS - preserve EVERY piece of pedagogical content from the transcript.
      Think: "Would a student learn this concept as thoroughly from my notes as from the original?"
      
    - bullets: 6–12 key takeaways, important points, formulas, definitions, or worked example references
  - outline: string[] of section titles in order
  - keywords: 15–25 domain terms, concepts, or entities

SCULPTING RULES (Research-backed constraints):
1. Each section with examples must be MINIMUM 300 words - shorter sections will be rejected
2. For every example mentioned, show ALL calculation/reasoning steps explicitly
3. NEVER use phrases like "using the method" or "applying the rule" without showing HOW
4. Write as if teaching someone encountering this concept for the first time
5. Each procedural step must be written out and explained separately
6. If the transcript shows 3 examples, your notes must show all 3 examples completely

SUBJECT-SPECIFIC GUIDANCE:
- If the transcript is non-technical (history, literature, philosophy), write rich narrative explanations, quotes, and interpretations — avoid formulas.
- If technical or quantitative, follow math formatting rules and show derivations.
- Always adapt terminology, tone, and structure to the discipline.

MATH FORMATTING RULES (for all formulas, equations, and symbolic expressions):
- All mathematical expressions MUST be written in LaTeX syntax that is compatible with KaTeX.
- Use $...$ for inline math and $$...$$ for display (block) equations.
- Use LaTeX commands, for example:
  * x^2, x^{n+1}, x_0
  * \\\\frac{a}{b} for fractions
  * \\\\int, \\\\sum, \\\\lim, \\\\log, \\\\sin, \\\\cos, etc.
- Prefer proper LaTeX instead of ASCII math like "x^2/2" or "x^(n+1)/(n+1)".
- Examples of GOOD formatting:
  * "The power rule for integration says that if $f(x) = x^n$, then an antiderivative is $F(x) = \\\\frac{x^{n+1}}{n+1} + C$ for $n \\\\neq -1$."
  * "We can write the definite integral as $$\\\\int_a^b f(x)\\\\,dx = F(b) - F(a).$$"
- When the transcript contains ASCII-style math (e.g. "x^3/3", "INT(a,b) f(x) dx"), you may rewrite it into clean LaTeX, but you MUST preserve the correct numerical values and structure.

CODE FORMATTING RULES (for programming examples and code snippets):
- For programming lectures or technical content with code examples, use fenced code blocks with language labels.
- Format: three backticks, then language name, then newline, then code, then newline, then three backticks.
- The language should be the programming language identifier (e.g., cpp, python, js, java, c, rust, go, etc.).
- Examples of proper formatting:
  * For C++ code: three backticks followed by "cpp", then the code, then three closing backticks
  * For Python code: three backticks followed by "python", then the code, then three closing backticks
  * For JavaScript: three backticks followed by "js", then the code, then three closing backticks
- If no specific language applies, you can use three backticks without a language label.
- These code blocks will be rendered as properly formatted, monospaced code blocks in the PDF output.

Constraints:
- Be faithful to the transcript; do not hallucinate or omit important details.
- Prioritize COMPLETENESS over brevity—students should NOT need the original source if they have these notes.
- When examples, problems, or cases are worked through, WRITE OUT every step as teaching material, not as a condensed reference.
- DO NOT write brief summaries like "We apply the method and get the result" - instead, write complete step-by-step teaching explanations.
- Each procedural step, calculation, or reasoning step must be explicitly written out and explained.
- Write in clear, educational prose with full sentences and paragraphs, not condensed bullet-point style.
- When the user provides numeric targets (e.g., desired section count), follow those targets.
- Prefer more sections with thorough coverage over fewer shallow sections.
- Adapt your writing style and terminology to match the subject matter (technical, historical, scientific, literary, etc.).
`;

@Injectable()
export class GptService {
  private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  /**
   * Extract a comprehensive topic map from the transcript using a cheaper model.
   * This map catalogues all topics, examples, entities, formulas, etc. for high-coverage mode.
   */
  async extractTopicMap(transcript: string): Promise<TopicMap> {
    const emptyTopicMap: TopicMap = {
      topics: [],
      subtopics: {},
      examples: [],
      experiments: [],
      entities: [],
      formulas: [],
      key_terms: [],
    };

    try {
      const completion = await this.client.chat.completions.create({
        model: process.env.OPENAI_TOPIC_MAP_MODEL ?? 'gpt-4o-mini',
        messages: [
          { role: 'system', content: TOPIC_MAP_SYSTEM_PROMPT },
          { role: 'user', content: transcript.slice(0, 120_000) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 4096,
      });

      const content = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      // Validate and ensure all required fields are present
      return {
        topics: Array.isArray(parsed.topics) ? parsed.topics : [],
        subtopics:
          typeof parsed.subtopics === 'object' && parsed.subtopics !== null
            ? parsed.subtopics
            : {},
        examples: Array.isArray(parsed.examples) ? parsed.examples : [],
        experiments: Array.isArray(parsed.experiments)
          ? parsed.experiments
          : [],
        entities: Array.isArray(parsed.entities) ? parsed.entities : [],
        formulas: Array.isArray(parsed.formulas) ? parsed.formulas : [],
        key_terms: Array.isArray(parsed.key_terms) ? parsed.key_terms : [],
      };
    } catch (error) {
      console.error('Failed to extract topic map:', error);
      // Return empty map on failure to maintain backward compatibility
      return emptyTopicMap;
    }
  }

  /**
   * Generate comprehensive study notes from a lecture transcript.
   *
   * @param transcript - The lecture transcript text
   * @param opts - Optional configuration
   * @param opts.strictCoverage - If true, first extracts a topic map and enforces coverage of all elements
   * @returns Structured notes with title, summary, sections, outline, and keywords
   */
  async summarize(
    transcript: string,
    opts?: { strictCoverage?: boolean },
  ): Promise<{
    title: string;
    summary: string;
    outline: string[];
    keywords: string[];
    sections?: Array<{ title: string; summary: string; bullets?: string[] }>;
  }> {
    const words = transcript.trim().split(/\s+/).length;
    // Scale sections more generously: 1 section per ~400 words, min 4, soft cap 15
    const targetSections = Math.max(4, Math.round(words / 400));
    console.log('targetSections', targetSections, words);
    const targetSectionsCapped = Math.min(targetSections, 15);

    let topicMap: TopicMap | undefined;
    if (opts?.strictCoverage) {
      console.log('Extracting topic map for strict coverage mode...');
      topicMap = await this.extractTopicMap(transcript);
      console.log('Topic map extracted:', {
        topicCount: topicMap.topics.length,
        exampleCount: topicMap.examples.length,
        entityCount: topicMap.entities.length,
      });
    }

    let coverageInstruction = '';
    if (topicMap) {
      coverageInstruction = `
=== COVERAGE CONSTRAINTS (VERY IMPORTANT) ===
Here is a structured topic map extracted from the transcript. You MUST cover all of these elements in your notes:

${JSON.stringify(topicMap, null, 2)}

MANDATORY COVERAGE RULES:
1. Every item in "topics" must be clearly addressed in at least one section with thorough explanation
2. Every subtopic listed under each topic must be covered within the relevant section(s)
3. Every "example" must appear as a fully described example in the notes, with its context and what it demonstrates preserved
4. Every "experiment" must appear with its purpose and setup explained in detail
5. All "entities" (genes, proteins, pathways, diseases, models, people, algorithms, etc.) must be mentioned and their roles/significance explained where relevant
6. All "formulas" should appear in your notes (expressed in proper LaTeX syntax) with explanations of what they represent
7. All "key_terms" should be used appropriately in definitions, explanations, or bullets - ensure each term is defined or contextualized

IMPORTANT: If the transcript is repetitive and mentions the same concept multiple times, you may consolidate those mentions into a single thorough explanation. However, do NOT drop unique items from this topic map. Every distinct topic, example, experiment, entity, formula, and key term must be represented in your output.

If you cannot fit all elements into the target section count, you may add more sections to ensure complete coverage.

`;
    }

    const userInstruction = `${coverageInstruction}
Transcript length: ~${words} words. Produce approximately ${targetSectionsCapped} sections (split logically by topic/concept).

=== FEW-SHOT EXAMPLES (Study the pattern, adapt to your subject) ===

EXAMPLE OF EXCELLENT SECTION (✓ This is what we want):
Title: "[Topic Name]"
Content: "[Topic] is a fundamental concept in [field]. It provides [purpose/significance]. Let's explore this concept thoroughly with complete worked examples.

[Core concept explanation in 2-3 sentences, defining key terms and providing context]

Example 1: [Specific case/problem/scenario]
Step 1: [First action/observation] - [Why this step matters]
Step 2: [Second action/observation] - [Explanation of reasoning]
Step 3: [Third action/observation] - [How this connects to previous steps]
Therefore, [conclusion/result with explanation].

[Analysis paragraph explaining why this result makes sense, connecting to broader concepts]

Example 2: [Different case showing variety]
Step 1: [First action] - [Detailed explanation]
Step 2: [Second action] - [Why we do this]
Step 3: [Third action] - [Connection to concept]
Therefore, [result with reasoning].

Example 3: [Edge case or special scenario]
[Full explanation with all steps, showing how the concept applies even in special cases]

[Summary paragraph tying all examples together, noting patterns or key insights]"

Bullets: [
  "Key principle/formula/definition stated clearly",
  "Main steps of the process",
  "Specific example outcome with numbers/details",
  "Important nuance or caveat",
  "Connection to related concepts",
  "Common mistake to avoid"
]

EXAMPLE OF BAD SECTION (✗ This is too brief - avoid this):
Title: "[Topic Name]"
Content: "[Topic] is important. For example, [brief mention of result]. This is a key concept."
Bullets: ["Brief point", "Another point"]

=== KEY PATTERN TO FOLLOW ===
Regardless of subject (math, history, literature, science, programming, etc.):
- Start with thorough context and definitions
- Present EACH example/case study/scenario completely
- Show ALL steps/events/elements explicitly
- Explain reasoning and connections
- Tie everything together with analysis

=== YOUR TASK ===

CRITICAL CHAIN-OF-DENSITY INSTRUCTIONS:
1. First, mentally identify ALL concepts, examples, case studies, or scenarios in the transcript
2. For EACH concept, write a thorough explanation with context and definitions
3. For EACH example/case/scenario, write out EVERY step, event, or element completely
4. Add reasoning, analysis, and connections throughout
5. Your sections should match the GOOD example pattern in structure and depth

MANDATORY CONSTRAINTS:
- Each section with examples/cases: MINIMUM 400 words (shorter sections are unacceptable)
- Each section with 2+ examples: MINIMUM 600 words
- Write in complete teaching prose, not condensed summaries
- Show every step/event/element explicitly with explanations
- Explain WHY things happen, not just WHAT happens

Your output will be evaluated on: 
✓ Are all examples/cases from transcript included with complete details?
✓ Would a student understand without the original source?
✓ Are sections substantial (400+ words for those with examples)?
✓ Is every step/element shown explicitly with explanations?

If any answer is "no", your output is insufficient.`;

    const completion = await this.client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: userInstruction + '\n\n' + transcript.slice(0, 120_000),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 16384,
      top_p: 0.95,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { outline: [], summary: '', keywords: [] };
    }

    return {
      title: String(parsed.title ?? ''),
      summary: parsed.overview ?? parsed.summary ?? '',
      outline: Array.isArray(parsed.outline) ? parsed.outline : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      sections: Array.isArray(parsed.sections)
        ? parsed.sections.map((s: any) => ({
            title: String(s?.title ?? ''),
            summary: String(s?.content ?? s?.summary ?? ''),
            bullets: Array.isArray(s?.bullets)
              ? s.bullets.map((b: any) => String(b))
              : undefined,
          }))
        : undefined,
    };
  }
}
