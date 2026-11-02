import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, CircleAlert, GraduationCap, LoaderCircle, RotateCcw, Send, Sparkles } from 'lucide-react'
 
import { FlowSteps, errorMessage } from '../components/ui'
import { VoiceInput } from '../components/VoiceInput'
import { pipelineStages } from '../agents/registry'
import { api } from '../services/api'
import { load, remove, save } from '../lib/storage'
import { DOMAIN_LABELS, LEVEL_LABELS } from '../lib/skills'
import type { ProjectDomain, StudentProfile } from '../types/models'

const MIN_IDEA = 30
const MAX_IDEA = 1000
const DURATIONS = [4, 6, 8, 10, 12, 16]
const DOMAINS = Object.keys(DOMAIN_LABELS) as ProjectDomain[]

const ideaSchema = z.object({
  title: z.string().trim().min(3, 'Give your idea a short working title (at least 3 characters).').max(80, 'Please keep the title under 80 characters.'),
  description: z.string().trim().min(MIN_IDEA, `Add a little more detail — at least ${MIN_IDEA} characters (about two sentences).`).max(MAX_IDEA, `Please keep it under ${MAX_IDEA} characters.`),
  domain: z.enum(['ai_ml', 'web', 'mobile', 'iot', 'data', 'other']),
  customDomain: z.string().trim().max(40, 'Please keep this under 40 characters.'),
  durationWeeks: z.number().int().min(4).max(24),
}).refine(d => d.domain !== 'other' || d.customDomain.trim().length >= 2, { path: ['customDomain'], message: 'Type what kind of project it is, e.g. Cybersecurity.' })
type IdeaForm = z.infer<typeof ideaSchema>

export default function CreateProject({ profile }: { profile: StudentProfile | null }) {
  if (!profile) return <NeedsProfile />
  return <IdeaFormPage profile={profile} />
}

function NeedsProfile() {
  return (
    <div className="empty-state">
      <h1>Complete your profile first</h1>
      <p>The agents use your skills and available time to make the plan realistic. It takes about two minutes.</p>
      <Link className="button button-primary" to="/onboarding">Create my profile <ArrowRight size={16} /></Link>
    </div>
  )
}

const EMPTY_IDEA: IdeaForm = { title: '', description: '', domain: 'web', customDomain: '', durationWeeks: 8 }
/** Unsent drafts are kept per student, so nothing typed is lost if they leave the page. */
const draftKey = (userId: string) => `idea-draft:${userId}`
const hasContent = (d: IdeaForm) => Boolean(d.title.trim() || d.description.trim() || d.customDomain.trim())

function IdeaFormPage({ profile }: { profile: StudentProfile }) {
  const navigate = useNavigate()
  const [initialDraft] = useState(() => load<IdeaForm | null>(draftKey(profile.userId), null))
  const [draftRestored, setDraftRestored] = useState(() => Boolean(initialDraft && hasContent(initialDraft)))
  // The setup tracker only matters before the first idea; hide it for returning students.
  const [isFirstIdea, setIsFirstIdea] = useState<boolean | null>(null)
  const { register, handleSubmit, watch, setValue, getValues, reset, formState: { errors, isSubmitting, isSubmitted }, setError } = useForm({
    resolver: zodResolver(ideaSchema),
    mode: 'onSubmit',
    defaultValues: { ...EMPTY_IDEA, ...initialDraft },
  })
  const stages = pipelineStages()

  useEffect(() => {
    let cancelled = false
    api.listProjects().then(list => { if (!cancelled) setIsFirstIdea(list.length === 0) }).catch(() => { if (!cancelled) setIsFirstIdea(false) })
    return () => { cancelled = true }
  }, [])

  // Save a draft on every change; an empty form removes it.
  useEffect(() => {
    const subscription = watch(values => {
      const draft = { ...EMPTY_IDEA, ...values } as IdeaForm
      if (hasContent(draft)) save(draftKey(profile.userId), draft)
      else remove(draftKey(profile.userId))
    })
    return () => subscription.unsubscribe()
  }, [watch, profile.userId])

  const startFresh = () => { reset(EMPTY_IDEA); remove(draftKey(profile.userId)); setDraftRestored(false) }
  const description = watch('description')
  /** Each phrase spoken into the microphone is added to the end of the description. */
  const addSpoken = (phrase: string) => {
    const current = getValues('description')
    const next = (current && !/\s$/.test(current) ? current + ' ' : current) + phrase
    setValue('description', next.slice(0, MAX_IDEA), { shouldValidate: isSubmitted, shouldDirty: true })
  }
  const domain = watch('domain')
  const length = description.trim().length

  const submit = handleSubmit(async data => {
    try {
      const { customDomain, ...rest } = data
      const { project } = await api.submitIdea({ ...rest, ...(data.domain === 'other' ? { customDomain: customDomain.trim() } : {}) })
      remove(draftKey(profile.userId))
      navigate(`/projects/${project.id}`)
    } catch (e) {
      setError('root', { message: errorMessage(e) })
    }
  })

  return (
    <>
      <div className="form-shell create-shell">
        <div className="form-intro create-head">
          <div>
            <span className="muted-label"><Sparkles size={13} /> PROJECT STUDIO</span>
            <h1>Create new project</h1>
            <p>Tell us about the problem you want to solve. Your project blueprint will help you turn the idea into a practical plan.</p>
            <p className="profile-line"><GraduationCap size={14} /> Planning for <strong>{profile.name}</strong> · {LEVEL_LABELS[profile.assessment.level]} · {profile.weeklyHours}h/week · <Link to="/onboarding?edit=skills" state={{ from: '/create' }}>Edit</Link></p>
            <p>Write in English or your own language. A rough first draft is enough to get started.</p>
          </div>
          {isFirstIdea && <FlowSteps current={2} />}
        </div>

        {draftRestored && (
          <div className="draft-note" role="status">
            <RotateCcw size={15} /> <span>We restored the idea you were writing earlier.</span>
            <button type="button" className="link-button" onClick={startFresh}>Start fresh</button>
          </div>
        )}

        {/* Two columns on wide screens so the whole form fits without scrolling. */}
        <form className="form-card idea-grid" onSubmit={submit} noValidate>
          <div className="idea-main">
          <label>Give your idea a working title <span className="required-mark" aria-hidden="true">*</span>
            <input {...register('title')} placeholder="e.g. Smart Campus Companion" aria-invalid={!!errors.title} aria-describedby={errors.title ? 'title-error' : undefined} autoFocus />
            {errors.title && <span className="field-error" id="title-error"><CircleAlert size={13} /> {errors.title.message}</span>}
          </label>

          <div className="desc-head">
            <label htmlFor="idea-description" className="field-label">Describe your idea <span className="required-mark" aria-hidden="true">*</span></label>
            <VoiceInput onText={addSpoken} />
          </div>
          <label className="desc-box">
            <textarea id="idea-description" {...register('description')} placeholder="Type here, or press Speak and talk. What problem do you want to solve? Who would use your solution? What would it do?" rows={6} maxLength={MAX_IDEA} aria-invalid={!!errors.description} aria-describedby="idea-help" />
          </label>
          <div className="textarea-footer" id="idea-help">
            {errors.description
              ? <span className="field-error"><CircleAlert size={13} /> {errors.description.message}</span>
              : <span className={length >= MIN_IDEA ? 'ok' : ''}>{length >= MIN_IDEA ? <><Check size={12} /> Looks good</> : length ? `Add ${MIN_IDEA - length} more character${MIN_IDEA - length === 1 ? '' : 's'}` : 'Two or three sentences are enough'}</span>}
            <span className={description.length > MAX_IDEA * .9 ? 'warn' : ''}>{description.length}/{MAX_IDEA}</span>
          </div>
          </div>

          <div className="idea-side">

          <fieldset className="choice-group">
            <legend className="field-label">What kind of project is it?</legend>
            <div className="skill-options">
              {DOMAINS.map(d => <label key={d} className={domain === d ? 'skill-option selected' : 'skill-option'}><input type="radio" className="visually-hidden" value={d} {...register('domain')} />{domain === d && <Check size={13} />} {DOMAIN_LABELS[d]}</label>)}
            </div>
            {domain === 'other' && (
              <label className="custom-domain">
                <span className="visually-hidden">Type of project</span>
                <input {...register('customDomain')} placeholder="Type it, e.g. Cybersecurity or Robotics" maxLength={40} aria-invalid={!!errors.customDomain} aria-describedby={errors.customDomain ? 'custom-domain-error' : undefined} autoFocus />
                {errors.customDomain && <span className="field-error" id="custom-domain-error"><CircleAlert size={13} /> {errors.customDomain.message}</span>}
              </label>
            )}
          </fieldset>

          <label>How long do you have?
            <select {...register('durationWeeks', { setValueAs: Number })}>{DURATIONS.map(w => <option key={w} value={w}>{w} weeks</option>)}</select>
          </label>

          {errors.root && <p className="form-error" role="alert"><CircleAlert size={15} /> {errors.root.message}</p>}
          <button className="button button-primary form-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? <><LoaderCircle size={16} className="spin" /> Creating blueprint…</> : <><Send size={16} /> Generate project blueprint</>}</button>
          <p className="next-hint"><Sparkles size={14} /> Next: AI agents review its feasibility, scope, timeline &amp; risks.</p>
          <aside className="create-preview" aria-labelledby="create-preview-title">
            <h3 id="create-preview-title"><Sparkles size={16} /> How it works</h3>
            <p>Your submission creates a project and a pipeline run. These are the designed analysis roles; demo-mode runs remain queued.</p>
            <ol className="create-preview-steps">
              {stages.flatMap((stage, index) => stage.map(agent => (
                <li key={agent.id}>
                  <agent.icon size={16} />
                  <span><strong>{agent.name}</strong>{agent.role}{index > 0 && stage.length > 1 ? ' (parallel stage)' : ''}</span>
                </li>
              )))}
            </ol>
          </aside>
          </div>
        </form>
      </div>
    </>
  )
}
