import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/Layout/AppShell'
import { api, CRANE_TYPES } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useTranslation } from '../i18n/I18nContext'
import { currentLocale } from '../utils/format'
import { REVIEW_LABEL_KEYS, REVIEW_CHIP, canSendReview } from '../utils/review'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(currentLocale(), {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function DashboardPage() {
  const { user } = useAuth()
  const t = useTranslation()
  const [projects, setProjects] = useState(null)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  async function reload() {
    try {
      const r = await api.get('/api/projects')
      setProjects(r.projects)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { reload() }, [])

  async function onDelete(p) {
    if (!window.confirm(t('dashboard.confirmDelete', { name: p.name }))) return
    await api.delete(`/api/projects/${p.id}`)
    reload()
  }

  async function onSendReview(p) {
    try {
      await api.post(`/api/reviews/${p.id}/request`)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">{t('dashboard.title')}</h1>
          <p className="text-sm text-muted">{t('dashboard.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-accent hover:bg-accent-dark text-white text-sm font-semibold px-4 py-2 transition"
        >
          {t('dashboard.newProject')}
        </button>
      </div>

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      {projects === null ? (
        <p className="text-sm text-muted">{t('common.loading')}</p>
      ) : projects.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-12 text-center">
          <p className="text-muted mb-4">{t('dashboard.empty')}</p>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-accent hover:bg-accent-dark text-white text-sm font-semibold px-4 py-2 transition"
          >
            {t('dashboard.createFirst')}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div key={p.id} className="bg-white border border-line rounded-2xl shadow-panel p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold leading-tight">{p.name}</h2>
                <span className="text-[10px] font-semibold uppercase bg-neutral-100 text-muted rounded px-1.5 py-0.5 whitespace-nowrap">
                  {t(`craneType.${p.craneModel.type}`)}
                </span>
              </div>
              <p className="text-sm text-muted mt-1">{p.craneModel.name}</p>
              {user?.role === 'ADMIN' && p.user && (
                <p className="text-xs text-muted mt-1">{t('dashboard.byUser', { name: p.user.name })}</p>
              )}
              <p className="text-xs text-muted mt-3">{t('dashboard.updated', { date: formatDate(p.updatedAt) })}</p>

              {/* Stato conferma ufficio tecnico */}
              {REVIEW_LABEL_KEYS[p.reviewStatus] && (
                <div className={`mt-3 flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${REVIEW_CHIP[p.reviewStatus]}`}>
                  <span className="truncate">
                    {t(REVIEW_LABEL_KEYS[p.reviewStatus])}
                    {p.reviewStatus === 'IN_REVIEW' && p.reviewTechnician && ` — ${p.reviewTechnician.name}`}
                  </span>
                  {p.reviewStatus === 'CERTIFIED' && p.certificateUrl && (
                    <a href={p.certificateUrl} target="_blank" rel="noreferrer" className="underline flex-shrink-0">
                      {t('dashboard.certificatePdf')}
                    </a>
                  )}
                </div>
              )}
              {canSendReview(p.reviewStatus) && (
                <button
                  onClick={() => onSendReview(p)}
                  className="mt-3 w-full rounded-lg border border-accent text-accent hover:bg-accent hover:text-white transition text-xs font-semibold py-1.5"
                >
                  {p.reviewStatus === 'CERTIFIED' ? t('dashboard.resend') : t('dashboard.sendForReview')}
                </button>
              )}

              <div className="mt-4 pt-4 border-t border-line flex items-center gap-2">
                <Link
                  to={`/projects/${p.id}`}
                  className="flex-1 text-center rounded-lg bg-ink text-white text-sm font-medium py-2 hover:bg-neutral-800 transition"
                >
                  {t('dashboard.openConfigurator')}
                </Link>
                <button
                  onClick={() => onDelete(p)}
                  className="rounded-lg border border-line text-muted hover:text-danger hover:border-danger/40 text-sm px-3 py-2 transition"
                  title={t('dashboard.deleteTitle')}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={reload} />}
    </AppShell>
  )
}

function CreateProjectModal({ onClose, onCreated }) {
  const t = useTranslation()
  const [models, setModels] = useState([])
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [modelId, setModelId] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get('/api/models').then((r) => {
      const active = r.models.filter((m) => m.active)
      setModels(active)
      if (active.length === 1) {
        setType(active[0].type)
        setModelId(active[0].id)
      }
    }).catch((err) => setError(err.message))
  }, [])

  // Solo i tipi per cui esiste almeno un modello attivo
  const availableTypes = useMemo(
    () => CRANE_TYPES.filter((ct) => models.some((m) => m.type === ct.value)),
    [models],
  )
  const filteredModels = useMemo(
    () => models.filter((m) => !type || m.type === type),
    [models, type],
  )

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await api.post('/api/projects', { name, craneModelId: modelId })
      onCreated()
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-panel w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-1">{t('dashboard.modalTitle')}</h2>
        <p className="text-sm text-muted mb-5">{t('dashboard.modalSubtitle')}</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">{t('dashboard.projectName')}</span>
            <input
              type="text" required value={name} onChange={(e) => setName(e.target.value)}
              placeholder={t('dashboard.projectNamePlaceholder')}
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">{t('dashboard.craneType')}</span>
            <select
              required value={type}
              onChange={(e) => { setType(e.target.value); setModelId('') }}
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="" disabled>{t('dashboard.selectType')}</option>
              {availableTypes.map((ct) => (
                <option key={ct.value} value={ct.value}>{t(`craneType.${ct.value}`)}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium">{t('dashboard.model')}</span>
            <select
              required value={modelId} disabled={!type}
              onChange={(e) => setModelId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50"
            >
              <option value="" disabled>{t('dashboard.selectModel')}</option>
              {filteredModels.map((m) => (
                <option key={m.id} value={m.id}>{m.code} — {m.name}</option>
              ))}
            </select>
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-line text-sm font-medium py-2.5 hover:bg-neutral-50 transition"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit" disabled={busy || !modelId}
              className="flex-1 rounded-lg bg-accent hover:bg-accent-dark text-white text-sm font-semibold py-2.5 transition disabled:opacity-50"
            >
              {busy ? t('dashboard.creating') : t('dashboard.createProject')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
