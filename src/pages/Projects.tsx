import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Check, CircleAlert,FolderKanban, LoaderCircle, Trash2, X } from 'lucide-react'
 
import { errorMessage } from '../components/ui'
import { api } from '../services/api'
import { DOMAIN_LABELS } from '../lib/skills'
import type { ProjectIdea } from '../types/models'

export default function Projects() {
  const [projects, setProjects] = useState<ProjectIdea[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  // The idea the student asked to delete; the dialog asks them to confirm first.
  const [toDelete, setToDelete] = useState<ProjectIdea | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let cancelled = false
    api.listProjects().then(p => { if (!cancelled) setProjects(p) }).catch(e => { if (!cancelled) setError(errorMessage(e)) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const askDelete = (project: ProjectIdea) => { setToDelete(project); setDeleteError(null); dialogRef.current?.showModal(); cancelRef.current?.focus() }
  const closeDialog = () => { if (!deleting) dialogRef.current?.close() }
  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await api.deleteProject(toDelete.id)
      setProjects(list => list?.filter(p => p.id !== toDelete.id) ?? null)
      dialogRef.current?.close()
      setToast('Idea deleted.')
    } catch (e) {
      setDeleteError(errorMessage(e))
    } finally {
      setDeleting(false)
    }
  }

  const dialog = (
    <dialog className="score-dialog confirm-dialog" ref={dialogRef} aria-labelledby="delete-title" onClose={() => setToDelete(null)} onCancel={e => { if (deleting) e.preventDefault() }} onClick={e => { if (e.target === e.currentTarget) closeDialog() }}>
      <div className="score-dialog-head">
        <h2 id="delete-title"><Trash2 size={18} /> Delete this idea?</h2>
        <button type="button" className="dialog-close" aria-label="Close" onClick={closeDialog}><X size={18} /></button>
      </div>
      <div className="confirm-body">
        <p>"<strong>{toDelete?.title}</strong>" and its analysis will be removed. You can't undo this.</p>
        {deleteError && <p className="form-error" role="alert"><CircleAlert size={15} /> {deleteError}</p>}
        <div className="confirm-actions">
          <button type="button" className="button button-ghost" onClick={closeDialog} disabled={deleting} ref={cancelRef}>Cancel</button>
          <button type="button" className="button button-danger" onClick={confirmDelete} disabled={deleting}>
            {deleting ? <><LoaderCircle className="spin" size={16} /> Deleting…</> : <><Trash2 size={16} /> Delete</>}
          </button>
        </div>
      </div>
    </dialog>
  )
  const toastEl = toast && <div className="toast" role="status"><Check size={16} /> {toast}</div>

  if (error) return <p className="form-error" role="alert"><CircleAlert size={15} /> {error}</p>
  if (!projects) return <p className="page-loading"><LoaderCircle className="spin" size={18} /> Loading your projects…</p>

  if (!projects.length) return (
    <>
    {dialog}
    {toastEl}
    <div className="empty-state">
      <span className="empty-state-icon"><FolderKanban size={23} /></span>
      <span className="muted-label">YOUR WORKSPACE</span>
      <h1>Your first project starts with an idea.</h1>
      <p>Share a project idea to run a personalized analysis using the demo engine or your configured LLM backend.</p>
      {!api.getProfile() && <Link className="button button-primary" to="/onboarding">Set up my profile <ArrowRight size={16} /></Link>}
    </div>
    </>
  )

  return (
    <>
      <header className="page-header">
        <div><span className="muted-label">YOUR WORKSPACE</span><h1>My projects</h1><p>Ideas you have submitted and their current pipeline availability. Use the New idea button above to start another.</p></div>
      </header>
      <ul className="projects-workspace">
        {projects.map(p => (
            
          <li key={p.id}>
            <Link to={`/projects/${p.id}`} className="project-card">
              <span className="project-card-main">
                <strong>{p.title}</strong>
                <span className="project-card-meta">
                  <span className="project-card-domain">{DOMAIN_LABELS[p.domain]}</span>
                  <span>{p.durationWeeks} weeks</span>
                  <span>Submitted {new Date(p.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </span>
                <span className={`project-card-state ${p.latestRunId ? 'available' : ''}`}>
                  <span aria-hidden="true" /> {p.latestRunId ? 'Pipeline run available' : 'Not yet sent for analysis'}
                </span>
              </span>
              <span className="project-card-arrow" aria-hidden="true"><ArrowUpRight size={17} /></span>
            </Link>
            <button type="button" className="delete-btn" aria-label={`Delete ${p.title}`} title="Delete idea" onClick={() => askDelete(p)}><Trash2 size={17} /></button>
          </li>
        ))}
      </ul>
      {dialog}
      {toastEl}
    </>
  )
}
