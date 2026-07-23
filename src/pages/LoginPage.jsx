import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useTranslation } from '../i18n/I18nContext'
import LanguageSelector from '../components/UI/LanguageSelector'

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const t = useTranslation()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const from = location.state?.from ?? '/'

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register(name, email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm flex justify-end mb-3">
        <LanguageSelector variant="light" />
      </div>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-panel border border-line p-8">
        <img src="/Logo-BGLift.webp" alt="BG Lift" className="h-10 mx-auto mb-6" />
        <h1 className="text-lg font-semibold text-center mb-1">
          {mode === 'login' ? t('login.titleLogin') : t('login.titleRegister')}
        </h1>
        <p className="text-sm text-muted text-center mb-6">
          {t('login.subtitle')}
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === 'register' && (
            <label className="block">
              <span className="text-sm font-medium">{t('login.name')}</span>
              <input
                type="text" required value={name} onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </label>
          )}
          <label className="block">
            <span className="text-sm font-medium">{t('login.email')}</span>
            {/* type="text" in login: consente il bypass di debug admin/admin (la
                validazione email vera resta sul server); in registrazione resta email */}
            <input
              type={mode === 'login' ? 'text' : 'email'} autoComplete="username"
              required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t('login.password')}</span>
            {/* minLength solo in registrazione: in login non deve bloccare il
                bypass di debug admin/admin (5 caratteri) */}
            <input
              type="password" required minLength={mode === 'register' ? 6 : undefined}
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit" disabled={busy}
            className="w-full rounded-lg bg-accent hover:bg-accent-dark text-white font-semibold py-2.5 text-sm transition disabled:opacity-50"
          >
            {busy ? t('common.loading') : mode === 'login' ? t('login.submitLogin') : t('login.submitRegister')}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
          className="mt-4 w-full text-center text-sm text-muted hover:text-ink"
        >
          {mode === 'login' ? t('login.toggleToRegister') : t('login.toggleToLogin')}
        </button>
      </div>
    </div>
  )
}
