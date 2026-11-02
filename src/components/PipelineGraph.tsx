import { Check, Clock3, LoaderCircle } from 'lucide-react'
import { pipelineStages } from '../agents/registry'
import type { AgentStep, StepStatus } from '../types/models'

const STEP_LABELS: Record<StepStatus, string> = { queued: 'Pending', running: 'Running', completed: 'Done', failed: 'Failed', cancelled: 'Cancelled' }

/** Visual DAG of the multi-agent pipeline with status from the current run. Layout stacks vertically on narrow screens via CSS. */
export function PipelineGraph({ steps }: { steps: AgentStep[] }) {
  const stepMap = new Map(steps.map(s => [s.agentId, s]))
  const stages = pipelineStages()

  return (
    <section className="pipeline-graph" aria-label="Agent pipeline workflow">
      <div className="pipeline-graph-stages">
        {stages.map((stage, si) => {
          const prevStage = stages[si - 1]
          const prevDone = prevStage?.every(a => stepMap.get(a.id)?.status === 'completed') ?? true
          return (
            <section key={si} className={`pipeline-graph-stage ${stage.length > 1 ? 'parallel' : ''} ${prevDone ? 'completed-path' : ''}`} aria-label={`Stage ${si + 1}${stage.length > 1 ? ', parallel' : ''}`}>
              <span className="pipeline-graph-label">Stage {si + 1}{stage.length > 1 ? ' · parallel' : ''}</span>
              {stage.map(agent => {
                const step = stepMap.get(agent.id)
                const status = step?.status ?? 'queued'
                return (
                  <article key={agent.id} className={`pipeline-graph-node ${status}`}>
                    <span className="pipeline-graph-node-icon" aria-hidden="true">
                      {status === 'completed' ? <Check size={18} /> : status === 'running' ? <LoaderCircle size={18} className="spin" /> : <agent.icon size={18} />}
                    </span>
                    <strong>{agent.name}</strong>
                    <span className="agent-badge">
                      {status === 'queued' && <Clock3 size={11} />} {STEP_LABELS[status]}
                    </span>
                  </article>
                )
              })}
            </section>
          )
        })}
      </div>
    </section>
  )
}
