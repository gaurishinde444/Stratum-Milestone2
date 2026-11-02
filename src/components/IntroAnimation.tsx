import { useCallback, useEffect, useRef, useState } from 'react'
import { Orbit } from 'lucide-react'
import './IntroAnimation.css'

/** Matches the loading bar in IntroAnimation.css (0.9s delay + 2.9s fill). */
const INTRO_MS = 3900
const REDUCED_MOTION_MS = 800
const FADE_OUT_MS = 400

/** Full-screen splash shown once per visit. Click, Skip or Escape ends it early. */
export default function IntroAnimation({ onComplete }: { onComplete: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const done = useRef(false)

  const finish = useCallback(() => {
    if (done.current) return
    done.current = true
    setLeaving(true)
    setTimeout(onComplete, FADE_OUT_MS)
  }, [onComplete])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = setTimeout(finish, reduced ? REDUCED_MOTION_MS : INTRO_MS)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish() }
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(timer); window.removeEventListener('keydown', onKey) }
  }, [finish])

  return (
    <div className={leaving ? 'intro leaving' : 'intro'} role="dialog" aria-modal="true" aria-label="ProjectMentor AI is loading" onClick={finish}>
      <div className="intro-grid" />
      <div className="intro-ambient intro-ambient-left" />
      <div className="intro-ambient intro-ambient-right" />
      <div className="intro-smoke intro-smoke-left"><span /><span /><span /><span /></div>
      <div className="intro-smoke intro-smoke-right"><span /><span /><span /><span /></div>

      <div className="intro-content">
        <div className="intro-brand-mark"><Orbit className="intro-brand-symbol" size={28} /></div>
        <p className="intro-eyebrow">AI ACADEMIC PROJECT MENTOR</p>
        <h1 className="intro-title">
          <span>From idea</span>
          <span className="intro-title-accent">to impact</span>
        </h1>
        <p className="intro-subtitle">AI agents that check your project's feasibility, scope, timeline and risks.</p>
        <div className="intro-loading-line"><span /></div>
        <p className="intro-loading-text">PREPARING YOUR WORKSPACE</p>
      </div>

      <button type="button" className="intro-skip" onClick={finish} autoFocus>Skip</button>
      <div className="intro-footer"><span>PROJECTMENTOR.AI</span><span>FROM IDEA TO IMPACT</span></div>
    </div>
  )
}
