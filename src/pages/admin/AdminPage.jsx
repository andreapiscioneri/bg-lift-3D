import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from '../../components/Layout/AppShell'
import { useTranslation } from '../../i18n/I18nContext'
import UsersPanel from './UsersPanel'
import ModelsPanel from './ModelsPanel'

export default function AdminPage() {
  const t = useTranslation()
  const tabClass = ({ isActive }) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition ${
      isActive ? 'bg-ink text-white' : 'text-muted hover:text-ink'
    }`

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">{t('admin.title')}</h1>
        <p className="text-sm text-muted">{t('admin.subtitle')}</p>
      </div>

      <div className="flex gap-2 mb-6">
        <NavLink to="/admin/users" className={tabClass}>{t('admin.tabUsers')}</NavLink>
        <NavLink to="/admin/models" className={tabClass}>{t('admin.tabModels')}</NavLink>
      </div>

      <Routes>
        <Route index element={<Navigate to="users" replace />} />
        <Route path="users" element={<UsersPanel />} />
        <Route path="models" element={<ModelsPanel />} />
      </Routes>
    </AppShell>
  )
}
