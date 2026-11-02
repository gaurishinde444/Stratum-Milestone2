import type { CSSProperties } from 'react'
import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Brand() {
  return <Link to="/" className="brand" aria-label="Stratum Academic Project Mentor home">
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 56 52" role="img">
        <defs>
          <linearGradient id="stratumTop" x1=".12" y1=".1" x2=".9" y2=".9"><stop stopColor="#55D9FF"/><stop offset=".52" stopColor="#688BFF"/><stop offset="1" stopColor="#A66BFF"/></linearGradient>
          <linearGradient id="stratumSide" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#4ED5F6"/><stop offset=".55" stopColor="#238EE5"/><stop offset="1" stopColor="#0755C9"/></linearGradient>
          <linearGradient id="stratumLower" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#B18AFF"/><stop offset="1" stopColor="#5336C9"/></linearGradient>
        </defs>
        <path d="m10 19 19-12q4-3 8 0l15 9q4 3 0 6L38 31l-9-5 11-7-10-6-13 8q-3 2-7-2Z" fill="url(#stratumTop)"/>
        <path d="m10 19 18 10 12-8 12 7q4 2 0 5L31 44q-4 3-8 0L7 35q-4-2 0-5l13-8-10-3Z" fill="url(#stratumSide)"/>
        <path d="m7 30 18 10q4 2 8 0l8-5 11 6-20 10q-4 2-8 0L7 42q-4-2 0-5l7-4-7-3Z" fill="url(#stratumLower)"/>
        <path d="m30 9 8-5 11 6-8 5Z" fill="#D5CBFF" opacity=".92"/>
        <path d="m40 9 1.7 4.3L46 15l-4.3 1.7L40 21l-1.7-4.3L34 15l4.3-1.7L40 9Z" fill="#fff"/>
      </svg>
    </span>
    <span className="brand-text"><span className="brand-word"><strong>Stratum</strong><svg viewBox="0 0 100 25" aria-hidden="true"><path d="M2 23 C34 2 66 1 86 7" fill="none" stroke="url(#brandArc)" strokeWidth="1.6"/><path d="M91 1 93.3 7.2 100 9.5 93.3 11.8 91 18 88.7 11.8 82 9.5 88.7 7.2Z" fill="#8B72FF"/><defs><linearGradient id="brandArc"><stop stopColor="#42CFFF"/><stop offset="1" stopColor="#7255FF"/></linearGradient></defs></svg></span><small>ACADEMIC PROJECT MENTOR</small></span>
  </Link>
}

const FLOW = ['Your profile', 'Skill check', 'Your idea']

/** Progress through the setup flow: 0 = profile, 1 = skills, 2 = idea. */
export function FlowSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="flow-steps" aria-label="Setup progress">
      {FLOW.map((label, i) => (
        <li key={label} className={i < current ? 'done' : i === current ? 'active' : undefined} aria-current={i === current ? 'step' : undefined}>
          <span className="flow-dot">{i < current ? <Check size={12} aria-label="Done" /> : `0${i + 1}`}</span>
          <span className="flow-label">{label}</span>
        </li>
      ))}
    </ol>
  )
}

export function ScoreRing({ score, size = 'md', label }: { score: number; size?: 'md' | 'lg'; label: string }) {
  return (
    <div className={`ring ring-${size}`} style={{ '--p': `${score}%` } as CSSProperties} role="img" aria-label={`${label}: ${score} out of 100`}>
      <span>{score}</span>
    </div>
  )
}

export const errorMessage = (e: unknown) => e instanceof Error ? e.message : 'Something went wrong. Please try again.'
