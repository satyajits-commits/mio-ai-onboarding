import * as cheerio from "cheerio";
import type { ScrapedPage } from "@/lib/types";

// Keywords that indicate a page is relevant to onboarding a college voice agent.
// Used to prioritise which internal links to crawl.
const RELEVANT_KEYWORDS = [
  "program",
  "course",
  "degree",
  "academ",
  "admission",
  "apply",
  "fee",
  "tuition",
  "scholarship",
  "placement",
  "career",
  "recruit",
  "faq",
  "facilit",
  "campus",
  "hostel",
  "infrastructure",
  "library",
  "sport",
  "eligib",
  "ranking",
  "accredit",
  "about",
  "curriculum",
  "syllabus",
  "specialization",
];

const USER_AGENT =
  "Mozilla/5.0 (compatible; MioOnboardingBot/1.0; +https://getmio.ai)";

function scoreLink(href: string, text: string): number {
  const hay = `${href} ${text}`.toLowerCase();
  let score = 0;
  for (const kw of RELEVANT_KEYWORDS) {
    if (hay.includes(kw)) score += 1;
  }
  return score;
}

async function fetchHtml(url: string, timeoutMs = 15000): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ctype = res.headers.get("content-type") || "";
    if (!ctype.includes("html")) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Strip boilerplate and return readable text from an HTML document.
function extractText($: cheerio.CheerioAPI): string {
  $("script, style, noscript, svg, iframe, header nav, footer").remove();
  const text = $("body").text();
  return text
    .replace(/\s+/g, " ")
    .replace(/ /g, " ")
    .trim();
}

function getTitle($: cheerio.CheerioAPI): string {
  return (
    $("title").first().text().trim() ||
    $("h1").first().text().trim() ||
    "Untitled"
  );
}

function normalizeUrl(base: string): URL | null {
  try {
    const u = new URL(base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u;
  } catch {
    return null;
  }
}

/**
 * Phase 1 — crawl an institution website.
 * Fetches the homepage, discovers the most relevant same-domain internal links,
 * and returns clean text for each page (homepage first).
 */
export async function crawlSite(
  rawUrl: string,
  maxPages = 10
): Promise<ScrapedPage[]> {
  const root = normalizeUrl(rawUrl);
  if (!root) throw new Error(`Invalid URL: ${rawUrl}`);

  const homeHtml = await fetchHtml(root.toString());
  if (!homeHtml) {
    throw new Error(
      `Could not fetch the homepage at ${root.toString()} (timeout, non-HTML, or non-200 response).`
    );
  }

  const pages: ScrapedPage[] = [];
  const visited = new Set<string>();

  const $home = cheerio.load(homeHtml);
  pages.push({
    url: root.toString(),
    title: getTitle($home),
    text: extractText($home),
  });
  visited.add(root.toString().replace(/#.*$/, ""));

  // Discover and rank internal links from the homepage.
  const candidates = new Map<string, number>(); // url -> score
  $home("a[href]").each((_, el) => {
    const href = $home(el).attr("href") || "";
    const linkText = $home(el).text();
    let abs: URL | null = null;
    try {
      abs = new URL(href, root);
    } catch {
      return;
    }
    if (abs.hostname.replace(/^www\./, "") !== root.hostname.replace(/^www\./, ""))
      return; // same registrable host only
    const clean = abs.toString().replace(/#.*$/, "");
    if (visited.has(clean) || candidates.has(clean)) return;
    // skip obvious non-content assets
    if (/\.(pdf|jpg|jpeg|png|gif|zip|docx?|xlsx?|mp4|webp|svg)$/i.test(clean))
      return;
    candidates.set(clean, scoreLink(href, linkText));
  });

  const ranked = [...candidates.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score > 0)
    .map(([url]) => url)
    .slice(0, Math.max(0, maxPages - 1));

  // Fetch the ranked pages with limited concurrency.
  const queue = [...ranked];
  const CONCURRENCY = 4;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const url = queue.shift();
        if (!url || visited.has(url)) continue;
        visited.add(url);
        const html = await fetchHtml(url);
        if (!html) continue;
        const $ = cheerio.load(html);
        const text = extractText($);
        if (text.length < 200) continue; // skip thin pages
        pages.push({ url, title: getTitle($), text });
      }
    })
  );

  return pages;
}
