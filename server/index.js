import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import authRoutes from './routes/auth.js'
import projectRoutes from './routes/projects.js'
import modelRoutes, { UPLOADS_DIR } from './routes/models.js'
import userRoutes from './routes/users.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(express.json({ limit: '5mb' }))
app.use(cookieParser())

app.use('/uploads', express.static(UPLOADS_DIR))

app.use('/api/auth', authRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/models', modelRoutes)
app.use('/api/admin/users', userRoutes)

app.get('/api/health', (req, res) => res.json({ ok: true }))

// In produzione serve anche la build frontend
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'dist')
  app.use(express.static(dist))
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')))
}

// Error handler unico (multer, JSON malformato, errori Prisma…)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Errore interno' })
})

const port = process.env.PORT || 3001
app.listen(port, () => console.log(`API BGLift in ascolto su http://localhost:${port}`))
