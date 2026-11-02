import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, CircleAlert, ClipboardCheck, X } from 'lucide-react'
import { MAX_QUIZ_SKILLS, buildQuiz } from '../lib/questionBank'
import { quizLevel } from '../lib/skills'
import type { SkillQuizResult } from '../types/models'

export type QuizResults = Record<string, SkillQuizResult>

interface Props {
  /** Skills to test, most important first; only the first MAX_QUIZ_SKILLS are quizzed. */
  skills: string[]
  onComplete: (results: QuizResults) => void
  saving: boolean
  error?: string
}

export function SkillQuiz({ skills, onComplete, saving, error }: Props) {
  const [questions] = useState(() => buildQuiz(skills)) // built once so options don't reshuffle mid-quiz
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const [correctIds, setCorrectIds] = useState<string[]>([])
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => { if (started) headingRef.current?.focus() }, [started, index])

  const question = questions[index]
  const isLast = index === questions.length - 1
  const minutes = Math.max(1, Math.round(questions.length * .35))
  const quizzedSkills = skills.slice(0, MAX_QUIZ_SKILLS)

  const check = () => {
    if (selected === null) return
    setChecked(true)
    if (selected === question.answer) setCorrectIds(ids => [...ids, question.id])
  }

  const next = () => {
    if (!isLast) { setIndex(i => i + 1); setSelected(null); setChecked(false); return }
    const takenAt = new Date().toISOString()
    const results: QuizResults = {}
    for (const skill of quizzedSkills) {
      const asked = questions.filter(q => q.skill === skill)
      const right = asked.filter(q => correctIds.includes(q.id))
      results[skill] = { correct: right.length, total: asked.length, level: quizLevel(right.map(q => q.difficulty)), takenAt }
    }
    onComplete(results)
  }

  if (!started) return (
    <div className="form-card quiz-intro">
      <span className="quiz-badge"><ClipboardCheck size={18} /></span>
      <h2>Quick skill quiz</h2>
      <p><strong>{questions.length} questions · about {minutes} minute{minutes === 1 ? '' : 's'}.</strong> Three short questions per skill, from easy to hard. This checks your self-ratings so the agents plan around what you can really do.</p>
      <div className="tag-list">{quizzedSkills.map(s => <span className="tag neutral" key={s}>{s}</span>)}</div>
      {skills.length > MAX_QUIZ_SKILLS && <p className="field-hint">We'll test your top {MAX_QUIZ_SKILLS} skills. The rest keep your self-rating.</p>}
      <ul className="plain-list quiz-rules"><li>No time limit, and you'll see the answer after each question.</li><li>It isn't graded — it only helps the agents plan at the right level.</li></ul>
      {error && <p className="form-error" role="alert"><CircleAlert size={15} /> {error}</p>}
      <button type="button" className="button button-primary form-submit" onClick={() => setStarted(true)} disabled={saving}>Start quiz <ArrowRight size={16} /></button>
    </div>
  )

  const correct = checked && selected === question.answer
  return (
    <div className="form-card quiz-card">
      <div className="quiz-progress">
        <span>Question {index + 1} of {questions.length}</span>
        <span className="tag neutral">{question.skill}</span>
      </div>
      <div className="progress-track" role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={index + (checked ? 1 : 0)}><span style={{ width: `${((index + (checked ? 1 : 0)) / questions.length) * 100}%` }} /></div>

      <h2 className="quiz-question" ref={headingRef} tabIndex={-1} id="quiz-question">{question.prompt}</h2>
      {question.code && <pre className="quiz-code"><code>{question.code}</code></pre>}

      <div className="quiz-options" role="radiogroup" aria-labelledby="quiz-question">
        {question.options.map((option, i) => {
          const state = !checked ? (selected === i ? 'selected' : '') : i === question.answer ? 'right' : selected === i ? 'wrong' : 'dim'
          return (
            <label key={option} className={`quiz-option ${state}`}>
              <input type="radio" name={question.id} checked={selected === i} disabled={checked} onChange={() => setSelected(i)} />
              <span className="quiz-letter" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
              <span className="quiz-text">{option}</span>
              {checked && i === question.answer && <Check size={16} aria-label="Correct answer" />}
              {checked && selected === i && i !== question.answer && <X size={16} aria-label="Your answer" />}
            </label>
          )
        })}
      </div>

      <div aria-live="polite">
        {checked && <div className={`quiz-feedback ${correct ? 'right' : 'wrong'}`}><strong>{correct ? 'Correct!' : 'Not quite.'}</strong> {question.explanation}</div>}
      </div>
      {error && <p className="form-error" role="alert"><CircleAlert size={15} /> {error}</p>}

      {!checked
        ? <button type="button" className="button button-primary form-submit" onClick={check} disabled={selected === null}>Check answer</button>
        : <button type="button" className="button button-primary form-submit" onClick={next} disabled={saving}>{isLast ? (saving ? 'Saving your results…' : 'See my results') : 'Next question'} <ArrowRight size={16} /></button>}
    </div>
  )
}
