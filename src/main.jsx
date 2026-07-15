import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ConfiguratorPage from './pages/ConfiguratorPage'
import AdminPage from './pages/admin/AdminPage'
import TecnicoPage from './pages/TecnicoPage'
import './index.css'

function Protected({ children, roles = null }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-neutral-50">
        <p className="text-muted text-sm">Caricamento…</p>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Protected><DashboardPage /></Protected>} />
          <Route path="/projects/:id" element={<Protected><ConfiguratorPage /></Protected>} />
          <Route path="/tecnico" element={<Protected roles={['TECNICO', 'ADMIN']}><TecnicoPage /></Protected>} />
          <Route path="/admin/*" element={<Protected roles={['ADMIN']}><AdminPage /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
