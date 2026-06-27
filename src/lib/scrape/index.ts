import { prisma } from "@/lib/db";
import { crawlSite } from "./fetcher";
import { structureKnowledgeBase } from "./structurer";

/**
 * Run the full Phase 1 (scrape) + Phase 2 (structure) pipeline for a project.
 * Updates the project status as it progresses. Designed to be fire-and-forget;
 * the UI polls the project record for status changes.
 */
export async function runScrapePipeline(projectId: string): Promise<void> {
  const maxPages = Number(process.env.SCRAPE_MAX_PAGES || "10") || 10;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return;

  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "scraping", error: null },
    });

    const pages = await crawlSite(project.url, maxPages);

    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "structuring",
        rawPages: JSON.stringify(pages),
      },
    });

    const { kb, source } = await structureKnowledgeBase(pages, project.url);

    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "completed",
        knowledgeBase: JSON.stringify(kb),
        kbSource: source,
      },
    });
  } catch (err) {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      },
    });
  }
}
