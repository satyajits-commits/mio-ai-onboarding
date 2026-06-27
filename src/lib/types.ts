// Phase 2 — Structured Knowledge Base schema.
//
// Top-level keys match the PRD contract exactly:
//   institution_name, programs, fees, placements, facilities,
//   admission_process, eligibility, faqs
// plus a few additional sections from Phase 1 (curriculum, must_know).
//
// Data Handling Rule (PRD): if data is unavailable, mark it "Not Available".
// Never fabricate values. We use the literal NOT_AVAILABLE for scalar fields
// and empty arrays/objects for collections that had no data.

export const NOT_AVAILABLE = "Not Available" as const;

export interface Program {
  program_name: string;
  degree_type?: string;
  duration?: string;
  mode?: string;
  specializations?: string[];
}

export interface Fees {
  tuition_fees?: string;
  hostel_fees?: string;
  application_fees?: string;
  scholarship_information?: string;
}

export interface Placements {
  highest_package?: string;
  average_package?: string;
  recruiters?: string[];
  placement_statistics?: string;
}

export interface Facilities {
  infrastructure?: string;
  labs?: string;
  library?: string;
  hostel?: string;
  sports?: string;
  transport?: string;
}

export interface AdmissionProcess {
  admission_steps?: string;
  important_dates?: string;
  entrance_exams?: string;
  application_process?: string;
}

export interface Eligibility {
  academic_requirements?: string;
  entrance_requirements?: string;
}

export interface Curriculum {
  program_name?: string;
  semester_wise?: string;
  subjects?: string[];
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface MustKnow {
  rankings?: string;
  accreditations?: string;
  unique_selling_points?: string;
  industry_tie_ups?: string;
  international_programs?: string;
}

export interface KnowledgeBase {
  institution_name: string;
  programs: Program[];
  fees: Fees;
  placements: Placements;
  facilities: Facilities;
  admission_process: AdmissionProcess;
  eligibility: Eligibility;
  curriculum: Curriculum[];
  faqs: FAQ[];
  must_know: MustKnow;
  // bookkeeping
  source_url?: string;
  generated_at?: string;
}

export function emptyKnowledgeBase(institution = NOT_AVAILABLE): KnowledgeBase {
  return {
    institution_name: institution,
    programs: [],
    fees: {},
    placements: {},
    facilities: {},
    admission_process: {},
    eligibility: {},
    curriculum: [],
    faqs: [],
    must_know: {},
  };
}

export interface ScrapedPage {
  url: string;
  title: string;
  text: string;
}

export type ProjectStatus =
  | "pending"
  | "scraping"
  | "structuring"
  | "completed"
  | "failed";
