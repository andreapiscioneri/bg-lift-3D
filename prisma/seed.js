import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const prisma = new PrismaClient()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'

/**
 * Crea un utente iniziale. In PRODUZIONE le credenziali arrivano SOLO da
 * variabili d'ambiente (niente password deboli hardcoded): se mancano, l'utente
 * non viene creato. In sviluppo si usa il fallback comodo (localhost).
 * `update: {}` → idempotente, non sovrascrive un utente già esistente.
 */
async function seedUser(role, envPrefix, devEmail, devName, devPass) {
  const email = process.env[`${envPrefix}_EMAIL`] || (isProd ? null : devEmail)
  const pass = process.env[`${envPrefix}_PASSWORD`] || (isProd ? null : devPass)
  const name = process.env[`${envPrefix}_NAME`] || devName
  if (!email || !pass) {
    console.log(`${role}: nessuna credenziale (${envPrefix}_EMAIL/_PASSWORD) — salto`)
    return
  }
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, role, passwordHash: await bcrypt.hash(pass, 10) },
  })
  console.log(`${role}: ${email}`)
}

async function main() {
  await seedUser('ADMIN', 'SEED_ADMIN', 'admin@bglift.it', 'Amministratore', 'admin123')
  await seedUser('TECNICO', 'SEED_TECNICO', 'tecnico@bglift.it', 'Ufficio Tecnico', 'tecnico123')

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
