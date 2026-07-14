import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireAdmin, publicUser } from '../auth.js'

const router = Router()
router.use(requireAuth, requireAdmin)

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(['USER', 'ADMIN']).optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
})

router.get('/', async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { projects: true } } },
  })
  res.json({ users: users.map((u) => ({ ...publicUser(u), projectCount: u._count.projects })) })
})

router.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Dati non validi', details: parsed.error.issues })
  const { email, name, password, role } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return res.status(409).json({ error: 'Email già registrata' })

  const user = await prisma.user.create({
    data: { email, name, role: role ?? 'USER', passwordHash: await bcrypt.hash(password, 10) },
  })
  res.status(201).json({ user: publicUser(user) })
})

router.patch('/:id', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Dati non validi', details: parsed.error.issues })

  const target = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!target) return res.status(404).json({ error: 'Utente non trovato' })

  // Un admin non può auto-degradarsi o auto-disattivarsi: evita lockout.
  if (target.id === req.user.id && (parsed.data.role === 'USER' || parsed.data.active === false)) {
    return res.status(400).json({ error: 'Non puoi disattivare o degradare il tuo stesso account' })
  }

  const { password, ...rest } = parsed.data
  const data = { ...rest }
  if (password) data.passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.update({ where: { id: target.id }, data })
  res.json({ user: publicUser(user) })
})

router.delete('/:id', async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!target) return res.status(404).json({ error: 'Utente non trovato' })
  if (target.id === req.user.id) return res.status(400).json({ error: 'Non puoi eliminare il tuo stesso account' })

  await prisma.user.delete({ where: { id: target.id } })
  res.json({ ok: true })
})

export default router
