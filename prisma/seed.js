import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const prisma = new PrismaClient()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  // Admin di default (cambiare password al primo accesso in produzione)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bglift.it' },
    update: {},
    create: {
      email: 'admin@bglift.it',
      name: 'Amministratore',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
    },
  })
  console.log(`Admin: ${admin.email}`)

  // Utente ufficio tecnico di default (cambiare password in produzione)
  const tecnico = await prisma.user.upsert({
    where: { email: 'tecnico@bglift.it' },
    update: {},
    create: {
      email: 'tecnico@bglift.it',
      name: 'Ufficio Tecnico',
      passwordHash: await bcrypt.hash('tecnico123', 10),
      role: 'TECNICO',
    },
  })
  console.log(`Tecnico: ${tecnico.email}`)

  // Modello BR0089 esistente nel repo (GLB già in public/models)
  const dataPath = path.join(__dirname, '..', 'src', 'data', 'BR0089.json')
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))

  const model = await prisma.craneModel.upsert({
    where: { code: 'BR0089' },
    update: { data, name: data.displayName ?? 'BGLift M250 + JIB' },
    create: {
      code: 'BR0089',
      name: data.displayName ?? 'BGLift BR0089',
      type: 'CINGOLATA',
      description: 'Gru cingolata BGLift BR0089 — modello di partenza',
      glbUrl: '/models/m250.glb',
      data,
    },
  })
  console.log(`Modello gru: ${model.code}`)

  // Variante M250 senza jib (GLB convertito da M250nojib.STEP, già in public/models)
  const nojibPath = path.join(__dirname, '..', 'src', 'data', 'M250NOJIB.json')
  const nojibData = JSON.parse(fs.readFileSync(nojibPath, 'utf-8'))

  const nojib = await prisma.craneModel.upsert({
    where: { code: 'M250-NOJIB' },
    update: { data: nojibData, name: nojibData.displayName ?? 'BGLift M250' },
    create: {
      code: 'M250-NOJIB',
      name: nojibData.displayName ?? 'BGLift M250',
      type: 'CINGOLATA',
      description: 'Gru cingolata BGLift M250 senza jib',
      glbUrl: '/models/m250nojib.glb',
      data: nojibData,
    },
  })
  console.log(`Modello gru: ${nojib.code}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
