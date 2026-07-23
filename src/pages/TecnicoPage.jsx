import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/Layout/AppShell'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useTranslation } from '../i18n/I18nContext'
import { currentLocale } from '../utils/format'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(currentLocale(), {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

/**
 * Coda dell'ufficio tecnico: richieste di conferma in attesa e in carico.
 * Il tecnico prende in carico una richiesta, apre il configuratore per
 * verificarla e infine allega il PDF che certifica la configurazione,
 * rendendolo disponibile al cliente.
 */
export default function TecnicoPage() {
  const { user } = useAuth()
  const t = useTranslation()
  const [projects, setProjects] = useState(null)
  const [error, setError] = useState(null)

  async function reload() {
    try {
      const r = await api.get('/api/reviews')
      setProjects(r.projects)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { reload() }, [])

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">{t('tecnico.title')}</h1>
        <p className="text-sm text-muted">{t('tecnico.subtitle')}</p>
      </div>

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      {projects === null ? (
        <p className="text-sm text-muted">{t('common.loading')}</p>
      ) : projects.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-12 text-center">
          <p className="text-muted">{t('tecnico.empty')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {projects.map((p) => (
            <RequestCard key={p.id} project={p} me={user} onChanged={reload} onError={setError} />
          ))}
        </div>
      )}
    </AppShell>
  )
}

function RequestCard({ project: p, me, onChanged, onError }) {
  const t = useTranslation()
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const mine = p.reviewTechnician?.id === me?.id
  const canCertify = p.reviewStatus === 'IN_REVIEW' && (mine || me?.role === 'ADMIN')

  async function onClaim() {
    setBusy(true)
    onError(null)
    try {
      await api.post(`/api/reviews/${p.id}/claim`)
      onChanged()
    } catch (err) {
      onError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function onCertify(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    onError(null)
    try {
      const fd = new FormData()
      fd.append('pdf', file)
      await api.postForm(`/api/reviews/${p.id}/certificate`, fd)
      onChanged()
    } catch (err) {
      onError(err.message)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="bg-white border border-line rounded-2xl shadow-panel p-5 flex flex-wrap items-center gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold leading-tight truncate">{p.name}</h2>
          <span className="text-[10px] font-semibold uppercase bg-neutral-100 text-muted rounded px-1.5 py-0.5 whitespace-nowrap">
            {p.craneModel.code} · {t(`craneType.${p.craneModel.type}`)}
          </span>
        </div>
        <p className="text-sm text-muted mt-0.5">
          {t('tecnico.requestedBy', { name: p.user.name, email: p.user.email, date: formatDate(p.reviewRequestedAt) })}
        </p>
        {p.reviewStatus === 'IN_REVIEW' && (
          <p className="text-xs text-accent font-semibold mt-1">
            {t('tecnico.assignedTo', { name: mine ? t('common.you') : p.reviewTechnician?.name ?? '—' })}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          to={`/projects/${p.id}`}
          className="rounded-lg border border-line text-sm font-medium px-3 py-2 hover:bg-neutral-50 transition"
        >
          {t('tecnico.openConfiguration')}
        </Link>

        {p.reviewStatus === 'REQUESTED' && (
          <button
            onClick={onClaim}
            disabled={busy}
            className="rounded-lg bg-accent hover:bg-accent-dark text-white text-sm font-semibold px-4 py-2 transition disabled:opacity-50"
          >
            {busy ? '…' : t('tecnico.claim')}
          </button>
        )}

        {canCertify && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={onCertify}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="rounded-lg bg-safe hover:opacity-90 text-white text-sm font-semibold px-4 py-2 transition disabled:opacity-50"
            >
              {busy ? t('tecnico.certifying') : t('tecnico.certify')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
