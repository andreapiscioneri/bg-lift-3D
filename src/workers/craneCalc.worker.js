/**
 * Web Worker — calcoli di sicurezza per la gru BGLift.
 *
 * Gira fuori dal main thread per non bloccare i 60fps della scena 3D.
 * Esposto via Comlink: il main thread chiama `worker.computeSafety(state, model)`.
 *
 * ATTENZIONE: i calcoli qui sono semplificati e a scopo di prototipo.
 * Prima di un impiego in cantiere occorre validare:
 *   1. l'interpolazione contro la tabella ufficiale BGLift
 *   2. i carichi sui piedi rispetto al modello statico fornito dal costruttore
 *   3. i fattori di sicurezza rispetto alla normativa applicabile (EN 13000 ecc.)
 */

import * as Comlink from 'comlink'

// ------------------------------------------------------------------
// Helpers matematici
// ------------------------------------------------------------------

const deg2rad = (d) => (d * Math.PI) / 180

/** Interpolazione lineare 1D. */
function lerp(a, b, t) {
  return a + (b - a) * t
}

/** Trova l'indice tale che xs[i] <= x <= xs[i+1]. Clampa agli estremi. */
function bracketIndex(xs, x) {
  if (x <= xs[0]) return { i: 0, t: 0 }
  if (x >= xs[xs.length - 1]) return { i: xs.length - 2, t: 1 }
  for (let i = 0; i < xs.length - 1; i++) {
    if (x >= xs[i] && x <= xs[i + 1]) {
      const t = (x - xs[i]) / (xs[i + 1] - xs[i])
      return { i, t }
    }
  }
  return { i: 0, t: 0 }
}

/**
 * Interpolazione bilineare sulla tabella SWL.
 * angles_deg è in ordine DECRESCENTE (82 → 5), radii_m in ordine CRESCENTE.
 */
function interpolateSWL(loadChart, angleDeg, radiusM) {
  const { angles_deg, radii_m, swl_kg } = loadChart

  // angles_deg è decrescente: convertilo "indicizzandolo" coerentemente
  // Cerchiamo l'indice in modo da gestire la monotonia decrescente.
  const findAngle = () => {
    if (angleDeg >= angles_deg[0]) return { i: 0, t: 0 }
    if (angleDeg <= angles_deg[angles_deg.length - 1]) return { i: angles_deg.length - 2, t: 1 }
    for (let i = 0; i < angles_deg.length - 1; i++) {
      const hi = angles_deg[i]
      const lo = angles_deg[i + 1]
      if (angleDeg <= hi && angleDeg >= lo) {
        const t = (hi - angleDeg) / (hi - lo)
        return { i, t }
      }
    }
    return { i: 0, t: 0 }
  }

  const a = findAngle()
  const r = bracketIndex(radii_m, radiusM)

  const q11 = swl_kg[a.i][r.i]
  const q12 = swl_kg[a.i][r.i + 1]
  const q21 = swl_kg[a.i + 1][r.i]
  const q22 = swl_kg[a.i + 1][r.i + 1]

  const top = lerp(q11, q12, r.t)
  const bot = lerp(q21, q22, r.t)
  return Math.max(0, lerp(top, bot, a.t))
}

// ------------------------------------------------------------------
// Cinematica → raggio di lavoro
// ------------------------------------------------------------------

/**
 * Calcola il raggio di lavoro a terra (distanza orizzontale dal centro
 * di rotazione al punto di sospensione del carico).
 */
function computeWorkingRadius(state, model) {
  const angleRad = deg2rad(state.mainBoomAngleDeg)
  const boomHoriz = state.mainBoomLengthM * Math.cos(angleRad)
  const pivotOffset = model.mainBoom.pivot.z // offset del piede del braccio rispetto al centro torretta

  let radius = pivotOffset + boomHoriz

  if (model.jib?.available && state.jibLengthM > 0) {
    // Jib articolato rispetto alla punta del braccio principale
    const jibAbsAngleRad = deg2rad(state.mainBoomAngleDeg - state.jibAngleDeg)
    radius += state.jibLengthM * Math.cos(jibAbsAngleRad)
  }

  return radius
}

// ------------------------------------------------------------------
// Reazioni sugli stabilizzatori — modello rigido semplificato
// ------------------------------------------------------------------

/**
 * Modello: corpo rigido in equilibrio statico.
 * Forze: peso telaio (G_c), peso torretta+braccio (G_b applicato in punta), carico L.
 * Le 4 reazioni Ri sono distribuite con un modello di Tappet (plate-on-spring lineare)
 * che dipende dal momento totale rispetto al baricentro del poligono di appoggio.
 *
 * Output: pressione sotto ogni pad in kPa e fattore di utilizzo (0..1).
 */
function computeOutriggerReactions(state, model, radiusM) {
  const g = 9.81
  const { outriggers, chassis, turret, mainBoom, jib } = model

  // Posizioni effettive dei pad in funzione dello sfilo per piede
  const ext = state.outriggerExtensionM
  const pads = ['frontLeft', 'frontRight', 'rearLeft', 'rearRight'].map((name) => {
    const base = outriggers.positions[name]
    // estensione lungo x con segno coerente al lato
    const side = Math.sign(base.x) || 1
    return {
      name,
      x: side * (Math.abs(base.x) + (ext[name] ?? 0)),
      z: base.z,
    }
  })

  // Peso totale e baricentro a vuoto
  const massChassis = chassis.totalMass
  const massTurret = turret.mass
  const sectionTotal = mainBoom.sectionMass.reduce((s, m) => s + m, 0)
  const massBoom = sectionTotal
  const massJib = jib?.available ? jib.mass : 0
  const massLoad = state.loadKg

  // Punto di applicazione del carico (proiezione a terra dalla punta del braccio)
  const rotRad = deg2rad(state.rotationDeg)
  const Lx = Math.sin(rotRad) * radiusM
  const Lz = Math.cos(rotRad) * radiusM

  // Momento totale di ribaltamento rispetto a O (centro telaio a terra)
  const Wtot = (massChassis + massTurret + massBoom + massJib + massLoad) * g // N
  // Coordinate del baricentro complessivo (x,z), pesate
  const cx =
    (massChassis * chassis.centerOfGravity.x +
      massTurret * 0 +
      massBoom * (mainBoom.pivot.z * 0) + // semplifichiamo: braccio sopra la torretta
      massJib * 0 +
      massLoad * Lx) /
    (massChassis + massTurret + massBoom + massJib + massLoad)
  const cz =
    (massChassis * chassis.centerOfGravity.z +
      massTurret * 0 +
      massBoom * mainBoom.pivot.z +
      massJib * mainBoom.pivot.z +
      massLoad * Lz) /
    (massChassis + massTurret + massBoom + massJib + massLoad)

  // Distribuzione planare: R_i = W/4 + Mx*(z_i)/Σz² + Mz*(x_i)/Σx²  (modello a piastra rigida)
  const sumX2 = pads.reduce((s, p) => s + p.x * p.x, 0)
  const sumZ2 = pads.reduce((s, p) => s + p.z * p.z, 0)
  const Mx = Wtot * cz // momento attorno asse X (lateraleggia avanti/dietro)
  const Mz = Wtot * cx // momento attorno asse Z (laterale)

  const padArea = outriggers.padArea_m2
  const maxLoad_N = outriggers.maxAllowableLoadPerPad_kN * 1000

  const reactions = pads.map((p) => {
    const R = Wtot / 4 + (Mx * p.z) / (sumZ2 || 1) + (Mz * p.x) / (sumX2 || 1)
    const R_clamped = Math.max(0, R) // un pad non può "tirare" il suolo
    const pressure_kPa = R_clamped / padArea / 1000
    const util = R_clamped / maxLoad_N
    return {
      name: p.name,
      reaction_kN: R_clamped / 1000,
      pressure_kPa,
      utilization: util,
    }
  })

  // Margine al ribaltamento: il pad con reazione minore (potenzialmente "negativa")
  // indica la linea di tip-over più caricata.
  const minReaction = Math.min(...reactions.map((r) => r.reaction_kN))
  const tippingMargin = minReaction / (Wtot / 1000 / 4) // 1.0 = uniforme, 0 = ribaltamento imminente

  return { reactions, tippingMargin }
}

// ------------------------------------------------------------------
// API esposta al main thread
// ------------------------------------------------------------------

const api = {
  /**
   * Calcolo di sicurezza completo.
   * @param {object} state  Stato corrente (vedi store/craneStore.js)
   * @param {object} model  Modello gru (es. BR0089.json)
   * @returns {object}
   */
  computeSafety(state, model) {
    const radiusM = computeWorkingRadius(state, model)
    const swl_kg = interpolateSWL(model.loadChart, state.mainBoomAngleDeg, radiusM)
    const loadUtil = swl_kg > 0 ? state.loadKg / swl_kg : Infinity

    const { reactions, tippingMargin } = computeOutriggerReactions(state, model, radiusM)
    const maxPadUtil = Math.max(...reactions.map((r) => r.utilization))

    const { warningThreshold, criticalThreshold } = model.stabilityLimits

    let status = 'safe'
    if (loadUtil >= criticalThreshold || maxPadUtil >= criticalThreshold || tippingMargin <= 0) {
      status = 'critical'
    } else if (loadUtil >= warningThreshold || maxPadUtil >= warningThreshold) {
      status = 'warning'
    }

    return {
      radiusM,
      swl_kg,
      loadUtil,
      reactions,
      maxPadUtil,
      tippingMargin,
      status,
      timestamp: Date.now(),
    }
  },
}

Comlink.expose(api)
