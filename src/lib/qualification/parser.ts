import ExcelJS from "exceljs";
import {
  AgentConfig,
  ChangeRequest,
  KnowledgeBaseLink,
  QualificationFlow,
  QualificationQuestion,
  QuestionType,
  ValidationRules,
} from "./types";

// ---- Cell helpers ---------------------------------------------------------

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (value instanceof Date) return value.toISOString();
  // Rich text / hyperlink / formula objects
  const v = value as any;
  if (typeof v.text === "string") return v.text.trim();
  if (typeof v.result === "string") return v.result.trim();
  if (Array.isArray(v.richText))
    return v.richText.map((r: any) => r.text).join("").trim();
  if (typeof v.hyperlink === "string") return (v.text || v.hyperlink).trim();
  return "";
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "field"
  );
}

// ---- Question type inference ---------------------------------------------

// Infer a question type + validation from its label. Generic so it works for
// any institution's prerequisites file, not just JECRC.
export function inferQuestion(
  rawLabel: string,
  note: string,
  options?: string[]
): { type: QuestionType; validation?: ValidationRules; options?: string[] } {
  const label = rawLabel.toLowerCase();

  // Percentage / marks / numeric score
  if (
    /%|percent|percentage|\bmarks?\b|\bscore\b|\bcgpa\b|\bpercentile\b/.test(
      label
    )
  ) {
    return { type: "number", validation: { min: 0, max: 100 } };
  }
  if (/\bage\b|how many|number of|\byear\b/.test(label)) {
    return { type: "number", validation: { min: 0 } };
  }

  // Accommodation/transport "preference" reads as a yes/no opt-in.
  if (/hostel|accommodation|transport|\bloan\b/.test(label)) {
    return { type: "yes_no" };
  }

  // Yes/No intent
  if (
    /^(are|is|do|did|does|have|has|would|will|can|could|may)\b/.test(label) ||
    /interested|\byes\s*\/?\s*no\b/.test(label)
  ) {
    // "Course Preference" is a choice, not yes/no.
    if (/course|program|stream|specializ|branch/.test(label)) {
      return { type: "single_select", options };
    }
    return { type: "yes_no" };
  }

  // Explicit choice fields
  if (/course|program|stream|specializ|branch|select|choose|option/.test(label)) {
    return { type: "single_select", options };
  }

  // Email / phone
  if (/email/.test(label)) {
    return {
      type: "text",
      validation: {
        pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
        patternMessage: "Enter a valid email address",
      },
    };
  }
  if (/phone|mobile|contact number|whatsapp/.test(label)) {
    return {
      type: "text",
      validation: {
        pattern: "^[0-9+\\-\\s]{7,15}$",
        patternMessage: "Enter a valid phone number",
      },
    };
  }

  // Name
  if (/\bname\b/.test(label)) {
    return { type: "text", validation: { minLength: 2, maxLength: 80 } };
  }

  // Plain location/text fields
  if (/city|town|location|address|state|country/.test(label)) {
    return { type: "text", validation: { minLength: 2 } };
  }

  return { type: "text" };
}

// ---- Workbook parsing -----------------------------------------------------

const TASK_RE = /^task\s*\d+\s*:/i;
const QUESTION_MARKER_RE = /^question\s*\d+$/i;

export async function parseQualificationWorkbook(
  buffer: Buffer | ArrayBuffer,
  opts: { institutionName?: string; courseOptions?: string[]; sourceFile?: string } = {}
): Promise<QualificationFlow> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as ArrayBuffer);

  const sheet = wb.worksheets[0];
  if (!sheet) throw new Error("Workbook has no worksheets");

  const agent: AgentConfig = {
    languages: [],
    persona: "",
    welcome_message: "",
    opening_line: "",
    closing_scripts: {},
    knowledge_base_links: [],
    mandatory_fields: [],
  };
  const questions: QualificationQuestion[] = [];
  const kbLinks: KnowledgeBaseLink[] = [];

  let currentTask = "";
  let kbCategory = "";
  let closingLabel = "";

  sheet.eachRow((row) => {
    const a = cellText(row.getCell(1).value); // Phase / marker
    const b = cellText(row.getCell(2).value); // Notes / sub-label
    const c = cellText(row.getCell(3).value); // Input / value
    const g = cellText(row.getCell(7).value); // Deliverable / Notes

    if (TASK_RE.test(a)) currentTask = a;
    const task = currentTask.toLowerCase();

    // Task 1: Language Preference — languages live in column C.
    if (task.includes("language")) {
      if (c && !/^input$/i.test(c) && !TASK_RE.test(c)) agent.languages.push(c);
    }

    // Task 2: Agent Persona
    if (task.includes("persona") && c && !TASK_RE.test(c)) {
      agent.persona = c;
    }

    // Task 3: Welcome Message
    if (task.includes("welcome") && c && !TASK_RE.test(c)) {
      if (!agent.welcome_message) agent.welcome_message = c;
    }

    // Task 4: Conversation Opening Line
    if (task.includes("opening") && c && !TASK_RE.test(c)) {
      if (!agent.opening_line) agent.opening_line = c;
    }

    // Task 5: qualification criteria — mandatory fields + the questions.
    if (task.includes("qualification")) {
      if (/mandatory fields/i.test(b) && c) agent.mandatory_fields.push(c);
      else if (/^(ai lead|connect for callback)/i.test(c))
        agent.mandatory_fields.push(c);

      // "Question N" markers live in column B (column A is a merged "Task 5…" cell).
      if (QUESTION_MARKER_RE.test(b) && c) {
        const inferred = inferQuestion(c, g, opts.courseOptions);
        questions.push({
          id: slugify(c),
          label: c,
          type: inferred.type,
          required: true, // Task 5 fields are qualification-mandatory
          options: inferred.options,
          validation: inferred.validation,
          note: g || undefined,
        });
      }
    }

    // Task 6: Knowledge Base Links
    if (task.includes("knowledge base")) {
      if (b && b !== "Knowledge Base Links") kbCategory = b;
      if (c && !TASK_RE.test(c) && (g || c)) {
        kbLinks.push({ category: kbCategory || "General", source: c, label: g || "" });
      }
    }

    // Task 7: Call Closing Script
    if (task.includes("closing")) {
      if (b && !TASK_RE.test(b)) closingLabel = b.toLowerCase();
      if (c && !TASK_RE.test(c)) {
        if (closingLabel.includes("success"))
          agent.closing_scripts.successful = c;
        else if (closingLabel.includes("not interested"))
          agent.closing_scripts.not_interested = c;
        else if (closingLabel.includes("busy")) agent.closing_scripts.busy = c;
        else if (!agent.closing_scripts.successful)
          agent.closing_scripts.successful = c;
        else if (!agent.closing_scripts.not_interested)
          agent.closing_scripts.not_interested = c;
        closingLabel = "";
      }
    }
  });

  agent.knowledge_base_links = kbLinks;

  // De-dupe questions by id (sheets sometimes repeat rows).
  const seen = new Set<string>();
  const uniqueQuestions = questions.filter((q) => {
    if (seen.has(q.id)) return false;
    seen.add(q.id);
    return true;
  });

  // Second sheet — flow change requests / known issues (guardrails input).
  const changeRequests: ChangeRequest[] = [];
  const sheet2 = wb.worksheets[1];
  if (sheet2) {
    sheet2.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // header
      const order = cellText(row.getCell(1).value);
      const title = cellText(row.getCell(3).value);
      const detail = cellText(row.getCell(4).value);
      const status = cellText(row.getCell(5).value);
      const remarks = cellText(row.getCell(6).value);
      if (!detail && !title) return;
      changeRequests.push({
        order: order || String(rowNumber - 1),
        title: title || detail.slice(0, 60),
        detail: detail || title,
        status: status || "",
        remarks: remarks || undefined,
      });
    });
  }

  return {
    institution_name: opts.institutionName,
    questions: uniqueQuestions,
    agent,
    change_requests: changeRequests,
    source_file: opts.sourceFile,
    generated_at: new Date().toISOString(),
  };
}
