import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, ChevronDown, CircleAlert, Clock3, LoaderCircle, RotateCcw, Send, ShieldCheck, Sparkles, Square, Target } from 'lucide-react'
import { AGENTS, INTERACTIVE_MODULES } from '../agents/registry'
import { errorMessage } from '../components/ui'
import { usePipelineRun } from '../hooks/usePipelineRun'
import { api } from '../services/api'
import { projectTypeLabel } from '../lib/skills'
import type { MilestonePlanResult, PipelineRun, ProjectIdea, RunStatus, StepStatus } from '../types/models'
import type { MilestoneProgress, MilestoneStatus } from '../services/api'

const RUN_LABELS: Record<RunStatus, string> = { queued: 'Queued', running: 'In progress', completed: 'Completed', failed: 'Failed', cancelled: 'Cancelled' }
const STEP_LABELS: Record<StepStatus, string> = { queued: 'Pending', running: 'Running', completed: 'Done', failed: 'Failed', cancelled: 'Cancelled' }
const formatDate = (iso: string) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export default function ProjectRun() {
  const { projectId = '' } = useParams()
  const [project, setProject] = useState<ProjectIdea | null | undefined>(undefined)
  const [actionError, setActionError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const { run, error: runError, loading } = usePipelineRun(project?.latestRunId)

  useEffect(() => {
    let cancelled = false
    setProject(undefined)
    api.getProject(projectId).then(p => { if (!cancelled) setProject(p) }).catch(e => { if (!cancelled) { setActionError(errorMessage(e)); setProject(null) } })
    return () => { cancelled = true }
  }, [projectId])

  /** Starts a first run or retries a failed run. */
  const trigger = async () => {
    if (!project) return
    setTriggering(true)
    setActionError(null)
    try {
      const next = await api.triggerPipeline(project.id)
      setProject({ ...project, latestRunId: next.id })
    } catch (e) {
      setActionError(errorMessage(e))
    } finally {
      setTriggering(false)
    }
  }

  const cancel = async () => {
    if (!run) return
    setCancelling(true)
    try { await api.cancelPipeline(run.id) }
    catch (e) { setActionError(errorMessage(e)) }
    finally { setCancelling(false) }
  }

  if (project === undefined) return <p className="page-loading"><LoaderCircle className="spin" size={18} /> Loading your project…</p>
  if (project === null) return (
    <div className="empty-state">
      <h1>We couldn't find that project.</h1>
      <p>{actionError ?? 'It may have been created in a different browser. Projects in demo mode are saved only on the device you used.'}</p>
      <div className="summary-actions"><Link className="button button-ghost" to="/projects">See my projects</Link></div>
    </div>
  )

  return (
    <>
      <header className="run-header">
        <div>
          <div className="eyebrow">{projectTypeLabel(project)} · {project.durationWeeks} weeks · Submitted {formatDate(project.createdAt)}</div>
          <h1>{project.title}</h1>
          <p>{project.description}</p>
        </div>
      </header>

      {actionError && <p className="form-error" role="alert"><CircleAlert size={15} /> {actionError}</p>}
      {runError && <p className="form-error" role="alert"><CircleAlert size={15} /> {runError}</p>}

      {loading ? <p className="page-loading"><LoaderCircle className="spin" size={18} /> Loading pipeline status…</p>
        : run ? <>
            <PipelinePanel run={run} onRetry={trigger} retrying={triggering} onCancel={cancel} cancelling={cancelling} />
            {run.results && <AnalysisReport run={run} projectId={project.id} />}
          </>
          : (
            <div className="callout">
              <div><strong>Not submitted for analysis yet</strong><span>Send this idea to the agent pipeline.</span></div>
              <button type="button" className="button button-primary" onClick={trigger} disabled={triggering}>{triggering ? <><LoaderCircle size={16} className="spin" /> Submitting…</> : <><Send size={16} /> Submit for analysis</>}</button>
            </div>
          )}
    </>
  )
}

function AnalysisReport({ run, projectId }: { run: PipelineRun; projectId: string }) {
  const { feasibility, scopeAndStack, plan, risk } = run.results!
  const tabs = [
    { id: 'report-feasibility', label: 'Overview' },
    { id: 'report-scope', label: 'Scope' },
    { id: 'report-tech', label: 'Technology' },
    { id: 'report-timeline', label: 'Milestones' },
    { id: 'report-risks', label: 'Risks' },
  ]
  const [activeTab, setActiveTab] = useState(tabs[0].id)
  const jumpTo = (id: string) => {
    setActiveTab(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    const sections = tabs.map(tab => document.getElementById(tab.id)).filter((section): section is HTMLElement => Boolean(section))
    if (!sections.length) return
    const observer = new IntersectionObserver(entries => {
      const current = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (current) setActiveTab(current.target.id)
    }, { rootMargin: '-145px 0px -60% 0px', threshold: [0, .15, .35, .6] })
    sections.forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [])
  return (
    <section className="mentor-report" aria-labelledby="analysis-report-title">
      <div className="report-toolbar"><div><span className="eyebrow">YOUR PROJECT BLUEPRINT</span><h2 id="analysis-report-title">A clear path from idea to MVP</h2></div><span className="report-updated">Updated {formatDate(run.finishedAt ?? run.createdAt)}</span></div>
      <nav className="report-tabs" aria-label="Project blueprint sections">{tabs.map(tab => <button key={tab.id} type="button" className={activeTab === tab.id ? 'selected' : undefined} aria-pressed={activeTab === tab.id} onClick={() => jumpTo(tab.id)}>{tab.label}</button>)}</nav>
      <div className="report-layout">
        <div className="report-main">
          <section className="report-section report-feasibility" id="report-feasibility">
            <div className="report-section-heading"><div><span className="report-kicker">01 · EVALUATION</span><h3>Feasibility analysis</h3><p>How achievable is this project within your available time and skills?</p></div><span className="feasibility-verdict">{feasibility.verdict}</span></div>
            <div className="feasibility-content"><div className="score-panel"><div className="score-ring" style={{ '--score': `${feasibility.score}%` } as React.CSSProperties}><span><strong>{feasibility.score}</strong><small>OUT OF 100</small></span></div><strong>Feasibility score</strong></div><div className="feasibility-factors">{[{label:'Technical viability',value:feasibility.technicalFeasibility},{label:'Skills match',value:feasibility.skillFeasibility},{label:'Time fit',value:feasibility.timeFeasibility},{label:'Resource availability',value:feasibility.resourceFeasibility}].map(factor => <div className="factor-row" key={factor.label}><div><strong>{factor.label}</strong><b>{factor.value.score}%</b></div><span className="factor-track"><span style={{ width: `${factor.value.score}%` }} /></span><p>{factor.value.summary}</p></div>)}</div></div>
            <div className="mentor-insight"><Sparkles size={18} /><div><strong>Mentor insight</strong><p>{feasibility.recommendations[0] ?? feasibility.notes[0]}</p></div></div>
          </section>
          <section className="report-section" id="report-tech"><div className="report-section-heading"><div><span className="report-kicker">02 · ARCHITECTURE</span><h3>Recommended tech stack</h3></div></div><div className="tech-stack-list">{scopeAndStack.techStack.map(item => <article className="tech-stack-item" key={item.layer}><span className="tech-stack-icon"><Check size={16} /></span><div><strong>{item.choice}</strong><span>{item.layer} · {item.learningDifficulty} to learn</span><p>{item.reason}</p></div></article>)}</div></section>
          <section className="report-section" id="report-scope"><div className="report-section-heading"><div><span className="report-kicker">03 · DEFINITION</span><h3>Project scope</h3></div></div><div className="scope-columns"><div><h4><Check size={16} /> In scope for MVP</h4><ul>{(scopeAndStack.inScope.length ? scopeAndStack.inScope : scopeAndStack.mvp).map(item => <li key={item}>{item}</li>)}</ul></div><div><h4><Clock3 size={16} /> Future expansion</h4><ul className="future-list">{(scopeAndStack.outOfScope.length ? scopeAndStack.outOfScope : scopeAndStack.optionalAdvancedFeatures).map(item => <li key={item}>{item}</li>)}</ul></div></div><div className="report-callout"><Target size={18} /><span><strong>Success looks like:</strong> {scopeAndStack.successCriteria[0] ?? scopeAndStack.summary}</span></div></section>
          <section className="report-section" id="report-timeline"><div className="report-section-heading"><div><span className="report-kicker">04 · ROADMAP</span><h3>{plan.projectDurationWeeks}-week execution timeline</h3><p>A practical sequence of milestones to build and validate your project.</p></div><span className="milestone-count">{plan.milestones.length} milestones</span></div><MilestoneTracker projectId={projectId} plan={plan} /></section>
          <section className="report-section" id="report-risks"><div className="report-section-heading"><div><span className="report-kicker">05 · PLAN AHEAD</span><h3>Risks to watch</h3></div></div><ul className="risk-list">{risk.risks.map(item => <li key={item.title}><ShieldCheck size={17} /><div><strong>{item.title}</strong><p>{item.mitigation}</p></div><span>{item.severity}</span></li>)}</ul></section>
        </div>
        <aside className="report-snapshot"><span className="report-kicker">PROJECT SNAPSHOT</span><h3>MVP at a glance</h3><div className="snapshot-stats"><div><strong>{plan.projectDurationWeeks}</strong><span>weeks</span><small>Estimated timeline</small></div><div><strong>{feasibility.implementationComplexity}</strong><small>Complexity</small></div><div><strong>{scopeAndStack.projectModules.length}</strong><small>Core modules</small></div><div><strong>{scopeAndStack.techStack.length}</strong><small>Tech choices</small></div></div><div className="snapshot-priority"><span>TOP PRIORITY</span><strong><ShieldCheck size={16} /> {feasibility.recommendations[0] ?? 'Build and validate a focused MVP'}</strong></div><p className="snapshot-note">Use this report as a starting point. Adjust the plan as you learn and test your idea.</p></aside>
      </div>
      <footer className="report-footer"><span>ProjectMentor AI · Student project guidance</span><span>Review recommendations with your mentor before implementation.</span></footer>
    </section>
  )
}

function MilestoneTracker({ projectId, plan }: { projectId: string; plan: MilestonePlanResult }) {
  const [statuses, setStatuses] = useState<Record<number, MilestoneStatus>>(() => Object.fromEntries(plan.milestones.map(item => [item.week, item.status])))
  const [savingWeek, setSavingWeek] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.getMilestoneProgress(projectId).then((items: MilestoneProgress[]) => {
      if (cancelled) return
      setStatuses(previous => ({ ...previous, ...Object.fromEntries(items.map(item => [item.week, item.status])) }))
      setLoaded(true)
    }).catch(e => { if (!cancelled) { setError(errorMessage(e)); setLoaded(true) } })
    return () => { cancelled = true }
  }, [projectId])

  const done = plan.milestones.filter(item => statuses[item.week] === 'done').length
  const percent = plan.milestones.length ? Math.round(plan.milestones.reduce((sum, item) => sum + ({ planned: 0, 'in-progress': 25, 'half-done': 50, done: 100 }[statuses[item.week] ?? item.status]), 0) / plan.milestones.length) : 0
  const setStatus = async (week: number, next: MilestoneStatus) => {
    const prior = statuses[week]
    setStatuses(current => ({ ...current, [week]: next }))
    setSavingWeek(week)
    setError('')
    try { await api.setMilestoneProgress(projectId, week, next) }
    catch (e) { setStatuses(current => ({ ...current, [week]: prior })); setError(errorMessage(e)) }
    finally { setSavingWeek(null) }
  }

  return <div className="milestone-tracker">
    <div className="milestone-tracker-summary">
      <div className="milestone-progress-copy"><strong>{done} of {plan.milestones.length} milestones complete</strong><span>{loaded ? `${percent}% complete` : 'Loading your progress…'}</span></div>
      <div className="milestone-progress-bar" role="progressbar" aria-label="Project milestone progress" aria-valuemin={0} aria-valuemax={plan.milestones.length} aria-valuenow={done}><span style={{ width: `${percent}%` }} /></div>
    </div>
    {error && <p className="milestone-error" role="alert">{error}</p>}
    <ol className="report-milestones tracker-milestones">{plan.milestones.map(item => {
      const status = statuses[item.week] ?? item.status
      const complete = status === 'done'
      const statusLabel = { planned: 'UP NEXT', 'in-progress': 'IN PROGRESS', 'half-done': 'HALF DONE', done: 'COMPLETED' }[status]
      return <li key={item.week} className={`milestone-status-${status}`}>
        <span className="milestone-dot">{complete ? <Check size={14} /> : item.week}</span>
        <div className="tracker-milestone-content">
          <span className="report-kicker">WEEK {item.week} · {statusLabel}</span>
          <strong>{item.title}</strong>
          <p>{item.tasks.join(' · ')}</p>
          <small>{item.estimatedHours} hours · Deliverable: {item.deliverables[0]}</small>
          <MilestoneStatusPicker week={item.week} status={status} saving={savingWeek === item.week} onSelect={next => void setStatus(item.week, next)} />
        </div>
      </li>
    })}</ol>
  </div>
}

function MilestoneStatusPicker({ week, status, saving, onSelect }: { week: number; status: MilestoneStatus; saving: boolean; onSelect: (status: MilestoneStatus) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const labels: Record<MilestoneStatus, string> = { planned: 'Not started', 'in-progress': 'In progress', 'half-done': 'Half done', done: 'Completed' }
  const options: MilestoneStatus[] = ['planned', 'in-progress', 'half-done', 'done']

  useEffect(() => {
    if (!open) return
    const outside = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape) }
  }, [open])

  return <div className={`milestone-status-picker status-${status}`} ref={ref}>
    <button type="button" className="milestone-status-trigger" aria-label={`Week ${week} status: ${labels[status]}. Change progress.`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)} disabled={saving}>
      {saving ? <><LoaderCircle size={13} className="spin" /> Saving…</> : <>{labels[status]}<ChevronDown size={14} /></>}
    </button>
    {open && <div className="milestone-status-menu" role="menu" aria-label={`Set progress for week ${week}`}>
      {options.map(option => <button key={option} type="button" role="menuitemradio" aria-checked={option === status} className={option === status ? 'selected' : undefined} onClick={() => { setOpen(false); if (option !== status) onSelect(option) }}>
        <span>{labels[option]}</span>{option === status && <Check size={14} />}
      </button>)}
    </div>}
  </div>
}

function PipelinePanel({ run, onRetry, retrying, onCancel, cancelling }: { run: PipelineRun; onRetry: () => void; retrying: boolean; onCancel: () => void; cancelling: boolean }) {
  const steps = new Map(run.steps.map(s => [s.agentId, s]))
  const [expanded, setExpanded] = useState<string | null>(() => run.steps.find(s => s.status === 'failed' || s.status === 'running')?.agentId ?? null)
  const doneCount = run.steps.filter(step => step.status === 'completed').length
  const progress = run.status === 'completed' ? 100 : Math.round(doneCount / run.steps.length * 100)
  return (
    <section className="pipeline-card" aria-labelledby="pipeline-title">
      <div className="pipeline-head">
        <h2 id="pipeline-title">Analysis pipeline</h2>
        <span className={`run-status ${run.status}`}>{RUN_LABELS[run.status]}</span>
      </div>
      <p className="pipeline-note" aria-live="polite">
        {run.status === 'queued'
          ? <>Your idea was submitted on {formatDate(run.createdAt)} and is waiting for analysis to start.</>
          : run.status === 'completed' ? 'All four specialist agents completed and their outputs passed validation.' : run.status === 'failed' ? 'An agent failed. Review its message and retry the analysis.' : run.status === 'cancelled' ? 'Analysis was cancelled.' : 'The specialist agents are working through the project plan.'}
      </p>
      {run.status === 'completed' && run.analysisMode && (
        <p className="pipeline-note" role="status">
          Analysis source: <strong>{run.analysisMode === 'live' ? 'Live LLM backend' : 'Deterministic demo engine'}</strong>
        </p>
      )}
      {run.status === 'failed' && (
        <div className="pipeline-retry">
          <p>Review the error shown for the failed agents, then retry the analysis.</p>
          <button type="button" className="button button-primary" onClick={onRetry} disabled={retrying}>
            {retrying ? <><LoaderCircle size={16} className="spin" /> Retrying…</> : <><RotateCcw size={15} /> Retry analysis</>}
          </button>
        </div>
      )}
      {(run.status === 'queued' || run.status === 'running') && run.analysisMode === 'live' && (
        <div className="pipeline-retry"><button type="button" className="button button-ghost" onClick={onCancel} disabled={cancelling}>{cancelling ? <><LoaderCircle size={15} className="spin" /> Cancelling…</> : <><Square size={14} /> Cancel analysis</>}</button></div>
      )}

      <div className="analysis-progress" aria-label={`${doneCount} of ${run.steps.length} agents completed`}>
        <div className="analysis-progress-top"><strong>{run.status === 'completed' ? 'Your project plan is ready' : `${doneCount} of ${run.steps.length} steps complete`}</strong><span>{progress}%</span></div>
        <div className="analysis-progress-track"><span style={{ width: `${progress}%` }} /></div>
        <p>Follow each specialist’s progress. Select a step to see its update.</p>
      </div>
      <ol className="analysis-timeline">
        {AGENTS.map((agent, i) => {
          const step = steps.get(agent.id)
          const status = step?.status ?? 'queued'
          const isOpen = expanded === agent.id
          return (
            <li key={agent.id} className={`analysis-timeline-item ${status} ${isOpen ? 'open' : ''}`}>
              <button type="button" className="analysis-step-button" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : agent.id)}>
                <span className="analysis-step-marker" aria-hidden="true">{status === 'completed' ? <Check size={15} /> : status === 'running' ? <LoaderCircle size={15} className="spin" /> : <agent.icon size={15} />}</span>
                <span className="analysis-step-copy"><span className="analysis-step-kicker">STEP {i + 1}</span><strong>{agent.name}</strong></span>
                <span className={`analysis-step-status ${status}`}>{STEP_LABELS[status]}</span>
                <span className="analysis-step-chevron" aria-hidden="true">{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen && <div className="analysis-step-detail"><p>{step?.error ?? step?.summary ?? agent.role}</p></div>}
            </li>
          )
        })}
      </ol>

      <div className="pipeline-later">
        <span className="muted-label">AVAILABLE AFTER ANALYSIS</span>
        <ul>{INTERACTIVE_MODULES.map(m => <li key={m.module}><m.icon size={15} /> <strong>{m.name}</strong> — {m.role}</li>)}</ul>
      </div>
    </section>
  )
}
