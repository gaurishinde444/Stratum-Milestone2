# ProjectMentor AI — Architecture

The project has seven modules. Milestone 1 established:

1. Studying agentic AI workflows and academic project mentoring methods (§1)
2. Designing the multi-agent architecture, agent roles and student–project data models (§2–§4)
3. Building student onboarding: profile creation and skill assessment (Module 1)
4. Building idea submission and the trigger for the agent pipeline (Module 2, submission part)

The current app supports a deterministic local demo engine and a server-backed OpenAI mode. In live mode, the four specialist agents execute as separate calls with persisted per-step status. Mentor chat and report generation remain later modules.

---

## 0. Modules and milestone status

| # | Module | Kind | Current status |
|---|---|---|---|
| 1 | Student Profile and Skill Assessment | Frontend module | Built: profile, self-ratings, skill quiz, readiness score |
| 2 | Project Idea Submission and Feasibility Analysis | Form + agent | Built: independently validated step with retries |
| 3 | Project Scope Definition and Technology Stack Recommendation | Agent | Built: runs after feasibility and consumes its result |
| 4 | Milestone and Timeline Planning | Agent | Built: runs in parallel with risk after scope |
| 5 | Risk Assessment | Agent | Built: runs in parallel with planning after scope |
| 6 | Conversational Mentor Interaction | Interactive module (chat) | Not implemented |
| 7 | Documentation and Report Generation | Interactive module (on demand) | Not implemented |

---

## 1. Research basis

### 1.1 Agentic AI workflow patterns

| Pattern | What it is | How we use it |
|---|---|---|
| **Orchestrator–workers** | A coordinator splits a task and hands sub-tasks to specialist agents, then combines their results. | The report contract and registry model four specialist responsibilities. Current execution uses one deterministic engine or one consolidated LLM request to produce all four sections; it does not yet make four separate model calls. |
| **Prompt chaining / DAG** | Each agent's output becomes the next agent's input, and agents that don't depend on each other run in parallel. | The registry documents the intended dependency graph. The current report generator produces validated sections together rather than executing an independent agent DAG. |
| **Specialisation** | Narrow agents with focused prompts are more reliable and easier to evaluate than one general prompt. | One agent per mentoring concern: feasibility, scope & stack, timeline, risk. |
| **Conversational agents** | An agent that keeps a dialogue history and grounds its answers in shared context. | The Mentor (module 6) answers questions using the student profile and the pipeline results. |
| **Human-in-the-loop** | People review or override agent output at checkpoints. | Students edit their profile and re-submit; faculty review is a later milestone. |
| **Asynchronous runs + polling** | Long LLM jobs run in the background; the client polls run status. | `POST …/pipeline-runs` returns a queued run at once; the UI polls `GET /pipeline-runs/:id`. |

### 1.2 Academic project mentoring methodology

These principles shape what the agents will produce:

- **Scaffolding / zone of proximal development.** Guidance is pitched just above the student's current level, so the skill assessment (Module 1) is an input to every agent.
- **Scope before solution.** Supervisors first agree the problem, users and boundaries, then the technology. Module 3 defines scope and stack together for this reason.
- **Milestone-based supervision.** Projects are assessed in phases (synopsis → design → implementation → testing → report). The planner (Module 4) produces these phases, scaled to the weeks available.
- **Early risk identification.** Supervisors ask "what could stop you?" in week 1. The risk agent (Module 5) gives every risk a mitigation.
- **Socratic mentoring.** The mentor (Module 6) asks guiding questions instead of only giving answers, supporting learning rather than replacing it.
- **Academic integrity.** Generated report text (Module 7) is a starting point the student must rewrite in their own words.

---

## 2. Multi-agent system

### 2.1 Agent roles

| Module | Agent | `id` | Inputs | Output |
|---|---|---|---|---|
| — | Orchestrator | — | Project idea, student profile, run id | Executes agent DAG, persists steps/results, handles retries/cancel/failure |
| 2 | Feasibility Analysis | `feasibility` | Idea, skills, weekly hours, duration | `FeasibilityResult`: score 0–100, verdict, notes |
| 3 | Scope & Tech Stack | `scope_tech` | Idea, feasibility, skills | `ScopeAndStackResult`: problem, users, objectives, in/out of scope, success criteria, tech stack |
| 4 | Milestone Planning | `planner` | Duration, scope & stack | `MilestonePlanResult`: milestones with weeks and deliverables |
| 5 | Risk Assessment | `risk` | Idea, skills, scope & stack | `RiskResult`: risks with severity and mitigation |
| 6 | Mentor chat | — (interactive) | Profile, pipeline results, conversation history | `MentorMessage` replies |
| 7 | Report generation | — (on demand) | Profile, project, pipeline results | `ProjectReport` (synopsis, progress or final) |

The source of truth for agent roles and dependencies is `src/agents/registry.ts`.

### 2.2 Execution graph

```
                                         ┌──► Milestone Planning (4)
Feasibility (2) ──► Scope & Tech Stack (3)┤
                                         └──► Risk Assessment (5)
   stage 1               stage 2                 stage 3 (parallel)

After the run completes:  Mentor chat (6)  ·  Report generation (7)
```

The server executes feasibility, then scope and technology, then planning and risk concurrently. Each result is independently validated. A failed agent retries once; if it still fails, dependents that have not started are marked failed. The student can cancel an active run. Retrying from the page creates a new run.

### 2.3 Sequence: local analysis run

```
Student         Frontend + local storage    Local LLM proxy          LLM provider
  │ submit idea     │                            │                        │
  │────────────────►│ create queued run          │                        │
  │                 │ POST /api/projects/analyze │                        │
  │                 │───────────────────────────►│ validate + minimize    │
  │                 │                            │ POST chat/completions  │
  │                 │                            │───────────────────────►│
  │                 │                            │◄──── JSON response ────│
  │                 │                            │ validate report        │
  │                 │◄──── validated report ─────│                        │
  │                 │ save result and poll state │                        │
  │◄────────────────│ show report + source mode  │                        │
```

---

## 3. Data models

TypeScript definitions live in `src/types/models.ts`.

```
User 1 ── 1 StudentProfile 1 ──── * ProjectIdea 1 ──── * PipelineRun 1 ──── 4 AgentStep
                │                          │                     │
                ├── SkillRating[]          ├── * MentorMessage   └── PipelineResults (when completed)
                └── SkillAssessment        └── * ProjectReport
```

| Entity | Key fields | Built in |
|---|---|---|
| **User** / **AuthSession** | `id`, `name`, `email` / `{ user, token }` | M1 |
| **StudentProfile** | `id`, `userId`, `name`, `course`, `year`, `skills: SkillRating[]`, `priorProjects: none\|one\|several`, `weeklyHours`, `assessment`, timestamps | M1 |
| **SkillRating** | `skill`, `category`, `selfLevel: 1\|2\|3`, `quiz?: { correct, total, level }`, `level` (quiz level if taken, else self-rating) | M1 |
| **SkillAssessment** | `score 0–100`, `level: beginner\|intermediate\|advanced`, `strengths[]`, `growthAreas[]`, `verifiedShare`, `assessedAt` | M1 |
| **ProjectIdea** | `id`, `studentId`, `title`, `description`, `domain: ai_ml\|web\|mobile\|iot\|data\|other`, `customDomain?` (student's own type when `other`), `durationWeeks`, `latestRunId?`, `createdAt` | M1 |
| **PipelineRun** | `id`, `projectId`, `status: queued\|running\|completed\|failed`, `analysisMode?: demo\|live`, `steps: AgentStep[]`, `results?`, `createdAt`, `finishedAt?` | Current frontend demo pipeline |
| **AgentStep** | `agentId: feasibility\|scope_tech\|planner\|risk`, `status`, `startedAt?`, `finishedAt?`, `summary?`, `error?` | M1 (created as `queued`) |
| **PipelineResults** | `feasibility`, `scopeAndStack`, `plan`, `risk` (one result per agent, see §2.1) | Later |
| **MentorMessage** | `id`, `projectId`, `role: student\|mentor`, `text`, `createdAt` | Later |
| **ProjectReport** | `id`, `projectId`, `kind: synopsis\|progress\|final`, `content`, `createdAt` | Later |

### Skill quiz

Students first rate each skill themselves (`selfLevel`), then take a short multiple-choice quiz (`src/lib/questionBank.ts`, `src/components/SkillQuiz.tsx`):

- The bank has 39 questions: 3 for each of the 13 skills, one easy, one medium and one hard. Answer options are shuffled every time the quiz starts.
- The quiz covers up to 5 skills (about 15 questions), starting with the highest self-rated, since an over-estimate there would hurt the plan most.
- Each skill's quiz level is the sum of the difficulties answered correctly, out of 6. A score of 5–6 is advanced, 2–4 is intermediate and 0–1 is beginner.
- `SkillRating.level` is the quiz level when there is one, otherwise the self-rating. The agents will use `level`.
- The quiz is a required step of onboarding. Skills beyond the top 5 keep their self-rating, or an earlier quiz result.
- In Edit profile, only skills that were added or whose self-rating changed are quizzed again, before saving. If no skills changed, the profile saves with no quiz. Removed skills need no test.

The answers currently ship to the browser, which is fine for a self-check. For graded use, the backend should serve questions without answers and score them on the server.

### Skill assessment scoring

The score is calculated in `src/lib/skills.ts` and is out of 100:

- **Skills (up to 60 points):** the sum of the proficiency levels, which maxes out at 12 (for example, four advanced skills).
- **Experience (up to 25 points):** 0 for no prior projects, 12 for one, 25 for several.
- **Time (up to 15 points):** one point per weekly hour, up to 15 hours.

The level is advanced at 70 or above, intermediate at 40–69, and beginner below 40. Strengths are the skills rated advanced. Growth areas first list any skill where the quiz came out lower than the self-rating, then gaps such as no Git, no data skills, no UI skills, no prior projects, or fewer than 5 hours a week.

---

## 4. API contract

All bodies are JSON and use the models above. Errors return `{ "message": string }` with a 4xx/5xx status.

| Method | Path | Body | Returns | Milestone |
|---|---|---|---|---|
| `POST` | `/auth/register` | `{ name, email, password }` | `AuthSession` (409 if email exists) | M1 |
| `POST` | `/auth/login` | `{ email, password }` | `AuthSession` (401 on bad credentials) | M1 |
| `POST` | `/auth/logout` | — | 204 (invalidates token) | M1 |
| `POST` | `/auth/reset-password` | `{ email, password }` | 204, or 404 if no account has that email | M1 |
| `POST` | `/students` | Profile fields (+ client `assessment`) | `StudentProfile` | M1 |
| `PUT` | `/students/:id` | Profile fields (+ client `assessment`) | `StudentProfile` | M1 |
| `GET` | `/students/:id/projects` | — | `ProjectIdea[]` | M1 |
| `POST` | `/projects` | `{ studentId, title, description, domain, customDomain?, durationWeeks }` | `ProjectIdea` | M1 |
| `GET` | `/projects/:id` | — | `ProjectIdea` (incl. `latestRunId`) | M1 |
| `DELETE` | `/projects/:id` | — | `204`; also deletes the project's pipeline runs | M1 |
| `POST` | `/projects/:id/pipeline-runs` | — | `PipelineRun`, status `queued`: **the pipeline trigger** | M1 |
| `GET` | `/pipeline-runs/:id` | — | `PipelineRun` with step statuses (and `results` when completed) | M1 (status) · later (results) |
| `GET` / `POST` | `/projects/:id/mentor/messages` | `{ text }` | `MentorMessage[]` / reply | Later |
| `POST` | `/projects/:id/reports` | `{ kind }` | `ProjectReport` | Later |
| `POST` | `/api/projects/analyze` | `{ project, profile }` | Validated `PipelineResults` | Local LLM proxy |
| `GET` | `/health` | — | `{ status, providerConfigured, model }` | Local LLM proxy |

The local proxy is implemented in `server/index.mjs`. It validates the incoming data, removes student names and IDs from the provider prompt, calls the configured OpenAI-compatible Chat Completions endpoint, parses JSON, validates the full result with Zod, and only then returns the report. Provider keys are read from backend-only `LLM_API_KEY`. The backend is local-development infrastructure, not an authenticated or production deployment.

**Authentication.** Every endpoint except `/auth/register` and `/auth/login` expects `Authorization: Bearer <token>` and acts only on the signed-in user's data (return 404 for anyone else's). Passwords are hashed with scrypt, sessions are signed and stored server-side for revocation, and login attempts are throttled in memory. A 401 makes the frontend clear the session. Password reset returns 501 until a verified email recovery flow exists.

**Storage and deployment.** The local backend stores accounts, profiles, projects and runs in SQLite at `server/data/projectmentor.sqlite`. The server binds to loopback for development. This setup is for a single-machine demo; production needs a managed database, migrations, durable queue, HTTPS, secure cookies, and operational controls.

**Password reset — known risk.** The team chose a one-page reset: email + new password + confirm, with no emailed link or code. This means anyone who knows a student's email can change that student's password, and the 404 response reveals which emails have accounts. That is acceptable for the classroom demo only. Before real students use it, add an ownership check: email a 6-digit code or one-time link, have `/auth/reset-password` require it (single-use, expires in about 15–30 minutes), rate-limit the endpoint, and end the account's other sessions after a reset. The frontend form would then gain one "code" field.

---

## 5. Frontend and local LLM proxy

| Concern | File |
|---|---|
| Data models (incl. later-milestone contracts) | `src/types/models.ts` |
| Agent registry, module list, DAG stages | `src/agents/registry.ts` |
| Skill catalog, assessment scoring | `src/lib/skills.ts` |
| Skill quiz questions and component | `src/lib/questionBank.ts`, `src/components/SkillQuiz.tsx` |
| API client (real backend or demo mode) | `src/services/api.ts` |
| Demo/local LLM pipeline execution and browser persistence | `src/services/demoPipeline.ts` |
| Provider abstraction, response schema and source mode | `src/services/ai.ts` |
| Local LLM proxy endpoint and server validation | `server/index.mjs` |
| Run status hook (polls until run completes or fails) | `src/hooks/usePipelineRun.ts` |
| Onboarding: details → skills → quiz → assessment; edit profile | `src/pages/Onboarding.tsx` |
| Idea submission + pipeline trigger | `src/pages/CreateProject.tsx` |
| Submitted idea + pipeline status | `src/pages/ProjectRun.tsx` |
| Dashboard, project list | `src/pages/Home.tsx`, `src/pages/Projects.tsx` |

**Demo mode vs. live analysis.** Leave `VITE_API_BASE_URL` blank for deterministic local analysis in browser storage. Set it to `http://127.0.0.1:3000` and run `npm run dev:api` for SQLite-backed authentication/projects and the four-agent OpenAI pipeline. Remote provider failures do not silently fall back to demo output.

Copy `.env.example` to `.env`, set `JWT_SECRET` and `LLM_API_KEY` there, then run `npm run dev:api` and `npm run dev` in separate terminals. Four separate OpenAI calls are made per run, with up to one retry each and a 1,600-token output cap per attempt. Calls can incur provider charges. Do not expose the local backend to a public network.

**Accounts:** `src/services/auth.ts`, `src/auth/AuthContext.tsx` (`useAuth`, `RequireAuth`), `src/pages/Auth.tsx`, `src/components/UserMenu.tsx`. In demo mode, accounts live in this browser with salted SHA-256 hashes. That only makes the flow demonstrable; it is not real security.

**Routes:** `/` · `/register` · `/sign-in` · `/forgot-password` are public. `/onboarding` · `/create` · `/projects` · `/projects/:projectId` require sign-in.
