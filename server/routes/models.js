import { Router } from 'express'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import multer from 'multer'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireAdmin } from '../auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const UPLOADS_DIR = path.join(__dirname, '..', 'uploads')
fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
      cb(null, `${Date.now()}-${safe}`)
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'glb' && !file.originalname.toLowerCase().endsWith('.glb')) {
      return cb(new Error('Il file 3D deve essere un .glb'))
    }
    cb(null, true)
  },
})

const CRANE_TYPES = ['CINGOLATA', 'RAGNO', 'AUTOCARRATA', 'TORRE']

const modelSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  type: z.enum(CRANE_TYPES),
  description: z.string().max(500).optional().nullable(),
  active: z.coerce.boolean().optional(),
})

const router = Router()
router.use(requireAuth)

/** Lista modelli: gli utenti vedono solo gli attivi, l'admin tutti (senza data, pesante). */
router.get('/', async (req, res) => {
  const where = req.user.role === 'ADMIN' ? {} : { active: true }
  const models = await prisma.craneModel.findMany({
    where,
    select: {
      id: true, code: true, name: true, type: true, description: true,
      glbUrl: true, active: true, createdAt: true, updatedAt: true,
      _count: { select: { projects: true } },
    },
    orderBy: { code: 'asc' },
  })
  res.json({ models })
})

/** Crea modello (admin): multipart con campi + file glb + file dati JSON. */
router.post('/', requireAdmin, upload.fields([{ name: 'glb', maxCount: 1 }, { name: 'data', maxCount: 1 }]), async (req, res) => {
  const parsed = modelSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Dati non validi', details: parsed.error.issues })

  const glbFile = req.files?.glb?.[0]
  const dataFile = req.files?.data?.[0]
  if (!glbFile) return res.status(400).json({ error: 'File .glb mancante' })
  if (!dataFile) return res.status(400).json({ error: 'File JSON dati tecnici mancante' })

  let data
  try {
    data = JSON.parse(fs.readFileSync(dataFile.path, 'utf-8'))
  } catch {
    return res.status(400).json({ error: 'Il file dati non è un JSON valido' })
  } finally {
    fs.rmSync(dataFile.path, { force: true })
  }

  const existing = await prisma.craneModel.findUnique({ where: { code: parsed.data.code } })
  if (existing) return res.status(409).json({ error: `Codice ${parsed.data.code} già esistente` })

  const model = await prisma.craneModel.create({
    data: {
      ...parsed.data,
      glbUrl: `/uploads/${glbFile.filename}`,
      data,
    },
  })
  res.status(201).json({ model })
})

/** Aggiorna modello (admin): campi e/o nuovi file. */
router.patch('/:id', requireAdmin, upload.fields([{ name: 'glb', maxCount: 1 }, { name: 'data', maxCount: 1 }]), async (req, res) => {
  const existing = await prisma.craneModel.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ error: 'Modello non trovato' })

  const parsed = modelSchema.partial().safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Dati non validi', details: parsed.error.issues })

  const patch = { ...parsed.data }

  const glbFile = req.files?.glb?.[0]
  if (glbFile) patch.glbUrl = `/uploads/${glbFile.filename}`

  const dataFile = req.files?.data?.[0]
  if (dataFile) {
    try {
      patch.data = JSON.parse(fs.readFileSync(dataFile.path, 'utf-8'))
    } catch {
      return res.status(400).json({ error: 'Il file dati non è un JSON valido' })
    } finally {
      fs.rmSync(dataFile.path, { force: true })
    }
  }

  const model = await prisma.craneModel.update({ where: { id: existing.id }, data: patch })
  res.json({ model })
})

router.delete('/:id', requireAdmin, async (req, res) => {
  const existing = await prisma.craneModel.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { projects: true } } },
  })
  if (!existing) return res.status(404).json({ error: 'Modello non trovato' })
  if (existing._count.projects > 0) {
    return res.status(409).json({ error: 'Il modello è usato da progetti esistenti: disattivalo invece di eliminarlo' })
  }
  await prisma.craneModel.delete({ where: { id: existing.id } })
  res.json({ ok: true })
})

export default router
