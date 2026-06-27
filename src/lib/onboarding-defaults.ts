import {
  AgentConfig,
  QualificationFlow,
  QualificationQuestion,
} from "@/lib/qualification/types";

// Master list of languages shown as selectable cards in Step 1.
export const LANGUAGE_OPTIONS = [
  "English",
  "Hindi",
  "Tamil",
  "Telugu",
  "Kannada",
  "Bengali",
  "Marathi",
  "Gujarati",
  "Punjabi",
  "Malayalam",
  "Odia",
];

// Step 2 — agent persona options (single select).
export const PERSONA_OPTIONS = [
  {
    value: "Lead Qualification",
    title: "Lead Qualification",
    description:
      "Call fresh enquiries, qualify intent and fit, and route hot leads to counsellors.",
  },
  {
    value: "Lead Reactivation",
    title: "Lead Reactivation",
    description:
      "Re-engage cold or dormant leads and revive their interest in admission.",
  },
];

export const DEFAULT_BUSY_SCRIPT =
  "No worries. We understand you're busy. We'll connect with you again at a convenient time. Have a wonderful day.";

function defaultQuestions(): QualificationQuestion[] {
  return [
    { id: "interested", label: "Are you interested in admission?", type: "yes_no", required: true },
    { id: "course_preference", label: "Course Preference", type: "single_select", required: true },
    { id: "percentage", label: "What is your 12th / Undergraduate percentage?", type: "number", required: true, validation: { min: 0, max: 100 } },
    { id: "city", label: "City", type: "text", required: true },
    { id: "hostel_preference", label: "Hostel Preference", type: "yes_no", required: true },
  ];
}

// Build a default flow for an institution when none was imported.
export function defaultFlow(institutionName: string): QualificationFlow {
  const inst = institutionName || "your institution";
  const agent: AgentConfig = {
    languages: ["English", "Hindi"],
    persona: "Lead Qualification",
    welcome_message: `Hello, This is Mio AI Counsellor from ${inst}. How may I help you regarding admissions?`,
    opening_line: `I'm calling based on your interest in the "Program" at ${inst}. Can I take 1–2 minutes of your time?`,
    closing_scripts: {
      successful: `Thank you for your time. I hope the information shared was helpful. For more information, please visit the University or connect with our admission expert. Come join ${inst} and build your future with us.`,
      not_interested: `Thank you for connecting with us. If you or anyone you know is interested in admission at ${inst}, please visit our website or campus.`,
      busy: DEFAULT_BUSY_SCRIPT,
    },
    knowledge_base_links: [],
    mandatory_fields: [],
  };
  return {
    institution_name: institutionName,
    questions: defaultQuestions(),
    agent,
    change_requests: [],
    generated_at: new Date().toISOString(),
  };
}

// Ensure an existing (e.g. imported) flow has all fields the wizard needs.
export function normalizeFlow(
  flow: QualificationFlow,
  institutionName: string
): QualificationFlow {
  const inst = institutionName || flow.institution_name || "your institution";
  const cs = flow.agent.closing_scripts || {};
  return {
    ...flow,
    institution_name: flow.institution_name || institutionName,
    questions: flow.questions?.length ? flow.questions : defaultQuestions(),
    agent: {
      ...flow.agent,
      languages: flow.agent.languages?.length
        ? flow.agent.languages
        : ["English", "Hindi"],
      persona: flow.agent.persona || "Lead Qualification",
      welcome_message:
        flow.agent.welcome_message ||
        `Hello, This is Mio AI Counsellor from ${inst}. How may I help you regarding admissions?`,
      opening_line:
        flow.agent.opening_line ||
        `I'm calling based on your interest in the "Program" at ${inst}. Can I take 1–2 minutes of your time?`,
      closing_scripts: {
        successful: cs.successful || "",
        not_interested: cs.not_interested || "",
        busy: cs.busy || DEFAULT_BUSY_SCRIPT,
      },
    },
  };
}
