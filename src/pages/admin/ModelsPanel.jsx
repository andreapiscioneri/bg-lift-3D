import { useEffect, useState } from 'react'
import { api, CRANE_TYPES } from '../../api/client'
import { useTranslation } from '../../i18n/I18nContext'

export default function ModelsPanel() {
  const t = useTranslation()
  const [models, setModels] = useState(null)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  async function reload() {
    try {
      const r = await api.get('/api/models')
      setModels(r.models)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { reload() }, [])

  async function toggleActive(m) {
    setError(null)
    try {
      const fd = new FormData()
      fd.append('active', String(!m.active))
      await api.patchForm(`/api/models/${m.id}`, fd)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  async function onDelete(m) {
    if (!window.confirm(t('models.confirmDelete', { code: m.code }))) return
    setError(null)
    try {
      await api.delete(`/api/models/${m.id}`)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-accent hover:bg-accent-dark text-white text-sm font-semibold px-4 py-2 transition"
        >
          {t('models.newModel')}
        </button>
      </div>

      {error && <p className="text-sm text-danger mb-3">{error}</p>}

      {models === null ? (
        <p className="text-sm text-muted">{t('common.loading')}</p>
      ) : (
        <div className="bg-white border border-line rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted border-b border-line">
                <th className="px-4 py-3">{t('models.colCode')}</th>
                <th className="px-4 py-3">{t('models.colName')}</th>
                <th className="px-4 py-3">{t('models.colType')}</th>
                <th className="px-4 py-3">{t('models.colFile3d')}</th>
                <th className="px-4 py-3">{t('models.colProjects')}</th>
                <th className="px-4 py-3">{t('models.colStatus')}</th>
                <th className="px-4 py-3 text-right">{t('models.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-mono font-medium">{m.code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{m.name}</div>
                    {m.description && <div className="text-xs text-muted">{m.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted">{t(`craneType.${m.type}`)}</td>
                  <td className="px-4 py-3 text-xs text-muted font-mono">{m.glbUrl}</td>
                  <td className="px-4 py-3 text-muted">{m._count?.projects ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold rounded px-2 py-0.5 ${m.active ? 'bg-safe/10 text-safe' : 'bg-danger/10 text-danger'}`}>
                      {m.active ? t('models.active') : t('models.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2 text-xs">
                      <button onClick={() => toggleActive(m)} className="text-muted hover:text-ink underline">
                        {m.active ? t('models.deactivate') : t('models.activate')}
                      </button>
                      <button onClick={() => onDelete(m)} className="text-danger/70 hover:text-danger underline">
                        {t('models.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateModelModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); reload() }}
        />
      )}
    </div>
  )
}

function CreateModelModal({ onClose, onCreated }) {
  const t = useTranslation()
  const [form, setForm] = useState({ code: '', name: '', type: 'CINGOLATA', description: '' })
  const [glbFile, setGlbFile] = useState(null)
  const [dataFile, setDataFile] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v))
      fd.append('glb', glbFile)
      fd.append('data', dataFile)
      await api.postForm('/api/models', fd)
      onCreated()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const input = 'mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40'

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-panel w-full max-w-lg p-6 my-8" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-1">{t('models.modalTitle')}</h2>
        <p className="text-sm text-muted mb-5">
          {t('models.modalSubtitle')}
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium">{t('models.code')}</span>
              <input type="text" required value={form.code} onChange={set('code')} placeholder={t('models.codePlaceholder')} className={input} />
            </label>
            <label className="block">
              <span className="text-sm font-medium">{t('models.craneType')}</span>
              <select value={form.type} onChange={set('type')} className={`${input} bg-white`}>
                {CRANE_TYPES.map((ct) => (
                  <option key={ct.value} value={ct.value}>{t(`craneType.${ct.value}`)}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium">{t('models.name')}</span>
            <input type="text" required value={form.name} onChange={set('name')} placeholder={t('models.namePlaceholder')} className={input} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t('models.description')} <span className="text-muted font-normal">{t('common.optional')}</span></span>
            <input type="text" value={form.description} onChange={set('description')} className={input} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t('models.file3d')}</span>
            <input
              type="file" required accept=".glb"
              onChange={(e) => setGlbFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-neutral-200"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t('models.dataFile')}</span>
            <input
              type="file" required accept=".json,application/json"
              onChange={(e) => setDataFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-neutral-200"
            />
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-line text-sm font-medium py-2.5 hover:bg-neutral-50 transition">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={busy} className="flex-1 rounded-lg bg-accent hover:bg-accent-dark text-white text-sm font-semibold py-2.5 transition disabled:opacity-50">
              {busy ? t('models.creating') : t('models.createModel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
