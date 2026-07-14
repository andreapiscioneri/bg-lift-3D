import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/Layout/AppShell'
import { api, CRANE_TYPES, craneTypeLabel } from '../api/client'
import { useAuth } from '../auth/AuthContext'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function DashboardPage() {
  const { user } = useAuth()
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
    if (!window.confirm(`Eliminare il progetto “${p.name}”?`)) return
    await api.delete(`/api/projects/${p.id}`)
    reload()
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">I tuoi progetti</h1>
          <p className="text-sm text-muted">Configurazioni di sollevamento salvate</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-accent hover:bg-accent-dark text-white text-sm font-semibold px-4 py-2 transition"
        >
          + Nuovo progetto
        </button>
      </div>

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      {projects === null ? (
        <p className="text-sm text-muted">Caricamento…</p>
      ) : projects.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-12 text-center">
          <p className="text-muted mb-4">Nessun progetto ancora: creane uno per iniziare a configurare la gru.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-accent hover:bg-accent-dark text-white text-sm font-semibold px-4 py-2 transition"
          >
            Crea il primo progetto
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div key={p.id} className="bg-white border border-line rounded-2xl shadow-panel p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold leading-tight">{p.name}</h2>
                <span className="text-[10px] font-semibold uppercase bg-neutral-100 text-muted rounded px-1.5 py-0.5 whitespace-nowrap">
                  {craneTypeLabel(p.craneModel.type)}
                </span>
              </div>
              <p className="text-sm text-muted mt-1">{p.craneModel.name}</p>
              {user?.role === 'ADMIN' && p.user && (
                <p className="text-xs text-muted mt-1">di {p.user.name}</p>
              )}
              <p className="text-xs text-muted mt-3">Aggiornato {formatDate(p.updatedAt)}</p>
              <div className="mt-4 pt-4 border-t border-line flex items-center gap-2">
                <Link
                  to={`/projects/${p.id}`}
                  className="flex-1 text-center rounded-lg bg-ink text-white text-sm font-medium py-2 hover:bg-neutral-800 transition"
                >
                  Apri configuratore
                </Link>
                <button
                  onClick={() => onDelete(p)}
                  className="rounded-lg border border-line text-muted hover:text-danger hover:border-danger/40 text-sm px-3 py-2 transition"
                  title="Elimina progetto"
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
    () => CRANE_TYPES.filter((t) => models.some((m) => m.type === t.value)),
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
        <h2 className="text-lg font-semibold mb-1">Nuovo progetto</h2>
        <p className="text-sm text-muted mb-5">Scegli tipo e modello di gru: potrai configurarla nella scena 3D.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Nome progetto</span>
            <input
              type="text" required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Es. Cantiere Via Roma"
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Tipo gru</span>
            <select
              required value={type}
              onChange={(e) => { setType(e.target.value); setModelId('') }}
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="" disabled>Seleziona il tipo…</option>
              {availableTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium">Modello</span>
            <select
              required value={modelId} disabled={!type}
              onChange={(e) => setModelId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50"
            >
              <option value="" disabled>Seleziona il modello…</option>
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
              Annulla
            </button>
            <button
              type="submit" disabled={busy || !modelId}
              className="flex-1 rounded-lg bg-accent hover:bg-accent-dark text-white text-sm font-semibold py-2.5 transition disabled:opacity-50"
            >
              {busy ? 'Creazione…' : 'Crea progetto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
