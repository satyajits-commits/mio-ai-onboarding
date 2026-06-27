// Phase 3 — Lead Qualification flow types.
//
// The qualification questions and agent configuration are parsed from the
// uploaded prerequisites workbook ("Pre Requisites - MIO AI _ <University>.xlsx")
// into this structured form, which drives the conversational onboarding (Phase 7)
// and the generated voice-agent prompt (Phase 9).

export type QuestionType =
  | "text"
  | "single_select"
  | "multi_select"
  | "number"
  | "yes_no";

export interface ValidationRules {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string; // regex source
  patternMessage?: string;
}

export interface QualificationQuestion {
  id: string; // stable key, e.g. "name", "course_preference"
  label: string; // question text shown to the customer
  type: QuestionType;
  required: boolean;
  options?: string[]; // for single_select / multi_select
  validation?: ValidationRules;
  note?: string; // any "Deliverable / Notes" guidance from the sheet
}

export interface KnowledgeBaseLink {
  category: string; // e.g. "Program details", "Fee Structure"
  source: string; // e.g. "Website Page Link", "PDF"
  label: string; // e.g. "University Prospectus 2025"
}

export interface ClosingScripts {
  successful?: string;
  not_interested?: string;
  busy?: string;
}

export interface AgentConfig {
  languages: string[]; // e.g. ["English", "Hindi"]
  persona: string; // e.g. "Lead Qualification"
  welcome_message: string;
  opening_line: string;
  closing_scripts: ClosingScripts;
  knowledge_base_links: KnowledgeBaseLink[];
  mandatory_fields: string[]; // e.g. ["AI Lead Qualification", "AI Lead Sentiment Score(Out of 5)", "Connect for Callback"]
}

// A flow-change / known-issue requirement from the workbook's second sheet.
export interface ChangeRequest {
  order: string;
  title: string;
  detail: string;
  status: string;
  remarks?: string;
}

export interface QualificationFlow {
  institution_name?: string;
  questions: QualificationQuestion[];
  agent: AgentConfig;
  change_requests: ChangeRequest[];
  source_file?: string;
  generated_at?: string;
}

// A customer's captured answers (Phase 7 writes these).
export type QualificationAnswers = Record<
  string,
  string | number | boolean | string[]
>;
