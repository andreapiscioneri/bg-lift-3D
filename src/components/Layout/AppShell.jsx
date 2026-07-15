import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

/** Header comune per le pagine "gestionali" (dashboard, admin). */
export default function AppShell({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function onLogout() {
    await logout()
    navigate('/login')
  }

  const navClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition ${
      isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:text-ink'
    }`

  return (
    <div className="min-h-dvh bg-neutral-50 flex flex-col">
      <header className="bg-white border-b border-line">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link to="/" className="flex-shrink-0">
            <img src="/Logo-BGLift.webp" alt="BG Lift" className="h-7" />
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navClass}>Progetti</NavLink>
            {(user?.role === 'TECNICO' || user?.role === 'ADMIN') && (
              <NavLink to="/tecnico" className={navClass}>Ufficio tecnico</NavLink>
            )}
            {user?.role === 'ADMIN' && (
              <NavLink to="/admin" className={navClass}>Amministrazione</NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted hidden sm:block">
              {user?.name}
              {(user?.role === 'ADMIN' || user?.role === 'TECNICO') && (
                <span className="ml-1.5 text-[10px] font-semibold uppercase bg-accent/10 text-accent rounded px-1.5 py-0.5">
                  {user.role === 'ADMIN' ? 'admin' : 'tecnico'}
                </span>
              )}
            </span>
            <button
              onClick={onLogout}
              className="text-sm text-muted hover:text-danger transition"
            >
              Esci
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
