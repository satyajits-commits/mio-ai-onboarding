# MIO AI Voice Agent — Auto-Onboarding Platform

Automates onboarding for MIO AI Voice Agent customers: take a college/university
URL → scrape it → build a structured knowledge base → (later phases) generate a
qualification flow, onboarding chat, voice-agent prompt, and a Bolna demo agent.

This repo is being built **phase by phase** per the PRD. Status below.

## Phase status

| Phase | Description | Status |
|------|-------------|--------|
| 1 | Website Scraping Engine | ✅ Done |
| 2 | AI Knowledge Base Generator | ✅ Done |
| 3 | Lead Qualification Builder | ✅ Done |
| 4 | Customer Onboarding Link Generation | ✅ Done |
| 5 | Landing Page | ✅ Done |
| 6 | Authentication Flow | ✅ Done |
| 7 | Conversational Onboarding Flow | ✅ Done |
| 8 | Agent Design Intelligence | ⬜ |
| 9 | Prompt Generator | ⬜ |
| 10 | Bolna Integration | ⬜ |
| 11 | Demo Agent Testing | ⬜ |
| 12 | Feedback Collection | ⬜ |

## Stack (pragmatic choices)

- **Next.js 14 (App Router) full-stack** — one runnable app instead of separate
  Next + NestJS. Frontend is Next/React/Tailwind per the PRD.
- **Prisma + SQLite** for dev (zero setup). Schema is Postgres-portable: set
  `provider = "postgresql"` and a `postgresql://` `DATABASE_URL` for production.
- **cheerio + fetch + Claude** for scraping — lighter than Playwright/Firecrawl,
  and the fetcher/structurer are pluggable so those can drop in later.

## Setup

```bash
cd mio-onboarding
npm install
cp .env.example .env        # then add ANTHROPIC_API_KEY for best results
npx prisma db push          # creates the SQLite DB + tables
npm run dev                 # http://localhost:3000
```

### Environment variables

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | DB connection (default `file:./dev.db`) |
| `ANTHROPIC_API_KEY` | Enables LLM knowledge-base structuring. **Without it the app still runs** but uses a lower-quality heuristic extractor. |
| `ANTHROPIC_MODEL` | Structuring model (default `claude-sonnet-4-6`) |
| `SCRAPE_MAX_PAGES` | Max internal pages crawled per site (default 10) |

## How Phase 1 + 2 work

1. **Ops Team** enters a URL on the dashboard (`/`).
2. `POST /api/projects` creates a `Project` and fires the pipeline in the
   background (`src/lib/scrape/index.ts`).
3. **Phase 1 — `crawlSite`** (`src/lib/scrape/fetcher.ts`): fetches the homepage,
   ranks same-domain internal links by relevance keywords (programs, fees,
   placements, admissions, FAQ, facilities, …), crawls the top N, and extracts
   clean text per page with cheerio.
4. **Phase 2 — `structureKnowledgeBase`** (`src/lib/scrape/structurer.ts`):
   sends the corpus to Claude with a strict schema + the **"Not Available / no
   dummy data"** rule, returning the `KnowledgeBase` JSON
   (`src/lib/types.ts`). Falls back to heuristics if no API key.
5. The project page (`/projects/[id]`) polls status, then lets Ops **review and
   edit** the generated knowledge base (saved via `PATCH /api/projects/:id`).

### Knowledge Base shape

Matches the PRD contract (`institution_name`, `programs`, `fees`, `placements`,
`facilities`, `admission_process`, `eligibility`, `faqs`) plus `curriculum` and
`must_know`. This JSON is the input to the Phase 9 prompt generator.

## API

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/projects` | List projects |
| `POST` | `/api/projects` | Create project + start scrape (`{url, name?}`) |
| `GET` | `/api/projects/:id` | Project incl. raw pages + knowledge base |
| `PATCH` | `/api/projects/:id` | Save edited knowledge base (`{knowledgeBase}`) |
| `POST` | `/api/projects/:id/rescrape` | Re-run the pipeline |
| `GET` | `/api/projects/:id/onboarding-link` | Link + login/session history (Ops) |
| `POST` | `/api/projects/:id/onboarding-link` | Generate link + credentials, "send" email (Phase 4) |
| `GET` | `/api/onboard/:token` | Public landing data (institution name, status) |
| `POST` | `/api/onboard/:token/login` | Validate email/password, set session (Phase 6) |
| `GET` | `/api/projects/:id/qualification` | Get the qualification flow |
| `PATCH` | `/api/projects/:id/qualification` | Save edited flow |
| `POST` | `/api/projects/:id/qualification/import` | Parse prereqs workbook → flow (Phase 3) |

## Phase 3 — Lead Qualification Builder

Parses the prerequisites workbook (`prereqs-jecrc.xlsx` bundled, or upload any
institution's `.xlsx`) into a structured **qualification flow**
(`src/lib/qualification/`):

- **Questions** with **inferred types** (`text`, `number`, `yes_no`,
  `single_select`, `multi_select`), **validation rules**, and required/optional
  flags. e.g. JECRC's Task 5 → Name (text), interest (yes/no), Course Preference
  (single-select, options pulled from the KB programs), +12th/UG % (number 0–100),
  City (text), Hostel Preference (yes/no).
- **Agent config**: languages, persona, welcome message, opening line, closing
  scripts (successful/not-interested/busy), knowledge-base links, mandatory fields.
- **Flow change requests** from the workbook's 2nd sheet (known issues →
  guardrail input for Phases 8–9).

Stored per project in `QualificationFlow`; customer answers will be saved to
`QualificationResponse` in Phase 7. Ops manage it from the **Lead Qualification
Flow** panel on the project page (generate/regenerate/upload/edit).

## Phases 4–6

- **Phase 4** — `POST /api/projects/:id/onboarding-link` generates a unique
  `token` URL (`/onboard/<token>`), a customer email + password (scrypt-hashed),
  records an `EmailOutbox` entry (stub for real SMTP), and tracks
  `OnboardingLink` + `LoginEvent` + `SessionEvent` (login/session history,
  progress). Ops manage it from the project page's **Customer Onboarding Link**
  panel.
- **Phase 5** — `/onboard/<token>` is the MIO-branded landing page (hero,
  benefits, features, voice demo, customer success, CTA). The chat widget
  **auto-launches 5s after load** with the "Let's build your AI Voice Agent"
  animation.
- **Phase 6** — the chat asks for the registered email + password, validated
  against the `OnboardingLink`. Success issues an HMAC-signed session cookie and
  records the login + a `start`/`resume` session event. Phase 7 (the guided
  questionnaire) plugs in right after auth.

## Notes / known limitations

- Background jobs run in-process (fire-and-forget). For production, move the
  pipeline to **BullMQ** workers (per PRD) so scrapes survive restarts/scale.
- The fetcher does **static** HTML scraping. JS-heavy sites (or sites that block
  datacenter IPs) may return little/nothing — swap in Playwright or Firecrawl
  behind the same `crawlSite` interface.
- Heuristic fallback is intentionally basic; set `ANTHROPIC_API_KEY` for
  accurate, fully-structured knowledge bases.
