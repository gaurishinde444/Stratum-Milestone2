import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, CircleAlert, ClipboardCheck, Pencil, Sparkles, TrendingUp } from 'lucide-react'
import { FlowSteps, ScoreRing, errorMessage } from '../components/ui'
import { SkillQuiz, type QuizResults } from '../components/SkillQuiz'
import { api } from '../services/api'
import { EXPERIENCE_LABELS, LEVEL_LABELS, PROFICIENCY_HINTS, PROFICIENCY_LABELS, SKILL_CATALOG, rating } from '../lib/skills'
import type { PriorExperience, Proficiency, StudentProfile } from '../types/models'

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name (at least 2 characters).').max(50, 'Please keep your name under 50 characters.'),
  course: z.string().trim().min(2, 'Please enter your course or branch.').max(80, 'Please keep this under 80 characters.'),
  year: z.string().min(1, 'Please select your current year.'),
  skills: z.array(z.object({ skill: z.string(), level: z.union([z.literal(1), z.literal(2), z.literal(3)]) })).min(1, 'Pick at least one skill — beginner level counts too.'),
  priorProjects: z.enum(['none', 'one', 'several']),
  weeklyHours: z.number({ error: 'Enter the number of hours you can spend each week.' }).int('Use a whole number.').min(1, 'Plan for at least 1 hour a week.').max(40, 'Up to 40 hours a week.'),
})
type ProfileForm = z.infer<typeof profileSchema>
type Step = 'about' | 'skills' | 'quiz' | 'result' | 'edit'

const YEARS = ['1st year', '2nd year', '3rd year', '4th year', 'Postgraduate']

/** Form values for a saved profile, or empty ones for a new student (they type their own name). */
const formValues = (profile: StudentProfile | null): ProfileForm => ({
  name: profile?.name ?? '',
  course: profile?.course ?? '',
  year: profile?.year ?? '',
  skills: profile?.skills.map(s => ({ skill: s.skill, level: s.selfLevel ?? s.level })) ?? [],
  priorProjects: profile?.priorProjects ?? 'none',
  weeklyHours: profile?.weeklyHours ?? 6,
})

export default function Onboarding({ profile, onSaved }: { profile: StudentProfile | null; onSaved: (p: StudentProfile) => void }) {
  const navigate = useNavigate()
  // `?edit=1` opens the edit form directly; afterwards we return to the page the link was on (if any).
  const [params] = useSearchParams()
  const returnTo = (useLocation().state as { from?: string } | null)?.from
  const editParam = params.get('edit')
  // `?edit=skills` (from the readiness card) shows only what affects readiness: skills, past projects, hours.
  const skillsOnly = editParam === 'skills'
  const [step, setStep] = useState<Step>(!profile ? 'about' : editParam ? 'edit' : 'result')
  // True while re-testing skills that were changed in Edit profile (as opposed to first-time setup).
  const [retesting, setRetesting] = useState(false)
  const { register, handleSubmit, watch, setValue, trigger, reset, formState: { errors, isSubmitting }, setError } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    // Like the other forms: no errors just for leaving a field. Steps validate on "Next" via trigger(),
    // so fields already showing an error are re-checked as the student types (see `recheck`).
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: formValues(profile),
  })
  const editing = step === 'edit'
  useEffect(() => { window.scrollTo({ top: 0 }) }, [step])
  // The navbar's "Edit profile" can be clicked while already on this page, which doesn't remount it.
  useEffect(() => { if (editParam && profile) setStep('edit') }, [editParam]) // eslint-disable-line react-hooks/exhaustive-deps
  const skills = watch('skills')
  const priorProjects = watch('priorProjects')

  const setSkills = (next: ProfileForm['skills']) => setValue('skills', next, { shouldValidate: Boolean(errors.skills), shouldDirty: true })
  const recheck = (field: 'name' | 'course' | 'year' | 'weeklyHours') => ({ onChange: () => { if (errors[field]) trigger(field) } })
  const toggleSkill = (skill: string) => setSkills(skills.some(s => s.skill === skill) ? skills.filter(s => s.skill !== skill) : [...skills, { skill, level: 1 }])
  const setLevel = (skill: string, level: Proficiency) => setSkills(skills.map(s => s.skill === skill ? { ...s, level } : s))

  const goToSkills = async () => { if (await trigger(['name', 'course', 'year'])) setStep('skills') }
  const goToQuiz = async () => { if (await trigger(['skills', 'priorProjects', 'weeklyHours'])) setStep('quiz') }
  const finishEdit = () => {
    setRetesting(false)
    if (returnTo && returnTo !== '/onboarding') { navigate(returnTo); return }
    setStep('result')
    if (editParam) navigate('/onboarding', { replace: true })
  }
  const cancelEdit = () => { reset(formValues(profile)); finishEdit() }
  /** Skills added in Edit profile, or whose self-rating changed: only these need re-testing. */
  const changedSkills = profile ? skills.filter(s => {
    const saved = profile.skills.find(o => o.skill === s.skill)
    return !saved || (saved.selfLevel ?? saved.level) !== s.level
  }).map(s => s.skill) : []
  // Quiz the skills the student rated highest first: that's where an over-estimate would hurt the plan most.
  const quizSkills = [...skills].filter(s => !retesting || changedSkills.includes(s.skill)).sort((a, b) => b.level - a.level).map(s => s.skill)
  // A changed skill's old quiz result no longer matches its rating, so it isn't carried over.
  const previousQuiz = (skill: string) => changedSkills.includes(skill) ? undefined : profile?.skills.find(s => s.skill === skill)?.quiz

  /** Edit profile save: quiz only the changed skills, or save straight away if none changed. */
  const saveEdit = async () => {
    if (!changedSkills.length) { save({}); return }
    if (await trigger()) { setRetesting(true); setStep('quiz') }
  }

  /** Saves the profile; skills not covered by this quiz keep any earlier quiz result. */
  const save = (quiz: QuizResults) => handleSubmit(async data => {
    try {
      const saved = await api.saveProfile({
        name: data.name,
        course: data.course,
        year: data.year,
        skills: data.skills.map(s => rating(s.skill, s.level, quiz[s.skill] ?? previousQuiz(s.skill))),
        priorProjects: data.priorProjects,
        weeklyHours: data.weeklyHours,
      })
      onSaved(saved)
      if (editing || retesting) finishEdit()
      else setStep('result')
    } catch (e) {
      setError('root', { message: errorMessage(e) })
    }
  })()

  const intro = {
    about: { title: 'Your details', text: 'Tell us a little about yourself. Setup takes about five minutes.' },
    skills: { title: 'Your skills', text: "Pick the skills you've used and rate each one honestly. A short quiz checks them next." },
    quiz: retesting
      ? { title: 'Check your updated skills', text: `A few quick questions on the skill${changedSkills.length === 1 ? '' : 's'} you changed. Your other quiz results are kept.` }
      : { title: 'Skill quiz', text: "A few quick questions verify your ratings. It's a check-up, not an exam." },
    result: { title: 'Your skill check', text: 'The agents use this to tailor their analysis of your project idea.' },
    edit: skillsOnly
      ? { title: 'Update your skills', text: 'Change your skills, past projects or weekly hours to update your readiness score.' }
      : { title: 'Edit profile', text: 'Update your details and skills, then save. Your quiz results are kept.' },
  }[step]

  return (
    <>
      {step === 'skills' && <button type="button" className="back-link" onClick={() => setStep('about')}><ArrowLeft size={15} /> Back to your details</button>}
      {step === 'quiz' && (retesting
        ? <button type="button" className="back-link" onClick={() => { setRetesting(false); setStep('edit') }}><ArrowLeft size={15} /> Back to editing</button>
        : <button type="button" className="back-link" onClick={() => setStep('skills')}><ArrowLeft size={15} /> Back to your skills</button>)}
      {editing && <button type="button" className="back-link" onClick={cancelEdit}><ArrowLeft size={15} /> {returnTo && returnTo !== '/onboarding' ? 'Back' : 'Back to your results'}</button>}
      <div className="form-shell onboarding-shell">
        <div className="form-intro">
          <span className="muted-label">YOUR PROJECT PROFILE</span>
          <h1>{intro.title}</h1>
          <p>{intro.text}</p>
          {!editing && <FlowSteps current={step === 'about' ? 0 : step === 'result' ? 2 : 1} />}
        </div>

        {step === 'result' && profile ? <AssessmentResult profile={profile} onEdit={() => setStep('edit')} onNext={() => navigate('/create')} />
          : step === 'quiz' ? <SkillQuiz skills={quizSkills} onComplete={results => save(results)} saving={isSubmitting} error={errors.root?.message} />
          : (
          <form className="form-card" onSubmit={e => { e.preventDefault(); if (editing) saveEdit(); else if (step === 'about') goToSkills(); else goToQuiz() }} noValidate>
            {(step === 'about' || (editing && !skillsOnly)) && <>
              <label>What should we call you? <span className="required-mark" aria-hidden="true">*</span>
                <input {...register('name', recheck('name'))} placeholder="Your name" autoComplete="given-name" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-error' : undefined} autoFocus />
                {errors.name && <span className="field-error" id="name-error"><CircleAlert size={13} /> {errors.name.message}</span>}
              </label>
              <label>Course / branch <span className="required-mark" aria-hidden="true">*</span>
                <input {...register('course', recheck('course'))} placeholder="e.g. B.Tech · AI & Data Science" aria-invalid={!!errors.course} aria-describedby={errors.course ? 'course-error' : undefined} />
                {errors.course && <span className="field-error" id="course-error"><CircleAlert size={13} /> {errors.course.message}</span>}
              </label>
              <label>Current year <span className="required-mark" aria-hidden="true">*</span>
                <select {...register('year', recheck('year'))} aria-invalid={!!errors.year} aria-describedby={errors.year ? 'year-error' : undefined}><option value="" disabled>Select your year</option>{YEARS.map(y => <option key={y}>{y}</option>)}</select>
                {errors.year && <span className="field-error" id="year-error"><CircleAlert size={13} /> {errors.year.message}</span>}
              </label>
              {!editing && <button className="button button-primary form-submit" type="button" onClick={goToSkills}>Next: skill check <ArrowRight size={16} /></button>}
            </>}

            {(step === 'skills' || editing) && <>
              <div className="field-label" id="skills-label">Which skills have you used? <span className="required-mark" aria-hidden="true">*</span></div>
              <p className="field-hint" id="skills-hint">Choose all that apply{skills.length > 0 && ` · ${skills.length} selected`}, then rate each one below.</p>
              <div className="skill-options" role="group" aria-labelledby="skills-label" aria-describedby="skills-hint">
                {SKILL_CATALOG.map(({ skill }) => { const on = skills.some(s => s.skill === skill); return <button type="button" key={skill} aria-pressed={on} className={on ? 'skill-option selected' : 'skill-option'} onClick={() => toggleSkill(skill)}>{on && <Check size={13} />} {skill}</button> })}
              </div>
              {errors.skills && <p className="field-error standalone"><CircleAlert size={13} /> {errors.skills.message ?? errors.skills.root?.message}</p>}

              {skills.length > 0 && <div className="rating-list">
                <div className="rating-key">{([1, 2, 3] as Proficiency[]).map(l => <span key={l}><strong>{PROFICIENCY_LABELS[l]}</strong> — {PROFICIENCY_HINTS[l]}</span>)}</div>
                {skills.map(s => (
                  <fieldset className="rating-row" key={s.skill}>
                    <legend>{s.skill}</legend>
                    <div className="segmented">
                      {([1, 2, 3] as Proficiency[]).map(l => <label key={l} className={s.level === l ? 'on' : undefined} title={PROFICIENCY_HINTS[l]}><input type="radio" name={`level-${s.skill}`} checked={s.level === l} onChange={() => setLevel(s.skill, l)} />{PROFICIENCY_LABELS[l]}</label>)}
                    </div>
                  </fieldset>
                ))}
              </div>}

              <fieldset className="choice-group">
                <legend className="field-label">Have you built a project outside class before?</legend>
                <div className="segmented wide">
                  {(Object.keys(EXPERIENCE_LABELS) as PriorExperience[]).map(v => <label key={v} className={priorProjects === v ? 'on' : undefined}><input type="radio" value={v} {...register('priorProjects')} />{EXPERIENCE_LABELS[v]}</label>)}
                </div>
              </fieldset>

              <label>Hours per week for the project
                <span className="input-suffix"><input type="number" min={1} max={40} inputMode="numeric" {...register('weeklyHours', { valueAsNumber: true, ...recheck('weeklyHours') })} aria-invalid={!!errors.weeklyHours} /><span>hrs</span></span>
                {errors.weeklyHours && <span className="field-error"><CircleAlert size={13} /> {errors.weeklyHours.message}</span>}
              </label>

              {!editing && <button className="button button-primary form-submit" type="submit">Next: quick skill quiz <ArrowRight size={16} /></button>}
            </>}

            {editing && <>
              {errors.root && <p className="form-error" role="alert"><CircleAlert size={15} /> {errors.root.message}</p>}
              <div className="summary-actions">
                <button type="button" className="button button-ghost" onClick={cancelEdit} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="button button-primary" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : changedSkills.length ? <>Save & check skills <ArrowRight size={16} /></> : <><Check size={16} /> Save changes</>}</button>
              </div>
              <p className="submit-hint" aria-live="polite">{changedSkills.length
                ? `You changed ${changedSkills.join(', ')} — a quick quiz will check ${changedSkills.length === 1 ? 'it' : 'them'} before saving.`
                : 'No skill changes, so no quiz is needed.'}</p>
            </>}
          </form>
        )}
      </div>
    </>
  )
}

function AssessmentResult({ profile, onEdit, onNext }: { profile: StudentProfile; onEdit: () => void; onNext: () => void }) {
  const { assessment } = profile
  const verified = profile.skills.filter(s => s.quiz).length
  return (
    <div className="form-card" role="status" aria-live="polite">
      <div className="assessment-head">
        <ScoreRing score={assessment.score} size="lg" label="Readiness score" />
        <div>
          <span className="muted-label">READINESS SCORE</span>
          <h2>{LEVEL_LABELS[assessment.level]}</h2>
          <p>Nice to meet you, {profile.name}! {profile.skills.length} skill{profile.skills.length === 1 ? '' : 's'} · {profile.weeklyHours}h/week</p>
        </div>
      </div>
      <div className="assessment-block">
        <span className="muted-label"><ClipboardCheck size={13} /> SKILL LEVELS · {verified} OF {profile.skills.length} VERIFIED BY QUIZ</span>
        <ul className="skill-results">
          {profile.skills.map(s => (
            <li key={s.skill}>
              <span className="skill-results-name">{s.skill}</span>
              <span className={`level-pill l${s.level}`}>{PROFICIENCY_LABELS[s.level]}</span>
              <span className="skill-results-source">
                {s.quiz
                  ? <><Check size={12} /> Quiz {s.quiz.correct}/{s.quiz.total}{s.quiz.level !== (s.selfLevel ?? s.level) && <> · you said {PROFICIENCY_LABELS[s.selfLevel].toLowerCase()}</>}</>
                  : 'Self-rated'}
              </span>
            </li>
          ))}
        </ul>
        {verified < profile.skills.length && <p className="field-hint">Self-rated skills count at the level you chose.</p>}
      </div>
      {assessment.strengths.length > 0 && <div className="assessment-block"><span className="muted-label"><Sparkles size={13} /> YOUR STRENGTHS</span><div className="tag-list">{assessment.strengths.map(s => <span className="tag" key={s}>{s}</span>)}</div></div>}
      {assessment.growthAreas.length > 0 && <div className="assessment-block"><span className="muted-label"><TrendingUp size={13} /> WORTH GROWING</span><ul className="plain-list">{assessment.growthAreas.map(g => <li key={g}>{g}</li>)}</ul></div>}
      <div className="summary-actions">
        <button type="button" className="button button-ghost" onClick={onEdit}><Pencil size={15} /> Edit profile</button>
        <button type="button" className="button button-primary" onClick={onNext}>Next: share your idea <ArrowRight size={16} /></button>
      </div>
    </div>
  )
}
