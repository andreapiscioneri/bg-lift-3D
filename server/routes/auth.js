import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../db.js'
import { setAuthCookie, clearAuthCookie, requireAuth, publicUser } from '../auth.js'

const router = Router()

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const registerSchema = credentialsSchema.extend({
  name: z.string().min(1),
})

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Dati non validi', details: parsed.error.issues })
  const { email, password, name } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return res.status(409).json({ error: 'Email già registrata' })

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { email, name, passwordHash } })
  setAuthCookie(res, user)
  res.status(201).json({ user: publicUser(user) })
})

router.post('/login', async (req, res) => {
  // ── TEMP DEBUG: accesso rapido admin/admin, solo fuori produzione ──
  // TODO: rimuovere prima del go-live (è comunque disattivato con NODE_ENV=production)
  if (
    process.env.NODE_ENV !== 'production' &&
    req.body?.email === 'admin' &&
    req.body?.password === 'admin'
  ) {
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN', active: true },
      orderBy: { createdAt: 'asc' },
    })
    if (!admin) return res.status(500).json({ error: 'Nessun utente ADMIN nel database' })
    setAuthCookie(res, admin)
    return res.json({ user: publicUser(admin) })
  }
  // ── fine TEMP DEBUG ──

  const parsed = credentialsSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Dati non validi' })
  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Credenziali non valide' })
  }
  if (!user.active) return res.status(403).json({ error: 'Account disattivato' })

  setAuthCookie(res, user)
  res.json({ user: publicUser(user) })
})

router.post('/logout', (req, res) => {
  clearAuthCookie(res)
  res.json({ ok: true })
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

export default router
