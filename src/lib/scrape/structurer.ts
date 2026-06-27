import * as cheerio from "cheerio";
import {
  emptyKnowledgeBase,
  KnowledgeBase,
  NOT_AVAILABLE,
  ScrapedPage,
} from "@/lib/types";
import { complete, hasAnthropicKey } from "@/lib/anthropic";

// How many characters of scraped text to send to the model. Keeps token usage
// bounded while covering the most relevant pages (homepage-first ordering).
const MAX_CONTEXT_CHARS = 60000;

function buildCorpus(pages: ScrapedPage[]): string {
  let out = "";
  for (const p of pages) {
    const block = `\n\n===== PAGE: ${p.title}\nURL: ${p.url}\n${p.text}\n`;
    if (out.length + block.length > MAX_CONTEXT_CHARS) {
      out += block.slice(0, MAX_CONTEXT_CHARS - out.length);
      break;
    }
    out += block;
  }
  return out.trim();
}

const SYSTEM_PROMPT = `You are a data extraction engine for MIO AI's voice-agent onboarding platform.
You are given raw text scraped from a college/university website.
Extract ONLY information that is actually present in the provided text.

CRITICAL RULES:
- NEVER invent, guess, or fabricate data. No dummy values.
- If a field's information is not present in the text, use the exact string "Not Available" for scalar fields, or an empty array [] for list fields.
- Preserve concrete numbers, fees, package figures, dates, and names exactly as written.
- Output MUST be a single valid JSON object and nothing else. No markdown fences, no commentary.`;

function buildUserPrompt(corpus: string, sourceUrl: string): string {
  return `Source URL: ${sourceUrl}

Extract a knowledge base as a JSON object with EXACTLY this shape:

{
  "institution_name": string,
  "programs": [ { "program_name": string, "degree_type": string, "duration": string, "mode": string, "specializations": string[] } ],
  "fees": { "tuition_fees": string, "hostel_fees": string, "application_fees": string, "scholarship_information": string },
  "placements": { "highest_package": string, "average_package": string, "recruiters": string[], "placement_statistics": string },
  "facilities": { "infrastructure": string, "labs": string, "library": string, "hostel": string, "sports": string, "transport": string },
  "admission_process": { "admission_steps": string, "important_dates": string, "entrance_exams": string, "application_process": string },
  "eligibility": { "academic_requirements": string, "entrance_requirements": string },
  "curriculum": [ { "program_name": string, "semester_wise": string, "subjects": string[] } ],
  "faqs": [ { "question": string, "answer": string } ],
  "must_know": { "rankings": string, "accreditations": string, "unique_selling_points": string, "industry_tie_ups": string, "international_programs": string }
}

Use "Not Available" for any scalar field not found, and [] for any list not found.

SCRAPED CONTENT:
${corpus}`;
}

function stripJson(raw: string): string {
  let s = raw.trim();
  // Remove markdown fences if the model added them despite instructions.
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  }
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1);
  }
  return s;
}

// Merge model output onto a complete empty KB so all keys always exist.
function coerce(parsed: any, sourceUrl: string): KnowledgeBase {
  const base = emptyKnowledgeBase();
  const kb: KnowledgeBase = {
    ...base,
    ...parsed,
    institution_name: parsed?.institution_name || NOT_AVAILABLE,
    fees: { ...base.fees, ...(parsed?.fees || {}) },
    placements: { ...base.placements, ...(parsed?.placements || {}) },
    facilities: { ...base.facilities, ...(parsed?.facilities || {}) },
    admission_process: {
      ...base.admission_process,
      ...(parsed?.admission_process || {}),
    },
    eligibility: { ...base.eligibility, ...(parsed?.eligibility || {}) },
    must_know: { ...base.must_know, ...(parsed?.must_know || {}) },
    programs: Array.isArray(parsed?.programs) ? parsed.programs : [],
    curriculum: Array.isArray(parsed?.curriculum) ? parsed.curriculum : [],
    faqs: Array.isArray(parsed?.faqs) ? parsed.faqs : [],
    source_url: sourceUrl,
    generated_at: new Date().toISOString(),
  };
  return kb;
}

// ---- Heuristic fallback (no API key) -------------------------------------

// Extract FAQ-like Q/A pairs and basic metadata directly from the HTML-less
// text corpus. Low quality compared to the LLM path, but keeps the app usable.
function heuristicKb(pages: ScrapedPage[], sourceUrl: string): KnowledgeBase {
  const kb = emptyKnowledgeBase();
  kb.source_url = sourceUrl;
  kb.generated_at = new Date().toISOString();

  // Institution name: prefer the title segment that actually names an
  // institution; otherwise the longest segment; otherwise derive from host.
  const home = pages[0];
  if (home?.title) {
    const segments = home.title
      .split(/[|\-–—:•]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const named = segments.find((s) =>
      /univers|institut|college|school|academy|vidyalaya|vishwa/i.test(s)
    );
    const longest = segments.sort((a, b) => b.length - a.length)[0];
    kb.institution_name = named || longest || NOT_AVAILABLE;
  }
  if (!kb.institution_name || /^home$/i.test(kb.institution_name)) {
    try {
      const host = new URL(sourceUrl).hostname.replace(/^www\./, "");
      kb.institution_name = host.split(".")[0].toUpperCase();
    } catch {
      kb.institution_name = NOT_AVAILABLE;
    }
  }

  // Pull question-like sentences ending in "?" and the text that follows.
  const faqs: { question: string; answer: string }[] = [];
  for (const p of pages) {
    const sentences = p.text.split(/(?<=[.?!])\s+/);
    for (let i = 0; i < sentences.length; i++) {
      const s = sentences[i].trim();
      if (s.endsWith("?") && s.length > 12 && s.length < 200) {
        const answer = (sentences[i + 1] || "").trim();
        if (answer && answer.length > 10) {
          faqs.push({ question: s, answer: answer.slice(0, 400) });
        }
      }
      if (faqs.length >= 15) break;
    }
    if (faqs.length >= 15) break;
  }
  kb.faqs = faqs;

  return kb;
}

// Extract FAQs from raw HTML using common accordion/details markup.
// (Used as a supplement when we still have the HTML around — optional.)
export function extractFaqsFromHtml(html: string): { question: string; answer: string }[] {
  const $ = cheerio.load(html);
  const out: { question: string; answer: string }[] = [];
  $("details").each((_, el) => {
    const q = $(el).find("summary").first().text().trim();
    const a = $(el).clone().children("summary").remove().end().text().trim();
    if (q && a) out.push({ question: q, answer: a });
  });
  return out;
}

export interface StructureResult {
  kb: KnowledgeBase;
  source: "llm" | "heuristic";
}

/**
 * Phase 2 — turn scraped pages into the structured knowledge base.
 * Uses Claude when ANTHROPIC_API_KEY is set; otherwise heuristics.
 */
export async function structureKnowledgeBase(
  pages: ScrapedPage[],
  sourceUrl: string
): Promise<StructureResult> {
  if (!hasAnthropicKey()) {
    return { kb: heuristicKb(pages, sourceUrl), source: "heuristic" };
  }

  const corpus = buildCorpus(pages);
  const raw = await complete({
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(corpus, sourceUrl),
    maxTokens: 8000,
  });

  try {
    const parsed = JSON.parse(stripJson(raw));
    return { kb: coerce(parsed, sourceUrl), source: "llm" };
  } catch {
    // If the model returned unparseable output, fall back rather than fail.
    return { kb: heuristicKb(pages, sourceUrl), source: "heuristic" };
  }
}
