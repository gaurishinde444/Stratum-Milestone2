import { z } from 'zod'
import { runProjectAnalysis } from '../agents/engine'
import type { ProjectIdea, StudentProfile } from '../types/models'

const recommendationSchema = z.object({
  layer: z.string(),
  choice: z.string(),
  reason: z.string(),
  advantages: z.array(z.string()),
  limitations: z.array(z.string()),
  alternatives: z.array(z.string()),
  learningDifficulty: z.enum(['Low', 'Moderate', 'High']),
  compatibility: z.string(),
})

const feasibilityScoreSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string(),
})

const feasibilitySchema = z.object({
  score: z.number().int().min(0).max(100),
  verdict: z.enum(['Highly Feasible', 'Feasible with Modifications', 'Moderately Feasible', 'Challenging', 'Not Recommended in Current Form']),
  notes: z.array(z.string()),
  technicalFeasibility: feasibilityScoreSchema,
  skillFeasibility: feasibilityScoreSchema,
  timeFeasibility: feasibilityScoreSchema,
  resourceFeasibility: feasibilityScoreSchema,
  implementationComplexity: z.enum(['Low', 'Moderate', 'High', 'Very High']),
  requiredPrerequisites: z.array(z.string()),
  technicalChallenges: z.array(z.string()),
  risks: z.array(z.string()),
  recommendations: z.array(z.string()),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
})

const scopeSchema = z.object({
  projectTitle: z.string(),
  problemStatement: z.string(),
  projectObjectives: z.array(z.string()),
  targetUsers: z.string(),
  proposedSolution: z.string(),
  functionalRequirements: z.array(z.string()),
  nonFunctionalRequirements: z.array(z.string()),
  coreFeatures: z.array(z.string()),
  optionalAdvancedFeatures: z.array(z.string()),
  mvp: z.array(z.string()),
  projectModules: z.array(z.string()),
  projectBoundaries: z.array(z.string()),
  inScope: z.array(z.string()),
  outOfScope: z.array(z.string()),
  expectedDeliverables: z.array(z.string()),
  successCriteria: z.array(z.string()),
  dependenciesAndAssumptions: z.array(z.string()),
  techStack: z.array(recommendationSchema),
  summary: z.string(),
})

const milestoneSchema = z.object({
  week: z.number().int().min(1),
  title: z.string(),
  tasks: z.array(z.string()),
  dependencies: z.array(z.string()),
  estimatedHours: z.number().int().min(1),
  deliverables: z.array(z.string()),
  status: z.enum(['planned', 'in-progress', 'done']),
  requiredSkills: z.array(z.string()),
  testingCheckpoint: z.string().optional(),
  riskMitigation: z.string().optional(),
})

const planSchema = z.object({
  projectDurationWeeks: z.number().int().min(1),
  totalWeeks: z.number().int().min(1),
  summary: z.string(),
  milestones: z.array(milestoneSchema),
})

const riskSchema = z.object({
  risks: z.array(z.object({ title: z.string(), severity: z.enum(['low', 'medium', 'high']), mitigation: z.string() })),
  summary: z.string(),
})

export const analysisSchema = z.object({
  feasibility: feasibilitySchema,
  scopeAndStack: scopeSchema,
  plan: planSchema,
  risk: riskSchema,
})

export type ProjectAnalysis = z.infer<typeof analysisSchema>

export interface AnalysisResult {
  analysis: ProjectAnalysis
  mode: 'demo' | 'live'
}

export interface AnalysisProvider {
  readonly mode: AnalysisResult['mode']
  analyzeProject(project: ProjectIdea, profile: StudentProfile, runId?: string): Promise<ProjectAnalysis>
}

export class DemoAnalysisProvider implements AnalysisProvider {
  readonly mode = 'demo' as const

  async analyzeProject(project: ProjectIdea, profile: StudentProfile): Promise<ProjectAnalysis> {
    const result = runProjectAnalysis(project, profile)
    return analysisSchema.parse(result)
  }
}

export class RemoteAnalysisProvider implements AnalysisProvider {
  readonly mode = 'live' as const

  constructor(private readonly baseUrl: string) {}

  async analyzeProject(project: ProjectIdea, profile: StudentProfile, runId?: string): Promise<ProjectAnalysis> {
    const endpoint = `${this.baseUrl.replace(/\/$/, '')}/api/projects/analyze`
    let response: Response
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, profile, runId }),
        signal: AbortSignal.timeout(65000),
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new Error('The analysis backend timed out. Check that the backend and LLM provider are available, then retry.')
      }
      throw new Error('Could not reach the analysis backend. Start the backend and check its URL, then retry.')
    }

    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null)
      const message = typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `Remote analysis failed (${response.status})`
      throw new Error(message)
    }

    const payload = await response.json()
    return analysisSchema.parse(payload)
  }
}

export function createAnalysisProvider(): AnalysisProvider {
  const configuredUrl = (import.meta.env.VITE_PROJECTMENTOR_AI_BACKEND_URL ?? '').trim()
  if (configuredUrl) return new RemoteAnalysisProvider(configuredUrl)
  return new DemoAnalysisProvider()
}

export async function analyzeProject(project: ProjectIdea, profile: StudentProfile, runId?: string): Promise<AnalysisResult> {
  const provider = createAnalysisProvider()
  const analysis = await provider.analyzeProject(project, profile, runId)
  return { analysis, mode: provider.mode }
}
