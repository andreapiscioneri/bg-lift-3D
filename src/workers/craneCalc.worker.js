/**
 * Web Worker — calcoli di sicurezza BGLift BR0089 / M250.
 *
 * Modello fisico:
 *  • Carico sollevato (limite idraulico): formule e costanti riprodotte 1:1
 *    dall'Excel BGLift "Calcolo carico sollevato M250" (vedi
 *    model.liftCalculation in BR0089.json) — equilibrio dei momenti attorno
 *    alla cerniera torre/braccio O: (braccio_cilindri × forza_cilindri −
 *    momento_pesi_propri) / distanza_orizzontale_gancio.
 *  • Distribuzione reazioni su 4 stabilizzatori: piastra rigida su 4 molle
 *    (Winkler) — ancora approssimata, NON da documenti BGLift.
 *  • Fattore dinamico φ = 1.10 applicato al carico (EN 13000 §3.3)
 */

import * as Comlink from 'comlink'

// ─────────────────────────────────────────────────────────────────
// Costanti e helper matematici
// ─────────────────────────────────────────────────────────────────

const DEG2RAD = Math.PI / 180
const d2r = (d) => d * DEG2RAD
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// ─────────────────────────────────────────────────────────────────
// Carico sollevato — formule dell'Excel BGLift (celle C34..C39)
// ─────────────────────────────────────────────────────────────────

/**
 * Riproduce il foglio "Carico sollevato": coordinate in mm nel piano
 * verticale del braccio, origine O = cerniera torre/braccio, braccio a 0°.
 * Ingressi variabili (come nell'Excel): angolo braccio (°), corsa dei
 * cilindri di sfilo (mm, uguale per le 3 sezioni mobili; il gancio avanza di
 * 3 × corsa) e pressioni fondello/stelo (bar).
 */
function computeLiftCapacity(angleDeg, strokeMm, L, pressures = {}) {
  const α = d2r(angleDeg)
  const s = clamp(strokeMm, 0, L.strokeMax_mm)

  // C34 — braccio dei cilindri: distanza di O dalla retta per A (cerniera
  // torre/cilindri, fissa) e B' (cerniera braccio/cilindri ruotata di α).
  const [ax, ay] = L.cylTurret_mm
  const [bx, by] = L.cylBoom_mm
  const rB = Math.hypot(bx, by)
  const aB = Math.atan(by / bx)
  const bxr = rB * Math.cos(α + aB)
  const byr = rB * Math.sin(α + aB)
  const slope = (ay - byr) / (ax - bxr)
  const cylArm_mm = Math.abs(ay - slope * ax) / Math.sqrt(1 + slope * slope)

  // C35 — forza dei cilindri di sollevamento (kg): spinta al fondello meno
  // contropressione sulla corona lato stelo. Pressioni dalla configurazione
  // corrente, con fallback ai valori nominali del modello.
  const { count, bore_mm, rod_mm, pressureBore_bar, pressureRod_bar } = L.cylinders
  const pBore = pressures.boreBar ?? pressureBore_bar
  const pRod = pressures.rodBar ?? pressureRod_bar
  const rb = bore_mm / 2, rr = rod_mm / 2
  const cylForce_kg =
    count * ((rb * rb * Math.PI * pBore) -
             ((rb * rb - rr * rr) * Math.PI * pRod)) / (10 * 9.81)

  // C36 — momento dei pesi propri (kg·mm): ogni sezione col proprio
  // baricentro, traslato di extendsWithStroke × corsa lungo il braccio.
  let selfMoment_kgmm = 0
  for (const sec of L.sections) {
    const x = sec.cg_mm[0] + sec.extendsWithStroke * s
    const y = sec.cg_mm[1]
    selfMoment_kgmm += Math.hypot(x, y) * Math.cos(α + Math.atan(y / x)) * sec.mass_kg
  }

  // C37 — distanza orizzontale del gancio da O (mm).
  const hx = L.hook_mm[0] + L.hookExtendsWithStroke * s
  const hy = L.hook_mm[1]
  const hookHoriz_mm = Math.hypot(hx, hy) * Math.cos(α + Math.atan(hy / hx))
  // Proiezione verticale del gancio rispetto a O (non nell'Excel; serve solo
  // per l'altezza punta nell'HUD).
  const hookVert_mm = Math.hypot(hx, hy) * Math.sin(α + Math.atan(hy / hx))

  // C39 — carico sollevato (kg).
  const capacity_kg = (cylArm_mm * cylForce_kg - selfMoment_kgmm) / hookHoriz_mm

  return { capacity_kg, hookHoriz_mm, hookVert_mm, cylArm_mm, cylForce_kg, selfMoment_kgmm }
}

// ─────────────────────────────────────────────────────────────────
// Portata con jib — PLACEHOLDER (dati BGLift non ancora disponibili)
// ─────────────────────────────────────────────────────────────────

/**
 * Limite di carico alla punta del jib. L'Excel/DWG "Calcolo carico sollevato
 * M250" copre solo il braccio: le formule del jib (2 sfili telescopici,
 * bielle di articolazione) non sono ancora state fornite. Quando arriveranno
 * andranno in `model.jib.liftCalculation` (stessa filosofia di
 * `model.liftCalculation`) e questa funzione dovrà restituire la portata
 * ammessa alla punta; la SWL effettiva diventerà min(braccio, jib).
 * Finché restituisce null il jib incide solo sulla cinematica
 * (computeWorkingRadius / computeTipHeight), non sul limite di carico.
 */
function computeJibLiftCapacity(state, model, lift) {
  if (!model.jib?.available || !(state.jibLengthM > 0)) return null
  if (!model.jib.liftCalculation) return null // TODO: formule jib BGLift
  return null
}

// ─────────────────────────────────────────────────────────────────
// Cinematica — raggio di lavoro e altezza gancio
// ─────────────────────────────────────────────────────────────────

/**
 * Raggio orizzontale dal centro ralla al gancio (o alla punta del jib).
 * La cerniera O sta pivot.z metri rispetto all'asse ralla (negativo =
 * arretrata); la distanza orizzontale O→gancio viene dal calcolo Excel.
 *
 * Con Jib articolato:
 *   αjib_assoluto = α_braccio - δjib   (δjib positivo = piega giù rispetto al braccio)
 */
function computeWorkingRadius(state, model, lift) {
  let R = model.mainBoom.pivot.z + lift.hookHoriz_mm / 1000

  if (model.jib?.available && state.jibLengthM > 0) {
    const αJib = d2r(state.mainBoomAngleDeg - state.jibAngleDeg)
    R += state.jibLengthM * Math.cos(αJib)
  }

  return Math.max(0.1, R)
}

/**
 * Altezza del gancio (o punta Jib) sopra il suolo — per HUD e debug.
 */
function computeTipHeight(state, model, lift) {
  let h = model.mainBoom.pivot.y + lift.hookVert_mm / 1000

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
/**
 * Posizioni effettive dei pad rispetto all'asse ralla.
 *
 * Con `outriggers.legGeometry` (M250, dal DWG top-view BGLift "apertura
 * gambe 0/22/45"): perno verticale gamba a pivotLatM dall'asse macchina e
 * pivotLongFront/RearM dall'asse ralla; distanza perno→piede
 * R(ginocchio) = kneePivotM + shinM·cos(ginocchio). Verificato 1:1 sulle
 * quote del DWG (1117/1268/1821/2106 laterali, 1896/2181/2361 long.).
 * "Alt. piede" = adattamento a un appoggio più alto: il piede resta
 * comunque appoggiato e portante; l'alzata (rotazione dell'intera gamba
 * attorno al perno orizzontale) accorcia solo la proiezione orizzontale
 * del piede di cos(asin(h / luffToFootM)).
 *
 * Senza legGeometry: fallback storico H-frame (positions + estensioni).
 */
function computePadPositions(state, outriggers) {
  const PAD_NAMES = ['frontLeft', 'frontRight', 'rearLeft', 'rearRight']
  const g = outriggers.legGeometry
  if (!g) {
    const extMap = state.outriggerExtensionM ?? {}
    return PAD_NAMES.map((name) => {
      const base = outriggers.positions[name]
      const side = Math.sign(base.x) || 1
      return {
        name,
        x: side * (Math.abs(base.x) + (extMap[name] ?? 0)),
        z: base.z,
      }
    })
  }
  return PAD_NAMES.map((name) => {
    const front = name.startsWith('front')
    const left = name.endsWith('Left')
    const apertura = d2r(clamp(state.outriggerAngleDeg?.[name] ?? 45, 0, 45))
    const ginocchio = d2r(clamp(state.outriggerKneeDeg?.[name] ?? 0, 0, 47))
    const liftM = Math.max(0, state.outriggerFootLiftM?.[name] ?? 0)
    const luffCos = Math.cos(Math.asin(Math.min(1, liftM / (g.luffToFootM ?? 2.15))))
    const R = (g.kneePivotM + g.shinM * Math.cos(ginocchio)) * luffCos
    return {
      name,
      x: (left ? -1 : 1) * (g.pivotLatM + R * Math.sin(apertura)),
      z: (front ? g.pivotLongFrontM : g.pivotLongRearM) + (front ? 1 : -1) * R * Math.cos(apertura),
    }
  })
}

function computeOutriggerReactions(state, model, radiusM) {
  const g = 9.81
  const { outriggers, chassis, turret, mainBoom, jib, stabilityLimits } = model

  // ── Posizioni effettive dei pad ──────────────────────────────
  const pads = computePadPositions(state, outriggers)

  // ── Masse ────────────────────────────────────────────────────
  const φ            = stabilityLimits.maxDynamicLoadFactor   // 1.10
  const mChassis     = chassis.totalMass
  const mTurret      = turret.mass                             // include contrappeso
  const mBoom        = model.liftCalculation.sections.reduce((s, sec) => s + sec.mass_kg, 0)
  const mJib         = (jib?.available && state.jibLengthM > 0) ? jib.mass : 0
  const mLoad        = state.loadKg * φ                        // carico amplificato
  const mTotal       = mChassis + mTurret + mBoom + mJib + mLoad

  // ── Baricentri proiettati a terra (x = laterale, z = longitudinale) ──
  const rotRad  = d2r(state.rotationDeg)
  const sinRot  = Math.sin(rotRad)
  const cosRot  = Math.cos(rotRad)
  // Proiezione orizzontale del braccio ≈ raggio di lavoro (gancio).
  const boomH   = radiusM

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

  // ── Distribuzione reazioni (piastra rigida su molle) ─────────
  // In coordinate baricentriche dei pad: vale anche per footprint
  // asimmetrici (gambe con aperture/ginocchia diverse), dove la vecchia
  // forma W/4 + M·zi/Σz² presupponeva pads simmetrici alla ralla.
  // Tutti i piedi si assumono appoggiati (un piede "alzato" poggia su un
  // appoggio più alto): la forza cambia solo tramite la geometria dei pad.
  const W = mTotal * g                                  // N — peso totale
  const n = pads.length

  const padArea    = outriggers.padArea_m2
  const maxLoad_N  = outriggers.maxAllowableLoadPerPad_kN * 1000

  const xbar = pads.reduce((s, p) => s + p.x, 0) / n
  const zbar = pads.reduce((s, p) => s + p.z, 0) / n
  const Sx2  = pads.reduce((s, p) => s + (p.x - xbar) ** 2, 0) || 1
  const Sz2  = pads.reduce((s, p) => s + (p.z - zbar) ** 2, 0) || 1

  const reactions = pads.map((p) => {
    const R_raw = W * (1 / n + ((cx - xbar) * (p.x - xbar)) / Sx2 + ((cz - zbar) * (p.z - zbar)) / Sz2)
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
  // Qui calcoliamo: minReaction / (W/n)
  //   > 1  → carico uniformemente distribuito (ottimale)
  //   = 0  → un pad sta per sollevarsi (limite ribaltamento)
  //   < 0  → ribaltamento (il pad dovrebbe essere ancorato)
  const minRaw        = Math.min(...reactions.map((r) => r.reaction_raw_kN))
  const meanReact_kN  = W / n / 1000
  const tippingMargin = minRaw / meanReact_kN

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
    // Formule Excel BGLift: angolo braccio + corsa cilindri sfilo → carico max.
    const lift = computeLiftCapacity(
      state.mainBoomAngleDeg,
      (state.boomStrokeM ?? 0) * 1000,
      model.liftCalculation,
      { boreBar: state.pressureBoreBar, rodBar: state.pressureRodBar },
    )
    const radiusM  = computeWorkingRadius(state, model, lift)
    const tipHeightM = computeTipHeight(state, model, lift)
    // SWL = limite braccio, eventualmente ridotto dal limite jib quando le
    // formule saranno disponibili (oggi computeJibLiftCapacity → null).
    const jibCapacity_kg = computeJibLiftCapacity(state, model, lift)
    const swl_kg = Math.max(0, jibCapacity_kg != null
      ? Math.min(lift.capacity_kg, jibCapacity_kg)
      : lift.capacity_kg)

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
