import { useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, CircleAlert, CircleCheck, Eye, EyeOff, Info, LoaderCircle, LockKeyhole, Mail, Orbit, UserRound, type LucideIcon } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { AnimatedBackground } from '../components/AnimatedBackground'
import { Brand, errorMessage } from '../components/ui'
import { ApiError, api, isDemoMode } from '../services/api'
import { auth } from '../services/auth'

/** Router state passed between auth pages: where to return to, a prefilled email, a success notice. */
type FromState = { from?: string; email?: string; notice?: string } | null

/** Where to go after signing in: onboarding until a profile exists, then the page they were sent away from. */
const nextPath = (from?: string) => !api.getProfile() ? '/onboarding' : from && from !== '/sign-in' && from !== '/register' ? from : '/'

const newPassword = z.string().min(8, 'Use at least 8 characters.').regex(/[A-Za-z]/, 'Include at least one letter.').regex(/\d/, 'Include at least one number.')

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name (at least 2 characters).').max(50, 'Please keep your name under 50 characters.'),
  email: z.email('Enter a valid email address, like name@college.edu.'),
  password: newPassword,
  confirm: z.string().min(1, 'Please re-enter your password.'),
}).refine(d => d.password === d.confirm, { path: ['confirm'], message: "Passwords don't match." })

const forgotSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: newPassword,
  confirm: z.string().min(1, 'Please re-enter your new password.'),
}).refine(d => d.password === d.confirm, { path: ['confirm'], message: "Passwords don't match." })

const signInSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

export function SignIn() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const state = useLocation().state as FromState
  const from = state?.from
  const { register, handleSubmit, setError, watch, formState: { errors, isSubmitting } } = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema), mode: 'onSubmit', reValidateMode: 'onChange', defaultValues: { email: state?.email ?? '', password: '' },
  })

  if (user) return <Navigate to={nextPath(from)} replace />

  const submit = handleSubmit(async data => {
    try {
      await signIn(data)
      navigate(nextPath(from), { replace: true })
    } catch (e) {
      setError('root', { message: errorMessage(e) })
    }
  })

  return (
    <AuthCard
      title="Welcome back"
      text={from ? 'Sign in to continue to that page.' : 'Sign in to continue to your projects.'}
      footer={<>New to Stratum? <Link to="/register" state={{ from }}>Create an account</Link></>}
    >
      <form onSubmit={submit} noValidate>
        {state?.notice && !errors.root && <p className="form-success" role="status"><CircleCheck size={15} /> {state.notice}</p>}
        {errors.root && <p className="form-error" role="alert"><CircleAlert size={15} /> {errors.root.message}</p>}
        <Field label="Email" icon={Mail} error={errors.email?.message} input={register('email')} type="email" placeholder="name@college.edu" autoComplete="email" inputMode="email" autoFocus={!state?.email} />
        <PasswordField
          label="Password" error={errors.password?.message} input={register('password')} autoComplete="current-password" autoFocus={Boolean(state?.email)}
          aside={<Link className="field-link" to="/forgot-password" state={{ from, email: watch('email') }}>Forgot password?</Link>}
        />
        <SubmitButton busy={isSubmitting} busyLabel="Signing in…">Sign in</SubmitButton>
      </form>
    </AuthCard>
  )
}

export function Register() {
  const { user, register: createAccount } = useAuth()
  const navigate = useNavigate()
  const from = (useLocation().state as FromState)?.from
  const { register, handleSubmit, watch, setError, formState: { errors, isSubmitting } } = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema), mode: 'onSubmit', reValidateMode: 'onChange', defaultValues: { name: '', email: '', password: '', confirm: '' },
  })
  const password = watch('password')
  const confirm = watch('confirm')
  const matches = confirm.length > 0 && confirm === password && !errors.confirm

  if (user) return <Navigate to={nextPath(from)} replace />

  const submit = handleSubmit(async data => {
    try {
      await createAccount({ name: data.name, email: data.email, password: data.password })
      navigate(nextPath(from), { replace: true })
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setError('email', { message: 'An account with this email already exists. Try signing in instead.' })
      else setError('root', { message: errorMessage(e) })
    }
  })

  return (
    <AuthCard
      wide
      title="Create your account"
      text="Create your student workspace and start planning with confidence."
      footer={<>Already have an account? <Link to="/sign-in" state={{ from }}>Sign in</Link></>}
    >
      <form onSubmit={submit} noValidate>
        {errors.root && <p className="form-error" role="alert"><CircleAlert size={15} /> {errors.root.message}</p>}
        {/* Two fields per row on wider screens so the whole form fits without scrolling. */}
        <div className="field-grid">
          <Field label="Full name" icon={UserRound} error={errors.name?.message} input={register('name')} placeholder="e.g. Asha Kumar" autoComplete="name" autoFocus />
          <Field label="Email" icon={Mail} error={errors.email?.message} input={register('email')} type="email" placeholder="name@college.edu" autoComplete="email" inputMode="email" />
          <div>
            <PasswordField label="Password" error={errors.password?.message} input={register('password')} autoComplete="new-password" describedBy="password-rules" />
            <PasswordStrength password={password} />
          </div>
          <PasswordField label="Confirm password" error={errors.confirm?.message} input={register('confirm')} autoComplete="new-password" success={matches ? 'Passwords match' : undefined} />
        </div>
        <SubmitButton busy={isSubmitting} busyLabel="Creating your account…">Create account</SubmitButton>
        {isDemoMode && <p className="auth-note"><Info size={14} /> Demo mode: accounts stay in this browser — don't reuse a real password.</p>}
      </form>
    </AuthCard>
  )
}

export function ForgotPassword() {
  const navigate = useNavigate()
  const state = useLocation().state as FromState
  const { register, handleSubmit, watch, setError, formState: { errors, isSubmitting } } = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema), mode: 'onSubmit', reValidateMode: 'onChange', defaultValues: { email: state?.email ?? '', password: '', confirm: '' },
  })
  const password = watch('password')
  const confirm = watch('confirm')
  const matches = confirm.length > 0 && confirm === password && !errors.confirm

  const submit = handleSubmit(async ({ email, password }) => {
    try {
      await auth.resetPasswordByEmail(email, password)
      navigate('/sign-in', { replace: true, state: { from: state?.from, email: email.trim(), notice: 'Password updated. Sign in with your new password.' } })
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setError('email', { message: 'No account found with this email. Check the spelling or create an account.' })
      else setError('root', { message: errorMessage(e) })
    }
  })

  return (
    <AuthCard
      icon={LockKeyhole}
      title="Reset your password"
      text="Enter the email you signed up with and choose a new password."
      footer={<Link to="/sign-in" state={{ from: state?.from }}><ArrowLeft size={14} /> Back to sign in</Link>}
    >
      <form onSubmit={submit} noValidate>
        {errors.root && <p className="form-error" role="alert"><CircleAlert size={15} /> {errors.root.message}</p>}
        <Field label="Email" icon={Mail} error={errors.email?.message} input={register('email')} type="email" placeholder="name@college.edu" autoComplete="email" inputMode="email" autoFocus={!state?.email} />
        <PasswordField label="New password" error={errors.password?.message} input={register('password')} autoComplete="new-password" describedBy="password-rules" autoFocus={Boolean(state?.email)} />
        <PasswordStrength password={password} />
        <PasswordField label="Confirm new password" error={errors.confirm?.message} input={register('confirm')} autoComplete="new-password" success={matches ? 'Passwords match' : undefined} />
        <SubmitButton busy={isSubmitting} busyLabel="Updating…">Update password</SubmitButton>
      </form>
    </AuthCard>
  )
}

/** 3-step strength bar plus the rules it is based on (same rules as the schema). */
function PasswordStrength({ password }: { password: string }) {
  const rules = [
    { ok: password.length >= 8, label: '8+ characters' },
    { ok: /[A-Za-z]/.test(password), label: 'A letter' },
    { ok: /\d/.test(password), label: 'A number' },
  ]
  const strength = rules.filter(r => r.ok).length
  return (
    <div className="password-meter" id="password-rules">
      <div className={`strength s${strength}`} aria-hidden="true"><span /><span /><span /></div>
      <ul aria-label="Password requirements">{rules.map(r => <li key={r.label} className={r.ok ? 'ok' : undefined}>{r.ok ? <Check size={12} /> : <span className="rule-dot" />} {r.label}</li>)}</ul>
    </div>
  )
}


function AuthCard({ icon: Icon = Orbit, wide = false, title, text, footer, children }: { icon?: LucideIcon; wide?: boolean; title: string; text: string; footer: ReactNode; children: ReactNode }) {
  return (
    <div className="auth-scene">
      <AnimatedBackground />
      <div className={wide ? 'auth-wrap wide' : 'auth-wrap'}>
        <div className="auth-card">
          <div className="auth-brand"><Brand /></div>
          <div className="auth-head">
            <span className="auth-mark" aria-hidden="true"><Icon size={22} /></span>
            <h1>{title}</h1>
            <p>{text}</p>
          </div>
          {children}
        </div>
        <p className="auth-footer">{footer}</p>
      </div>
    </div>
  )
}

function SubmitButton({ busy, busyLabel, children }: { busy: boolean; busyLabel: string; children: ReactNode }) {
  return (
    <button className="button button-primary form-submit" type="submit" disabled={busy} aria-busy={busy}>
      {busy ? <><LoaderCircle size={16} className="spin" /> {busyLabel}</> : children}
    </button>
  )
}

type FieldProps = { label: string; icon: LucideIcon; error?: string; input: UseFormRegisterReturn } & Omit<InputHTMLAttributes<HTMLInputElement>, 'name'>

function Field({ label, icon: Icon, error, input, ...rest }: FieldProps) {
  const errorId = `${input.name}-error`
  return (
    <label className="auth-field">{label}
      <span className="input-wrap">
        <Icon size={17} className="input-icon" aria-hidden="true" />
        <input {...input} {...rest} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} />
      </span>
      {error && <span className="field-error" id={errorId}><CircleAlert size={13} /> {error}</span>}
    </label>
  )
}

function PasswordField({ label, error, success, input, autoComplete, describedBy, aside, autoFocus }: { label: string; error?: string; success?: string; input: UseFormRegisterReturn; autoComplete: string; describedBy?: string; aside?: ReactNode; autoFocus?: boolean }) {
  const [visible, setVisible] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const errorId = `${input.name}-error`
  const capsId = `${input.name}-caps`
  const checkCaps = (e: KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState('CapsLock'))

  return (
    <label className="auth-field"><span className="field-label-row">{label}{aside}</span>
      <span className="input-wrap">
        <LockKeyhole size={17} className="input-icon" aria-hidden="true" />
        <input
          {...input}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          onKeyDown={checkCaps}
          onKeyUp={checkCaps}
          onBlur={e => { setCapsLock(false); input.onBlur(e) }}
          aria-invalid={!!error}
          aria-describedby={[error && errorId, capsLock && capsId, describedBy].filter(Boolean).join(' ') || undefined}
        />
        <button type="button" className="input-action" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
      </span>
      {capsLock && <span className="field-warning" id={capsId}><CircleAlert size={13} /> Caps Lock is on</span>}
      {error ? <span className="field-error" id={errorId}><CircleAlert size={13} /> {error}</span>
        : success && <span className="field-success"><Check size={13} /> {success}</span>}
    </label>
  )
}
