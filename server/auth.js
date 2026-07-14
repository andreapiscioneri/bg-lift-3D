import jwt from 'jsonwebtoken'
import { prisma } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production'
const COOKIE_NAME = 'bglift_token'
const TOKEN_TTL = '7d'

export function setAuthCookie(res, user) {
  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  })
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME)
}

/** Middleware: richiede utente autenticato e attivo, popola req.user. */
export async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME]
  if (!token) return res.status(401).json({ error: 'Non autenticato' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user || !user.active) {
      clearAuthCookie(res)
      return res.status(401).json({ error: 'Utente non valido o disattivato' })
    }
    req.user = user
    next()
  } catch {
    clearAuthCookie(res)
    return res.status(401).json({ error: 'Sessione scaduta' })
  }
}

/** Middleware: richiede ruolo ADMIN (da usare dopo requireAuth). */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Accesso riservato agli amministratori' })
  }
  next()
}

/** Rappresentazione pubblica dell'utente (mai passwordHash). */
export function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    active: u.active,
    createdAt: u.createdAt,
  }
}
