import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()
router.use(requireAuth)

const createSchema = z.object({
  name: z.string().min(1).max(120),
  craneModelId: z.string().min(1),
})

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  config: z.record(z.string(), z.any()).optional(),
})

const projectInclude = {
  craneModel: {
    select: { id: true, code: true, name: true, type: true, glbUrl: true },
  },
}

/** Un utente vede solo i propri progetti; l'admin li vede tutti. */
function ownerFilter(req) {
  return req.user.role === 'ADMIN' ? {} : { userId: req.user.id }
}

router.get('/', async (req, res) => {
  const projects = await prisma.project.findMany({
    where: ownerFilter(req),
    include: {
      ...projectInclude,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })
  res.json({ projects })
})

router.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Dati non validi', details: parsed.error.issues })
  const { name, craneModelId } = parsed.data

  const model = await prisma.craneModel.findUnique({ where: { id: craneModelId } })
  if (!model || !model.active) return res.status(400).json({ error: 'Modello gru non disponibile' })

  const project = await prisma.project.create({
    data: {
      name,
      userId: req.user.id,
      craneModelId,
      config: model.data?.defaultConfiguration ?? undefined,
    },
    include: projectInclude,
  })
  res.status(201).json({ project })
})

router.get('/:id', async (req, res) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, ...ownerFilter(req) },
    include: {
      craneModel: true, // include anche data: serve al configuratore
      user: { select: { id: true, name: true, email: true } },
    },
  })
  if (!project) return res.status(404).json({ error: 'Progetto non trovato' })
  res.json({ project })
})

router.patch('/:id', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Dati non validi', details: parsed.error.issues })

  const existing = await prisma.project.findFirst({
    where: { id: req.params.id, ...ownerFilter(req) },
  })
  if (!existing) return res.status(404).json({ error: 'Progetto non trovato' })

  const project = await prisma.project.update({
    where: { id: existing.id },
    data: parsed.data,
    include: projectInclude,
  })
  res.json({ project })
})

router.delete('/:id', async (req, res) => {
  const existing = await prisma.project.findFirst({
    where: { id: req.params.id, ...ownerFilter(req) },
  })
  if (!existing) return res.status(404).json({ error: 'Progetto non trovato' })

  await prisma.project.delete({ where: { id: existing.id } })
  res.json({ ok: true })
})

export default router
