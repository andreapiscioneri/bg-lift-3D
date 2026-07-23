import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { useTranslation } from '../../i18n/I18nContext'

export default function UsersPanel() {
  const { user: me } = useAuth()
  const t = useTranslation()
  const [users, setUsers] = useState(null)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  async function reload() {
    try {
      const r = await api.get('/api/admin/users')
      setUsers(r.users)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { reload() }, [])

  async function patchUser(u, patch, confirmMsg) {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setError(null)
    try {
      await api.patch(`/api/admin/users/${u.id}`, patch)
      reload()
    } catch (err) {
      setError(err.message)
    }
  }

  async function onResetPassword(u) {
    const password = window.prompt(t('users.promptResetPassword', { email: u.email }))
    if (!password) return
    await patchUser(u, { password })
    window.alert(t('users.passwordUpdated'))
  }

  async function onDelete(u) {
    if (!window.confirm(t('users.confirmDelete', { email: u.email, count: u.projectCount }))) return
    setError(null)
    try {
      await api.delete(`/api/admin/users/${u.id}`)
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
          {t('users.newUser')}
        </button>
      </div>

      {error && <p className="text-sm text-danger mb-3">{error}</p>}

      {users === null ? (
        <p className="text-sm text-muted">{t('common.loading')}</p>
      ) : (
        <div className="bg-white border border-line rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted border-b border-line">
                <th className="px-4 py-3">{t('users.colUser')}</th>
                <th className="px-4 py-3">{t('users.colRole')}</th>
                <th className="px-4 py-3">{t('users.colStatus')}</th>
                <th className="px-4 py-3">{t('users.colProjects')}</th>
                <th className="px-4 py-3 text-right">{t('users.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.name}{u.id === me.id && <span className="text-muted font-normal"> ({t('common.you')})</span>}</div>
                    <div className="text-muted text-xs">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={u.id === me.id}
                      onChange={(e) => patchUser(u, { role: e.target.value })}
                      className="rounded border border-line px-2 py-1 text-xs bg-white disabled:opacity-50"
                    >
                      <option value="USER">{t('roles.USER')}</option>
                      <option value="TECNICO">{t('roles.TECNICO')}</option>
                      <option value="ADMIN">{t('roles.ADMIN')}</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold rounded px-2 py-0.5 ${u.active ? 'bg-safe/10 text-safe' : 'bg-danger/10 text-danger'}`}>
                      {u.active ? t('users.active') : t('users.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{u.projectCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2 text-xs">
                      <button onClick={() => onResetPassword(u)} className="text-muted hover:text-ink underline">
                        {t('users.resetPassword')}
                      </button>
                      {u.id !== me.id && (
                        <>
                          <button
                            onClick={() => patchUser(u, { active: !u.active })}
                            className="text-muted hover:text-ink underline"
                          >
                            {u.active ? t('users.deactivate') : t('users.reactivate')}
                          </button>
                          <button onClick={() => onDelete(u)} className="text-danger/70 hover:text-danger underline">
                            {t('users.delete')}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); reload() }}
        />
      )}
    </div>
  )
}

function CreateUserModal({ onClose, onCreated }) {
  const t = useTranslation()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'USER' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.post('/api/admin/users', form)
      onCreated()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const input = 'mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40'

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-panel w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-5">{t('users.modalTitle')}</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">{t('users.name')}</span>
            <input type="text" required value={form.name} onChange={set('name')} className={input} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t('users.email')}</span>
            <input type="email" required value={form.email} onChange={set('email')} className={input} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t('users.password')}</span>
            <input type="password" required minLength={6} value={form.password} onChange={set('password')} className={input} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t('users.role')}</span>
            <select value={form.role} onChange={set('role')} className={`${input} bg-white`}>
              <option value="USER">{t('roles.USER')}</option>
              <option value="TECNICO">{t('roles.TECNICO')}</option>
              <option value="ADMIN">{t('roles.ADMIN')}</option>
            </select>
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-line text-sm font-medium py-2.5 hover:bg-neutral-50 transition">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={busy} className="flex-1 rounded-lg bg-accent hover:bg-accent-dark text-white text-sm font-semibold py-2.5 transition disabled:opacity-50">
              {busy ? t('users.creating') : t('users.createUser')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
