import { useEffect, useRef, useState } from 'react'
import { CircleAlert, Mic, Square } from 'lucide-react'
import { load, save } from '../lib/storage'

/**
 * Microphone button for a text box: speech-to-text with the browser's built-in Web Speech API
 * (Chrome, Edge, Safari) in English or an Indian language. Each finished phrase is passed to
 * `onText` so the page can append it to its field. No backend or AI involved.
 */

// Minimal typings: the Web Speech API is not in TypeScript's standard DOM types everywhere.
interface RecognitionResult { isFinal: boolean; 0: { transcript: string } }
interface RecognitionEvent { resultIndex: number; results: ArrayLike<RecognitionResult> }
interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  onaudiostart: (() => void) | null
  start(): void; stop(): void; abort(): void
}
type RecognitionCtor = new () => Recognition
const SpeechRecognitionApi: RecognitionCtor | undefined =
  typeof window === 'undefined' ? undefined : (window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }).SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition

/** Speaking languages offered (all supported by Chrome/Edge voice typing). Text appears in that script. */
const LANGUAGES = [
  { code: 'en-IN', label: 'English' },
  { code: 'ta-IN', label: 'தமிழ் (Tamil)' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)' },
  { code: 'te-IN', label: 'తెలుగు (Telugu)' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ml-IN', label: 'മലയാളം (Malayalam)' },
  { code: 'mr-IN', label: 'मराठी (Marathi)' },
  { code: 'bn-IN', label: 'বাংলা (Bengali)' },
  { code: 'gu-IN', label: 'ગુજરાતી (Gujarati)' },
]
const LANG_KEY = 'voice-language'

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.',
  'service-not-allowed': 'Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.',
  'no-speech': "We didn't hear anything. Check your microphone and try again.",
  'audio-capture': 'No microphone was found. Plug one in and try again.',
  network: "Voice typing couldn't reach the speech service. It needs internet, and works in Chrome or Edge (not Brave or Firefox).",
  'language-not-supported': "Your browser can't do voice typing in this language yet. Try English, or type your idea.",
}

export function VoiceInput({ onText }: { onText: (phrase: string) => void }) {
  const [listening, setListening] = useState(false)
  const [waitingForMic, setWaitingForMic] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lang, setLang] = useState(() => load<string>(LANG_KEY, 'en-IN'))
  const recognitionRef = useRef<Recognition | null>(null)

  useEffect(() => () => recognitionRef.current?.abort(), [])

  if (!SpeechRecognitionApi) return <span className="voice-note">Voice typing works in Chrome or Edge.</span>

  const start = () => {
    setError(null)
    if (!window.isSecureContext) { setError('Voice typing only works on http://localhost or an https:// address.'); return }
    const recognition = new SpeechRecognitionApi()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = e => {
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) { const phrase = r[0].transcript.trim(); if (phrase) onText(phrase) }
        else live += r[0].transcript
      }
      setInterim(live)
    }
    recognition.onaudiostart = () => setWaitingForMic(false)
    recognition.onerror = e => { if (e.error !== 'aborted') setError(ERRORS[e.error] ?? `Voice typing stopped (${e.error}). Please try again.`) }
    recognition.onend = () => { setListening(false); setWaitingForMic(false); setInterim('') }
    recognitionRef.current = recognition
    try {
      recognition.start()
      setListening(true)
      setWaitingForMic(true)
    } catch {
      setError('Voice typing could not start. Close other tabs using the microphone and try again.')
    }
  }

  return (
    <div className="voice-input">
      <div className="voice-row">
        <select className="voice-select" value={lang} onChange={e => { setLang(e.target.value); save(LANG_KEY, e.target.value) }} disabled={listening} aria-label="Speaking language">
          {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
        {listening
          ? <button type="button" className="voice-btn stop" onClick={() => recognitionRef.current?.stop()}><Square size={13} /> Stop</button>
          : <button type="button" className="voice-btn" onClick={start}><Mic size={15} /> Speak</button>}
      </div>
      {(listening || error) && (
        <p className={error ? 'voice-status error' : 'voice-status'} role={error ? 'alert' : undefined} aria-live="polite">
          {error ? <><CircleAlert size={13} /> {error}</>
            : <>{<span className="voice-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>} {waitingForMic ? 'If your browser asks, click "Allow" for the microphone…' : interim ? <em>{interim}</em> : 'Listening… speak now'}</>}
        </p>
      )}
    </div>
  )
}
