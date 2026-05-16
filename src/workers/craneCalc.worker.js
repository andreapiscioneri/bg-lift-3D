/**
 * Web Worker — calcoli di sicurezza BGLift BR0089.
 *
 * Modello fisico:
 *  • Corpo rigido in equilibrio statico (EN 13000 semplificato)
 *  • Interpolazione bilineare sulla tabella SWL caricata dal JSON ufficiale
 *  • Distribuzione reazioni su 4 stabilizzatori: piastra rigida su 4 molle (Winkler)
 *  • Fattore dinamico φ = 1.10 applicato al carico (EN 13000 §3.3)
 *  • Fattori di sicurezza al ribaltamento e strutturali letti dal JSON
 *
 * Nota: sostituire swl_kg nel file BR0089.json con i valori ufficiali BGLift
 * prima di qualsiasi utilizzo operativo in cantiere.
 */

import * as Comlink from 'comlink'

// ─────────────────────────────────────────────────────────────────
// Costanti e helper matematici
// ─────────────────────────────────────────────────────────────────

const DEG2RAD = Math.PI / 180
const d2r = (d) => d * DEG2RAD
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

function lerp(a, b, t) { return a + (b - a) * t }

/**
 * Trova l'intervallo [i, i+1] in un array monotono crescente tale che
 * xs[i] <= x <= xs[i+1]. Restituisce anche t ∈ [0,1] per l'interpolazione.
 */
function bracketAsc(xs, x) {
  if (x <= xs[0])               return { i: 0, t: 0 }
  if (x >= xs[xs.length - 1])  return { i: xs.length - 2, t: 1 }
  for (let i = 0; i < xs.length - 1; i++) {
    if (x >= xs[i] && x <= xs[i + 1]) {
      return { i, t: (x - xs[i]) / (xs[i + 1] - xs[i]) }
    }
  }
  return { i: 0, t: 0 }
}

/**
 * Trova l'intervallo in un array monotono DECRESCENTE (come angles_deg).
 */
function bracketDesc(xs, x) {
  if (x >= xs[0])               return { i: 0, t: 0 }
  if (x <= xs[xs.length - 1])  return { i: xs.length - 2, t: 1 }
  for (let i = 0; i < xs.length - 1; i++) {
    const hi = xs[i], lo = xs[i + 1]
    if (x <= hi && x >= lo) {
      return { i, t: (hi - x) / (hi - lo) }
    }
  }
  return { i: 0, t: 0 }
}

// ─────────────────────────────────────────────────────────────────
// Tabella SWL — interpolazione bilineare (angolo × raggio)
// ─────────────────────────────────────────────────────────────────

/**
 * Restituisce la portata sicura SWL in kg per la coppia (angleDeg, radiusM).
 * angles_deg decrescente, radii_m crescente, swl_kg[angleIdx][radiusIdx].
 */
function interpolateSWL(loadChart, angleDeg, radiusM) {
  const { angles_deg, radii_m, swl_kg } = loadChart

  const a = bracketDesc(angles_deg, angleDeg)
  const r = bracketAsc(radii_m, radiusM)

  const q11 = swl_kg[a.i    ][r.i    ]
  const q12 = swl_kg[a.i    ][r.i + 1]
  const q21 = swl_kg[a.i + 1][r.i    ]
  const q22 = swl_kg[a.i + 1][r.i + 1]

  return Math.max(0, lerp(lerp(q11, q12, r.t), lerp(q21, q22, r.t), a.t))
}

// ─────────────────────────────────────────────────────────────────
// Cinematica — raggio di lavoro
// ─────────────────────────────────────────────────────────────────

/**
 * Raggio di lavoro orizzontale R dal centro di rotazione della torretta
 * al punto di sospensione del carico (gancio o punta Jib).
 *
 * Geometria:
 *   pivot = (0, pivotHeight, pivotZ) nel frame terreno con rotazione=0
 *   tip   = pivot + boomLen*(sin(rot)*cos(α), sin(α), cos(rot)*cos(α))
 *   R = sqrt(tip.x² + tip.z²) = pivotZ + boomLen*cos(α)   [invariante rispetto a rot]
 *
 * Con Jib articolato:
 *   αjib_assoluto = α_braccio - δjib   (δjib positivo = piega giù rispetto al braccio)
 *   ΔR_jib = jibLen * cos(αjib)
 */
function computeWorkingRadius(state, model) {
  const α     = d2r(state.mainBoomAngleDeg)
  const pivZ  = model.mainBoom.pivot.z        // 0.6 m avanti rispetto al centro torretta

  let R = pivZ + state.mainBoomLengthM * Math.cos(α)

  if (model.jib?.available && state.jibLengthM > 0) {
    const αJib = d2r(state.mainBoomAngleDeg - state.jibAngleDeg)
    R += state.jibLengthM * Math.cos(αJib)
  }

  return Math.max(0.1, R)
}

/**
 * Altezza della punta del braccio (o Jib) sopra il suolo.
 * Non usata per SWL ma esposta per HUD e debug.
 */
function computeTipHeight(state, model) {
  const α    = d2r(state.mainBoomAngleDeg)
  const pivH = model.turret.pivotHeight        // 1.65 m

  let h = pivH + state.mainBoomLengthM * Math.sin(α)

  if (model.jib?.available && state.jibLengthM > 0) {
    const αJib = d2r(state.mainBoomAngleDeg - state.jibAngleDeg)
    h += state.jibLengthM * Math.sin(αJib)
  }

  return h
}

// ─────────────────────────────────────────────────────────────────
// Reazioni sugli stabilizzatori — piastra rigida su 4 molle
// ─────────────────────────────────────────────────────────────────

/**
 * Modello: corpo rigido in equilibrio statico planare (piano x-z).
 *
 * La distribuzione delle reazioni verticali Ri sui 4 pad è:
 *
 *   Ri = W / 4  +  (W·cz · zi) / Σzj²  +  (W·cx · xi) / Σxj²
 *
 * dove (cx, cz) è il baricentro combinato di tutti i componenti
 * proiettato sul piano orizzontale.
 *
 * Baricentri inclusi:
 *   - telaio/autotelaio         (chassis.centerOfGravity, fisso)
 *   - torretta + contrappeso    (turret.centerOfGravity, ruota con torretta)
 *   - braccio principale        (CG al punto medio lungo l'asse del braccio)
 *   - Jib                       (CG approssimato alla punta del braccio principale)
 *   - carico al gancio          (applicato al raggio di lavoro)
 *
 * Il carico viene amplificato dal fattore dinamico φ = stabilityLimits.maxDynamicLoadFactor
 * per rispettare EN 13000.
 */
function computeOutriggerReactions(state, model, radiusM) {
  const g = 9.81
  const { outriggers, chassis, turret, mainBoom, jib, stabilityLimits } = model

  // ── Posizioni effettive dei pad ──────────────────────────────
  const extMap = state.outriggerExtensionM
  const PAD_NAMES = ['frontLeft', 'frontRight', 'rearLeft', 'rearRight']
  const pads = PAD_NAMES.map((name) => {
    const base = outriggers.positions[name]
    const side = Math.sign(base.x) || 1
    return {
      name,
      x: side * (Math.abs(base.x) + (extMap[name] ?? 0)),
      z: base.z,
    }
  })

  // ── Masse ────────────────────────────────────────────────────
  const φ            = stabilityLimits.maxDynamicLoadFactor   // 1.10
  const mChassis     = chassis.totalMass
  const mTurret      = turret.mass                             // include contrappeso
  const mBoom        = mainBoom.sectionMass.reduce((s, m) => s + m, 0)
  const mJib         = (jib?.available && state.jibLengthM > 0) ? jib.mass : 0
  const mLoad        = state.loadKg * φ                        // carico amplificato
  const mTotal       = mChassis + mTurret + mBoom + mJib + mLoad

  // ── Baricentri proiettati a terra (x = laterale, z = longitudinale) ──
  const rotRad  = d2r(state.rotationDeg)
  const sinRot  = Math.sin(rotRad)
  const cosRot  = Math.cos(rotRad)
  const α       = d2r(state.mainBoomAngleDeg)
  const boomH   = state.mainBoomLengthM * Math.cos(α)    // proiezione orizzontale

  // Chassis: fisso
  const cgChassis = { x: chassis.centerOfGravity.x, z: chassis.centerOfGravity.z }

  // Torretta: ruota con la torretta; turret.centerOfGravity nel frame torretta
  const turCGloc = turret.centerOfGravity                 // {x:0, y:1.4, z:0}
  const cgTurret = {
    x: sinRot * turCGloc.z - cosRot * turCGloc.x,        // rotazione 2D
    z: cosRot * turCGloc.z + sinRot * turCGloc.x,
  }

  // Braccio: CG al punto medio dell'asse del braccio (proiezione orizz.)
  const boomMidR = mainBoom.pivot.z + boomH / 2
  const cgBoom   = { x: sinRot * boomMidR, z: cosRot * boomMidR }

  // Jib: CG approssimato alla punta del braccio principale (conservativo)
  const cgJib = { x: sinRot * radiusM, z: cosRot * radiusM }

  // Carico al gancio
  const cgLoad = { x: sinRot * radiusM, z: cosRot * radiusM }

  // CG combinato
  const cx =
    (mChassis * cgChassis.x + mTurret * cgTurret.x +
     mBoom    * cgBoom.x    + mJib    * cgJib.x    + mLoad * cgLoad.x) / mTotal
  const cz =
    (mChassis * cgChassis.z + mTurret * cgTurret.z +
     mBoom    * cgBoom.z    + mJib    * cgJib.z    + mLoad * cgLoad.z) / mTotal

  // ── Distribuzione reazioni (piastra rigida di Winkler) ───────
  const W     = mTotal * g                              // N — peso totale
  const Mx    = W * cz                                  // momento attorno a X (causa tip avanti/dietro)
  const Mz    = W * cx                                  // momento attorno a Z (causa tip laterale)
  const sumZ2 = pads.reduce((s, p) => s + p.z * p.z, 0) || 1
  const sumX2 = pads.reduce((s, p) => s + p.x * p.x, 0) || 1

  const padArea    = outriggers.padArea_m2
  const maxLoad_N  = outriggers.maxAllowableLoadPerPad_kN * 1000

  const reactions = pads.map((p) => {
    const R_raw     = W / 4 + (Mx * p.z) / sumZ2 + (Mz * p.x) / sumX2
    const R_clamped = Math.max(0, R_raw)
    return {
      name:         p.name,
      reaction_kN:  R_clamped / 1000,
      reaction_raw_kN: R_raw / 1000,    // incluso il valore negativo per tipping check
      pressure_kPa: R_clamped / padArea / 1000,
      utilization:  R_clamped / maxLoad_N,
    }
  })

  // ── Margine al ribaltamento ──────────────────────────────────
  // EN 13000: la gru deve mantenere un fattore di stabilità ≥ 1.25
  // Qui calcoliamo: minReaction / (W/4)
  //   > 1  → carico uniformemente distribuito (ottimale)
  //   = 0  → un pad sta per sollevarsi (limite ribaltamento)
  //   < 0  → ribaltamento (il pad dovrebbe essere ancorato)
  const minRaw        = Math.min(...reactions.map((r) => r.reaction_raw_kN))
  const meanReact_kN  = W / 4 / 1000
  const tippingMargin = minRaw / meanReact_kN   // 0 = limite, >0 = stabile, <0 = ribaltamento

  return { reactions, tippingMargin, cx, cz }
}

// ─────────────────────────────────────────────────────────────────
// API esposta al main thread via Comlink
// ─────────────────────────────────────────────────────────────────

const api = {
  /**
   * Calcolo di sicurezza completo.
   * @param {object} state   configurazione corrente (da craneStore)
   * @param {object} model   dati gru (BR0089.json)
   * @returns {object}
   */
  computeSafety(state, model) {
    const radiusM  = computeWorkingRadius(state, model)
    const tipHeightM = computeTipHeight(state, model)
    const swl_kg   = interpolateSWL(model.loadChart, state.mainBoomAngleDeg, radiusM)

    // Utilizzo del carico (senza φ — il carico reale vs SWL nominale)
    const loadUtil = swl_kg > 0 ? state.loadKg / swl_kg : Infinity

    const { reactions, tippingMargin, cx, cz } =
      computeOutriggerReactions(state, model, radiusM)

    const maxPadUtil = Math.max(...reactions.map((r) => r.utilization))

    const { warningThreshold, criticalThreshold, tippingLineSafetyFactor } = model.stabilityLimits

    // Soglie di ribaltamento: warning quando il margine scende sotto (1 - 1/SF)
    // con SF = tippingLineSafetyFactor (1.25 da EN 13000)
    const tippingWarnThreshold     =  1 - 1 / tippingLineSafetyFactor  // ≈ 0.20
    const tippingCriticalThreshold =  0                                  // pad a zero → ribaltamento

    let status = 'safe'

    if (
      loadUtil        >= criticalThreshold ||
      maxPadUtil      >= criticalThreshold ||
      tippingMargin   <= tippingCriticalThreshold
    ) {
      status = 'critical'
    } else if (
      loadUtil        >= warningThreshold  ||
      maxPadUtil      >= warningThreshold  ||
      tippingMargin   <= tippingWarnThreshold
    ) {
      status = 'warning'
    }

    return {
      radiusM,
      tipHeightM,
      swl_kg,
      loadUtil,
      reactions,
      maxPadUtil,
      tippingMargin,
      cgX: cx,
      cgZ: cz,
      status,
      timestamp: Date.now(),
    }
  },
}

Comlink.expose(api)
