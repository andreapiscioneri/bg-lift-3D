import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from '../../components/Layout/AppShell'
import UsersPanel from './UsersPanel'
import ModelsPanel from './ModelsPanel'

export default function AdminPage() {
  const tabClass = ({ isActive }) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition ${
      isActive ? 'bg-ink text-white' : 'text-muted hover:text-ink'
    }`

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Amministrazione</h1>
        <p className="text-sm text-muted">Gestione utenti e catalogo modelli gru</p>
      </div>

      <div className="flex gap-2 mb-6">
        <NavLink to="/admin/users" className={tabClass}>Utenti</NavLink>
        <NavLink to="/admin/models" className={tabClass}>Modelli gru</NavLink>
      </div>

      <Routes>
        <Route index element={<Navigate to="users" replace />} />
        <Route path="users" element={<UsersPanel />} />
        <Route path="models" element={<ModelsPanel />} />
      </Routes>
    </AppShell>
  )
}
