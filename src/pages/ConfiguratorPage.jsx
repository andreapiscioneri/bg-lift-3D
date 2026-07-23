import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import App from '../App'
import { api } from '../api/client'
import { useCraneStore } from '../store/craneStore'
import { useTranslation } from '../i18n/I18nContext'
import { currentLocale } from '../utils/format'
import LanguageSelector from '../components/UI/LanguageSelector'

/**
 * Pagina progetto: carica il progetto dal backend, inizializza lo store del
 * configuratore e aggiunge una barra superiore con salvataggio.
 */
export default function ConfiguratorPage() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [error, setError] = useState(null)
  const loadProject = useCraneStore((s) => s.loadProject)
  const t = useTranslation()

  useEffect(() => {
    let cancelled = false
    setProject(null)
    api.get(`/api/projects/${id}`)
      .then((r) => {
        if (cancelled) return
        loadProject(r.project)
        setProject(r.project)
      })
      .catch((err) => !cancelled && setError(err.message))
    return () => { cancelled = true }
  }, [id, loadProject])

  if (error) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-neutral-50">
        <p className="text-danger">{error}</p>
        <Link to="/" className="text-sm text-accent underline">{t('configurator.backToProjects')}</Link>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-neutral-50">
        <p className="text-muted text-sm">{t('common.loadingProject')}</p>
      </div>
    )
  }

  return (
    <div className="w-screen flex flex-col" style={{ height: '100dvh' }}>
      <TopBar project={project} />
      <div className="flex-1 min-h-0">
        <App />
      </div>
    </div>
  )
}

function TopBar({ project }) {
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [error, setError] = useState(null)
  const t = useTranslation()

  async function onSave() {
    setSaving(true)
    setError(null)
    try {
      const config = useCraneStore.getState().config
      await api.patch(`/api/projects/${project.id}`, { config })
      setSavedAt(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <header className="h-12 flex-shrink-0 bg-ink text-white flex items-center gap-3 px-3">
      <Link
        to="/"
        className="text-sm text-white/70 hover:text-white transition flex items-center gap-1"
      >
        ← {t('configurator.back')}
      </Link>
      <div className="w-px h-5 bg-white/20" />
      <div className="min-w-0">
        <span className="text-sm font-semibold truncate">{project.name}</span>
        <span className="ml-2 text-xs text-white/60 hidden sm:inline">
          {project.craneModel.code} · {t(`craneType.${project.craneModel.type}`)}
        </span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        {error && <span className="text-xs text-red-400">{error}</span>}
        {savedAt && !error && (
          <span className="text-xs text-white/60">
            {t('configurator.savedAt', {
              time: savedAt.toLocaleTimeString(currentLocale(), { hour: '2-digit', minute: '2-digit' }),
            })}
          </span>
        )}
        <LanguageSelector variant="dark" />
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-accent hover:bg-accent-dark text-white text-sm font-semibold px-4 py-1.5 transition disabled:opacity-50"
        >
          {saving ? t('configurator.saving') : t('configurator.save')}
        </button>
      </div>
    </header>
  )
}
