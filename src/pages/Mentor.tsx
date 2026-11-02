import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Bot, Check, CircleAlert, Lightbulb, LoaderCircle, MessageCircle, Send, ShieldCheck, Sparkles, Target } from 'lucide-react'
import { errorMessage } from '../components/ui'
import { api } from '../services/api'
import type { PipelineRun, ProjectIdea } from '../types/models'

type ChatMessage = { id: string; role: 'student' | 'mentor'; text: string; createdAt: string }
const prompts = ['What should I build first?', 'Is my plan realistic?', 'What should I test?']
const newMessage = (role: ChatMessage['role'], text: string): ChatMessage => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, role, text, createdAt: new Date().toISOString() })

export default function Mentor() {
  const [projects, setProjects] = useState<ProjectIdea[]>([])
  const [projectId, setProjectId] = useState('')
  const [run, setRun] = useState<PipelineRun | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const project = projects.find(item => item.id === projectId) ?? null

  useEffect(() => {
    let cancelled = false
    api.listProjects().then(list => { if (!cancelled) { setProjects(list); setProjectId(list[0]?.id ?? '') } })
      .catch(e => { if (!cancelled) setError(errorMessage(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    setRun(null)
    setMessages(project ? [newMessage('mentor', `Hi! I’m your project mentor for “${project.title}”. Ask me about your project idea, timeline, technology, or how to break down the next step.`)] : [])
    if (project?.latestRunId) api.getPipelineRun(project.latestRunId).then(value => { if (!cancelled) setRun(value) }).catch(() => {})
    return () => { cancelled = true }
  }, [projectId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages])

  const reply = (question: string) => makeMentorReply(question, project!, run)
  const send = (text: string) => {
    const question = text.trim()
    if (!question || !project) return
    setMessages(current => [...current, newMessage('student', question), newMessage('mentor', reply(question))])
    setDraft('')
  }
  const submit = (event: FormEvent) => { event.preventDefault(); send(draft) }

  if (loading) return <p className="page-loading"><LoaderCircle className="spin" size={18} /> Opening your mentor workspace…</p>
  if (!project) return <section className="mentor-empty">
    <span className="mentor-empty-icon"><MessageCircle size={22} /></span>
    <span className="muted-label">AI MENTOR</span>
    <h1>Start with a project idea</h1>
    <p>Your mentor workspace will use your project plan to make its guidance more relevant.</p>
    {error && <p className="form-error" role="alert"><CircleAlert size={15} /> {error}</p>}
    <Link className="button button-primary" to="/create">Create a project <ArrowUpRight size={16} /></Link>
  </section>

  return <section className="mentor-workspace" aria-labelledby="mentor-title">
    <header className="mentor-page-head">
      <div><span className="muted-label"><Sparkles size={13} /> YOUR PROJECT GUIDE</span><h1 id="mentor-title">AI Mentor</h1><p>Ask a question and get practical guidance based on your project.</p></div>
      <span className="mentor-demo-badge"><span /> Demo mentor · no API calls</span>
    </header>
    {error && <p className="form-error" role="alert"><CircleAlert size={15} /> {error}</p>}
    <div className="mentor-chat-card">
      <div className="mentor-chat-head">
        <div className="mentor-avatar"><Bot size={20} /></div>
        <div><strong>Project mentor</strong><span>Guidance for your project workspace</span></div>
        <label className="mentor-project-select"><span>PROJECT</span><select aria-label="Choose a project" value={projectId} onChange={event => setProjectId(event.target.value)}>{projects.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      </div>
      <div className="mentor-project-context"><Target size={15} /><span>{project.description}</span></div>
      <div className="mentor-messages" aria-live="polite" aria-label="Mentor conversation">
        {messages.map(message => <article key={message.id} className={`mentor-message ${message.role}`}>
          {message.role === 'mentor' && <span className="mentor-message-avatar"><Sparkles size={14} /></span>}
          <div className="mentor-message-bubble"><p>{message.text}</p><time>{new Date(message.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</time></div>
        </article>)}
        <div ref={bottomRef} />
      </div>
      <div className="mentor-quick-prompts"><span>TRY ASKING</span>{prompts.map(prompt => <button type="button" key={prompt} onClick={() => send(prompt)}><Lightbulb size={13} /> {prompt}</button>)}</div>
      <form className="mentor-composer" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="mentor-question">Ask about your project</label>
        <textarea id="mentor-question" rows={1} maxLength={500} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(draft) } }} placeholder="Ask anything about your project…" />
        <button className="button button-primary" type="submit" disabled={!draft.trim()} aria-label="Send message"><Send size={16} /></button>
      </form>
      <p className="mentor-demo-note"><ShieldCheck size={14} /> This no-cost demo mentor uses your saved blueprint and fixed guidance rules. It doesn’t send messages to an AI service.</p>
    </div>
    {run?.results && <aside className="mentor-context-summary"><Check size={15} /><span>Project context loaded from your latest blueprint, including the recommended stack and milestones.</span><Link to={`/projects/${project.id}`}>View blueprint</Link></aside>}
  </section>
}

function makeMentorReply(question: string, project: ProjectIdea, run: PipelineRun | null) {
  const text = question.toLowerCase()
  const results = run?.results
  if (!results) return `Let’s make “${project.title}” manageable. Start by writing down one user, the problem they face, and the smallest feature that would help. Your current idea is: ${project.description}`
  if (/test|testing|validat/.test(text)) {
    const checkpoint = results.plan.milestones.find(milestone => milestone.testingCheckpoint)?.testingCheckpoint
    return checkpoint ? `A useful first check is: ${checkpoint} For “${project.title}”, test this with someone who represents your target user and record what they can complete without help.` : `Start with one end-to-end test of the main user journey for “${project.title}”. Write down what should happen, try it with a classmate, and note where they get stuck.`
  }
  if (/tech|stack|language|database|framework/.test(text)) {
    const stack = results.scopeAndStack.techStack.slice(0, 3).map(item => `${item.layer}: ${item.choice}`).join('; ')
    return `Your blueprint recommends ${stack}. Start with the simplest part you can run locally, then connect the pieces one at a time. The report explains why each choice fits.`
  }
  if (/risk|block|problem|stuck/.test(text)) {
    const risk = results.risk.risks[0]
    return risk ? `One risk to plan for is ${risk.title.toLowerCase()}. ${risk.mitigation} Keep a smaller fallback version of your core feature ready.` : `Break the blocker into a small question you can answer in one work session. Protect the core feature first, then move optional work later.`
  }
  if (/first|next|milestone|week|timeline|start/.test(text)) {
    const milestone = results.plan.milestones.find(item => item.status !== 'done') ?? results.plan.milestones[0]
    return milestone ? `Your next milestone is Week ${milestone.week}: ${milestone.title}. Begin with ${milestone.tasks[0]?.toLowerCase() ?? 'the first task in your plan'}. Aim to finish its deliverable: ${milestone.deliverables[0]}.` : `Your milestones are marked complete. Review your final deliverables and ask a student or mentor to try the main project flow.`
  }
  if (/scope|mvp|feature/.test(text)) return `Keep the first version focused on these blueprint items: ${results.scopeAndStack.mvp.slice(0, 3).join('; ')}. Save the future-expansion features until the core flow works.`
  return `For “${project.title}”, focus on one small outcome this week: ${results.plan.milestones.find(item => item.status !== 'done')?.title ?? results.scopeAndStack.mvp[0]}. What part feels least clear right now?`
}
