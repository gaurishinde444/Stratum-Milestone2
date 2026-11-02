import { useEffect, useState } from 'react'
import { errorMessage } from '../components/ui'
import { api } from '../services/api'
import type { PipelineRun } from '../types/models'

const POLL_MS = 2000

/**
 * Loads a pipeline run and polls while the local provider or configured backend is working.
 */
export function usePipelineRun(runId: string | undefined) {
  const [run, setRun] = useState<PipelineRun | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(runId))

  useEffect(() => {
    setRun(null)
    setError(null)
    if (!runId) { setLoading(false); return }
    setLoading(true)
    let cancelled = false
    let timer: number | undefined

    const poll = async () => {
      try {
        const next = await api.getPipelineRun(runId)
        if (cancelled) return
        setRun(next)
        setLoading(false)
        if (next && (next.status === 'queued' || next.status === 'running')) timer = window.setTimeout(poll, POLL_MS)
      } catch (e) {
        if (cancelled) return
        setError(errorMessage(e))
        setLoading(false)
      }
    }
    poll()
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [runId])

  return { run, error, loading }
}
