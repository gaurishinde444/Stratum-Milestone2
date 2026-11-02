import { BrainCircuit, Clock3, FileText, Layers3, MessageCircle, ShieldAlert, type LucideIcon } from 'lucide-react'
import type { AgentId } from '../types/models'

export interface AgentDefinition {
  id: AgentId
  /** Project module number (see docs/ARCHITECTURE.md). */
  module: number
  name: string
  /** What the agent is responsible for, shown in the pipeline view. */
  role: string
  /** Agents whose output this agent needs before it can start. */
  dependsOn: AgentId[]
  icon: LucideIcon
}

/**
 * Specialist report sections (modules 2–5) and their intended dependency graph:
 *
 *   feasibility ──► scope_tech ──┬──► planner
 *                                └──► risk
 *
 * The current local pipeline generates and validates all sections in one provider operation.
 */
export const AGENTS: AgentDefinition[] = [
  { id: 'feasibility', module: 2, name: 'Feasibility Analysis', role: 'Checks the idea against your skills and the time you have.', dependsOn: [], icon: BrainCircuit },
  { id: 'scope_tech', module: 3, name: 'Scope & Tech Stack', role: 'Defines what is in and out of scope, and recommends technologies.', dependsOn: ['feasibility'], icon: Layers3 },
  { id: 'planner', module: 4, name: 'Milestone Planning', role: 'Breaks the project into a week-by-week timeline.', dependsOn: ['scope_tech'], icon: Clock3 },
  { id: 'risk', module: 5, name: 'Risk Assessment', role: 'Flags likely blockers and suggests how to mitigate them.', dependsOn: ['scope_tech'], icon: ShieldAlert },
]

export const agentById = Object.fromEntries(AGENTS.map(a => [a.id, a])) as Record<AgentId, AgentDefinition>

/** Interactive modules (6–7): used on demand once a run has completed, so they are not pipeline steps. */
export const INTERACTIVE_MODULES: { module: number; name: string; role: string; icon: LucideIcon }[] = [
  { module: 6, name: 'Mentor chat', role: 'Ask questions and get guidance on your project.', icon: MessageCircle },
  { module: 7, name: 'Report generation', role: 'Generate a synopsis and progress reports.', icon: FileText },
]

/** Topological layers of the DAG: agents in the same stage can run in parallel. */
export function pipelineStages(): AgentDefinition[][] {
  const stages: AgentDefinition[][] = []
  const placed = new Set<AgentId>()
  while (placed.size < AGENTS.length) {
    const ready = AGENTS.filter(a => !placed.has(a.id) && a.dependsOn.every(d => placed.has(d)))
    if (!ready.length) throw new Error('Agent registry contains a dependency cycle')
    ready.forEach(a => placed.add(a.id))
    stages.push(ready)
  }
  return stages
}
