/**
 * Student–project data models shared by the UI, the API client and the demo pipeline.
 * Keep in sync with the backend contract in docs/ARCHITECTURE.md.
 */

export type ISODate = string

// ── Accounts ───────────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  email: string
  createdAt: ISODate
}

/** Returned by /auth/register and /auth/login; the token is sent as `Authorization: Bearer <token>`. */
export interface AuthSession {
  user: User
  token: string
}

// ── Student & skill assessment ─────────────────────────────────────────────

export type SkillCategory = 'programming' | 'web' | 'data' | 'design' | 'tools'

/** 1 = beginner, 2 = intermediate, 3 = advanced */
export type Proficiency = 1 | 2 | 3

export interface SkillQuizResult {
  correct: number
  total: number
  /** Level demonstrated in the quiz, weighted by question difficulty. */
  level: Proficiency
  takenAt: ISODate
}

export interface SkillRating {
  skill: string
  category: SkillCategory
  /** Effective level used by the agents: the quiz result when available, otherwise the self-rating. */
  level: Proficiency
  selfLevel: Proficiency
  quiz?: SkillQuizResult
}

export type PriorExperience = 'none' | 'one' | 'several'
export type BuilderLevel = 'beginner' | 'intermediate' | 'advanced'

export interface SkillAssessment {
  /** 0–100 readiness score derived from skills, experience and available time. */
  score: number
  level: BuilderLevel
  strengths: string[]
  growthAreas: string[]
  /** Share of skills whose level was verified by the quiz rather than self-rated (0–1). */
  verifiedShare: number
  assessedAt: ISODate
}

export interface StudentProfile {
  id: string
  /** The account this profile belongs to (one profile per user). */
  userId: string
  name: string
  course: string
  year: string
  skills: SkillRating[]
  priorProjects: PriorExperience
  weeklyHours: number
  assessment: SkillAssessment
  createdAt: ISODate
  updatedAt: ISODate
}

// ── Project ideas ──────────────────────────────────────────────────────────

export type ProjectDomain = 'ai_ml' | 'web' | 'mobile' | 'iot' | 'data' | 'other'

export interface ProjectIdea {
  id: string
  studentId: string
  title: string
  description: string
  domain: ProjectDomain
  /** The student's own project type when domain is 'other', e.g. "Cybersecurity". */
  customDomain?: string
  durationWeeks: number
  createdAt: ISODate
  latestRunId?: string
}

export type NewProjectIdea = Pick<ProjectIdea, 'title' | 'description' | 'domain' | 'customDomain' | 'durationWeeks'>

// ── Agent pipeline (modules 2–5) ───────────────────────────────────────────
// The browser pipeline persists execution state and validated report results.

export type AgentId = 'feasibility' | 'scope_tech' | 'planner' | 'risk'
export type StepStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
export type RunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface AgentStep {
  agentId: AgentId
  status: StepStatus
  startedAt?: ISODate
  finishedAt?: ISODate
  /** One-line result shown in the pipeline timeline once the agent completes. */
  summary?: string
  error?: string
}

export interface PipelineRun {
  id: string
  projectId: string
  status: RunStatus
  analysisMode?: 'demo' | 'live'
  steps: AgentStep[]
  createdAt: ISODate
  finishedAt?: ISODate
  /** Filled when the consolidated report passes schema validation. */
  results?: PipelineResults
}

// ── Agent output contracts (designed in Milestone 1, produced in later milestones) ──

export type Severity = 'low' | 'medium' | 'high'

/** Module 2 — Feasibility Analysis Agent */
export interface FeasibilityResult {
  score: number
  verdict: 'Highly Feasible' | 'Feasible with Modifications' | 'Moderately Feasible' | 'Challenging' | 'Not Recommended in Current Form'
  notes: string[]
  technicalFeasibility: { score: number; summary: string }
  skillFeasibility: { score: number; summary: string }
  timeFeasibility: { score: number; summary: string }
  resourceFeasibility: { score: number; summary: string }
  implementationComplexity: 'Low' | 'Moderate' | 'High' | 'Very High'
  requiredPrerequisites: string[]
  technicalChallenges: string[]
  risks: string[]
  recommendations: string[]
  strengths: string[]
  weaknesses: string[]
}

/** Module 3 — Project Scope Definition and Technology Stack Recommendation Agent */
export interface ScopeAndStackResult {
  projectTitle: string
  problemStatement: string
  projectObjectives: string[]
  targetUsers: string
  proposedSolution: string
  functionalRequirements: string[]
  nonFunctionalRequirements: string[]
  coreFeatures: string[]
  optionalAdvancedFeatures: string[]
  mvp: string[]
  projectModules: string[]
  projectBoundaries: string[]
  inScope: string[]
  outOfScope: string[]
  expectedDeliverables: string[]
  successCriteria: string[]
  dependenciesAndAssumptions: string[]
  techStack: { layer: string; choice: string; reason: string; advantages: string[]; limitations: string[]; alternatives: string[]; learningDifficulty: 'Low' | 'Moderate' | 'High'; compatibility: string }[]
  summary: string
}

/** Module 4 — Milestone and Timeline Planning Agent */
export interface MilestonePlanResult {
  projectDurationWeeks: number
  totalWeeks: number
  summary: string
  milestones: {
    week: number
    title: string
    tasks: string[]
    dependencies: string[]
    estimatedHours: number
    deliverables: string[]
    status: 'planned' | 'in-progress' | 'done'
    requiredSkills: string[]
    testingCheckpoint?: string
    riskMitigation?: string
  }[]
}

/** Module 5 — Risk Assessment and Mitigation Agent */
export interface RiskResult {
  risks: { title: string; severity: Severity; mitigation: string }[]
  summary: string
}

export interface PipelineResults {
  feasibility: FeasibilityResult
  scopeAndStack: ScopeAndStackResult
  plan: MilestonePlanResult
  risk: RiskResult
}

// ── Interactive modules (6–7), used after a run completes ──

/** Module 6 — Conversational Mentor Interaction */
export interface MentorMessage {
  id: string
  projectId: string
  role: 'student' | 'mentor'
  text: string
  createdAt: ISODate
}

/** Module 7 — Documentation and Report Generation */
export interface ProjectReport {
  id: string
  projectId: string
  kind: 'synopsis' | 'progress' | 'final'
  content: string
  createdAt: ISODate
}
