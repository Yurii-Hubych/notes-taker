import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

const SYSTEM_PROMPT = `
You are an academic assistant producing comprehensive, detailed study notes for students.

CRITICAL: These notes must be COMPLETE and DESCRIPTIVE enough that students can learn the material entirely from the notes alone, without needing the original source material.

DO NOT SUMMARIZE. You are NOT creating a summary - you are creating COMPLETE TEACHING MATERIAL that replaces the original source.

Goal: Transform lecture transcripts into structured, study-ready notes that capture all key concepts, explanations, examples, and reasoning.

Requirements:
- Output strictly valid JSON (no markdown). If unsure, make a best effort.
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

  async summarize(
    transcript: string,
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

    const userInstruction = `Transcript length: ~${words} words. Produce approximately ${targetSectionsCapped} sections (split logically by topic/concept).

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
