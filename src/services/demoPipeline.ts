/**
 * Browser-persisted pipeline execution. The selected provider is either the explicitly
 * labelled deterministic demo engine or the configured remote LLM backend.
 */
import { AGENTS } from '../agents/registry'
import { load, newId, save } from '../lib/storage'
import { analyzeProject } from './ai'
import type { PipelineRun, ProjectIdea, StudentProfile } from '../types/models'

const RUNS_KEY = 'pipeline-runs'
const readRuns = () => load<Record<string, PipelineRun>>(RUNS_KEY, {})
const activeRuns = new Set<string>()

export function triggerDemoRun(project: ProjectIdea): PipelineRun {
  const existing = Object.values(readRuns()).find(run =>
    run.projectId === project.id && (run.status === 'queued' || run.status === 'running'),
  )
  if (existing) return existing

  const run: PipelineRun = {
    id: newId('run'),
    projectId: project.id,
    status: 'queued',
    steps: AGENTS.map(agent => ({ agentId: agent.id, status: 'queued' })),
    createdAt: new Date().toISOString(),
  }
  save(RUNS_KEY, { ...readRuns(), [run.id]: run })
  return run
}

export function storeDemoRun(run: PipelineRun) {
  save(RUNS_KEY, { ...readRuns(), [run.id]: run })
}

export async function completeDemoRun(project: ProjectIdea, profile: StudentProfile, runId: string): Promise<PipelineRun> {
  const existing = getDemoRun(runId)
  if (!existing) throw new Error('The pipeline run could not be found.')
  if (existing.status === 'completed' || existing.status === 'failed') return existing
  if (activeRuns.has(runId)) return existing

  activeRuns.add(runId)
  const startedAt = new Date().toISOString()
  storeDemoRun({
    ...existing,
    status: 'running',
    steps: AGENTS.map(agent => ({ agentId: agent.id, status: 'running', startedAt })),
  })

  try {
    const result = await analyzeProject(project, profile, runId)
    const finishedAt = new Date().toISOString()
    const completed: PipelineRun = {
      ...existing,
      status: 'completed',
      analysisMode: result.mode,
      steps: AGENTS.map(agent => ({
        agentId: agent.id,
        status: 'completed',
        startedAt,
        finishedAt,
        summary: agent.id === 'feasibility' ? `Feasibility: ${result.analysis.feasibility.score}/100 (${result.analysis.feasibility.verdict})` : agent.id === 'scope_tech' ? `Scope set: ${result.analysis.scopeAndStack.mvp.length} MVP items.` : agent.id === 'planner' ? `Timeline created for ${result.analysis.plan.totalWeeks} weeks.` : `Risk review: ${result.analysis.risk.risks.length} mitigations.`,
      })),
      finishedAt,
      results: result.analysis,
    }
    storeDemoRun(completed)
    return completed
  } catch (error) {
    const finishedAt = new Date().toISOString()
    const message = error instanceof Error ? error.message : 'The analysis failed for an unknown reason.'
    const failed: PipelineRun = {
      ...existing,
      status: 'failed',
      steps: AGENTS.map(agent => ({
        agentId: agent.id,
        status: 'failed',
        startedAt,
        finishedAt,
        error: message,
      })),
      finishedAt,
    }
    storeDemoRun(failed)
    return failed
  } finally {
    activeRuns.delete(runId)
  }
}

/** Removes every run of a deleted project. */
export function deleteDemoRuns(projectId: string) {
  save(RUNS_KEY, Object.fromEntries(Object.entries(readRuns()).filter(([, run]) => run.projectId !== projectId)))
}

export function getDemoRun(runId: string): PipelineRun | null {
  return readRuns()[runId] ?? null
}
