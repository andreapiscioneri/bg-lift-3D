import { Router } from 'express'
import path from 'node:path'
import multer from 'multer'
import { prisma } from '../db.js'
import { requireAuth, requireTecnico } from '../auth.js'
import { UPLOADS_DIR } from './models.js'

/**
 * Flusso di conferma ufficio tecnico.
 *   POST /api/reviews/:projectId/request      (proprietario) invia la richiesta
 *   GET  /api/reviews                          (tecnico) coda richieste + prese in carico
 *   POST /api/reviews/:projectId/claim         (tecnico) prende in carico
 *   POST /api/reviews/:projectId/certificate   (tecnico assegnato) allega il PDF e certifica
 */

const uploadPdf = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
      cb(null, `cert-${Date.now()}-${safe}`)
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' ||
      path.extname(file.originalname).toLowerCase() === '.pdf'
    if (!isPdf) return cb(new Error('Il certificato deve essere un PDF'))
    cb(null, true)
  },
})

const reviewInclude = {
  user: { select: { id: true, name: true, email: true } },
  reviewTechnician: { select: { id: true, name: true } },
  craneModel: { select: { id: true, code: true, name: true, type: true } },
}

const router = Router()
router.use(requireAuth)

/** L'utente (proprietario) invia la configurazione salvata all'ufficio tecnico. */
router.post('/:projectId/request', async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.projectId } })
  if (!project) return res.status(404).json({ error: 'Progetto non trovato' })
  if (project.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Solo il proprietario può inviare la richiesta' })
  }
  if (project.reviewStatus === 'REQUESTED' || project.reviewStatus === 'IN_REVIEW') {
    return res.status(409).json({ error: 'Richiesta già inviata all’ufficio tecnico' })
  }

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: {
      reviewStatus: 'REQUESTED',
      reviewRequestedAt: new Date(),
      reviewTechnicianId: null,
      certificateUrl: null,
      certifiedAt: null,
    },
    include: reviewInclude,
  })
  res.json({ project: updated })
})

/** Coda dell'ufficio tecnico: richieste in attesa e prese in carico. */
router.get('/', requireTecnico, async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { reviewStatus: { in: ['REQUESTED', 'IN_REVIEW'] } },
    include: reviewInclude,
    orderBy: { reviewRequestedAt: 'asc' },
  })
  res.json({ projects })
})

/** Il tecnico prende in carico una richiesta in attesa. */
router.post('/:projectId/claim', requireTecnico, async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.projectId } })
  if (!project) return res.status(404).json({ error: 'Progetto non trovato' })
  if (project.reviewStatus !== 'REQUESTED') {
    return res.status(409).json({ error: 'La richiesta non è in attesa di presa in carico' })
  }

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: { reviewStatus: 'IN_REVIEW', reviewTechnicianId: req.user.id },
    include: reviewInclude,
  })
  res.json({ project: updated })
})

/** Il tecnico assegnato allega il PDF che certifica la configurazione. */
router.post('/:projectId/certificate', requireTecnico, uploadPdf.single('pdf'), async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.projectId } })
  if (!project) return res.status(404).json({ error: 'Progetto non trovato' })
  if (project.reviewStatus !== 'IN_REVIEW') {
    return res.status(409).json({ error: 'La richiesta non è in carico: prendila in carico prima di certificare' })
  }
  if (project.reviewTechnicianId !== req.user.id && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'La richiesta è in carico a un altro tecnico' })
  }
  if (!req.file) return res.status(400).json({ error: 'PDF del certificato mancante' })

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: {
      reviewStatus: 'CERTIFIED',
      certificateUrl: `/uploads/${req.file.filename}`,
      certifiedAt: new Date(),
    },
    include: reviewInclude,
  })
  res.json({ project: updated })
})

export default router
