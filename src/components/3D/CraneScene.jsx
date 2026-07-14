import { Suspense, useRef, useEffect, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, ContactShadows, Environment, Html, useGLTF } from '@react-three/drei'
import { useCraneStore } from '../../store/craneStore'

// ─────────────────────────────────────────────────────────────────
// Modello CAD reale — "Assieme completo M250" (macchina intera, da STEP).
// Due soli sotto-assiemi nel CAD: parte bassa (carro cingolato + stabilizzatori)
// e parte aerea (colonna + braccio). Unità native già in metri, asse Y verticale.
// I nomi nel GLB contengono spazi; GLTFLoader li converte in underscore.
// ─────────────────────────────────────────────────────────────────

const MACHINE_MODEL_URL = '/models/m250.glb'
const MACHINE_AEREA_NODE = 'Assieme_parte_aerea_M250'
const MACHINE_BASSA_NODE = 'Assieme_parte_bassa_M250'
// Quota minima nativa (appoggio cingoli a y = -2.04) — serve per posare la macchina a terra.
const MACHINE_GROUND_Y = -2.04
// Asse ralla stimato (X,Z nativi): centro XZ del carro; Z coincide col piano
// di simmetria del braccio (mesh LM03xx tutte centrate a z = -0.27). Da tarare
// se la rotazione torretta risultasse eccentrica.
const MACHINE_SLEW_X = -2.66
const MACHINE_SLEW_Z = -0.27

// ── Cinematica braccio/jib (coordinate native XY, il braccio giace nel piano
// di simmetria z ≈ -0.27) ──────────────────────────────────────────────────
// Il STEP completo non ha gruppi annidati per il braccio: le 356 mesh della
// parte aerea vengono ripartite a runtime per geometria in colonna / braccio /
// jib. I quattro bracci telescopici (LM0286/87, LM0303/04, LM0316/17,
// LM0326/27) ruotano insieme come pacco rigido attorno al perno di base —
// così per costruzione non possono collidere tra loro.
// Perno base braccio: boccole LM0296/LM0501 in testa alla forcella della colonna.
const BOOM_PIN = [-3.45, 0.05]
// Perno jib: boccole LM0356/LM0358 sulla testa del braccio.
const JIB_PIN = [-0.72, 1.58]
// Inclinazione del braccio nella posa CAD = atan2(JIB_PIN-BOOM_PIN) ≈ 29.3°.
// Nella posa CAD il jib è orizzontale, quindi la sua piega relativa al
// braccio coincide con lo stesso valore.
const BOOM_CAD_ANGLE_DEG = 29.3
const JIB_CAD_BEND_DEG = 29.3
// Distanza gancio↔cerniera O a sfilo zero (m) — |(2662.54, -372.63)| mm
// dall'Excel BGLift; usata dall'handle di drag per convertire in corsa.
const HOOK_BASE_LEN_M = 2.688

// Direzione di scorrimento degli sfili nella posa CAD: asse longitudinale
// reale delle sezioni telescopiche, misurato con una PCA sui vertici delle
// piastre LM03xx (≈36°, coerente su tutte e quattro le sezioni). NON è la
// linea BOOM_PIN→JIB_PIN (~29°): usare quella faceva "scendere" gli sfili
// sotto asse man mano che uscivano.
const BOOM_SLIDE_ANGLE_DEG = 36.0
const BOOM_AXIS = [Math.cos(BOOM_SLIDE_ANGLE_DEG * Math.PI / 180), Math.sin(BOOM_SLIDE_ANGLE_DEG * Math.PI / 180)]

// Corsa massima (unità native = metri) di ogni singolo sfilo — 2150 mm per
// cilindro dall'Excel BGLift "Calcolo carico sollevato M250". Lo sfilo è
// uniforme: la sezione i-esima trasla di i × frazione × corsa lungo l'asse.
const BOOM_SECTION_STROKE = 2.15

// Ripartizione delle mesh della parte aerea. Il CAD numera i pezzi del braccio
// per sezione di appartenenza: LM0286–0302 = 1ª sezione (fissa, col
// martinetto), LM0303–0315 = 2ª, LM0316–0325 = 3ª, LM0326–0345 = 4ª (con
// testa/snodo). Il jib e i pezzi non numerati si classificano per geometria;
// ciò che resta vicino all'asse del braccio (martinetto compreso) va con la
// 1ª sezione, tutto il resto con la colonna.
function classifyAereaMesh(name, cx, cy) {
  if (cy > 1.28 && cx > -0.87) return 'jib'
  const m = /^LM0(\d{3})$/.exec(name)
  if (m) {
    const n = Number(m[1])
    if (n >= 286 && n <= 302) return 'boomBase'
    if (n >= 303 && n <= 315) return 'sfilo1'
    if (n >= 316 && n <= 325) return 'sfilo2'
    if (n >= 326 && n <= 345) return 'sfilo3'
  }
  if (cy > 1.25 && cx > -1.40) return 'sfilo3' // testa/snodo, solidale alla 4ª sezione
  // Fondo del piede del braccio (zona dietro/sotto il perno): coperchio
  // inferiore del braccio (CR0082 + piastrina LM2492) e tappo inferiore del
  // martinetto con perno, ghiera, guarnizioni Ø90 e sensore (F0997, GH0183,
  // P0704, SE0005/6, TAPPO12X1FAVV, …) — sono montati sul braccio e devono
  // seguirne l'angolo. La culla della colonna resta fuori (i suoi centri
  // stanno tutti a x > -3.2).
  if (cx > -3.78 && cx < -3.30 && cy > -0.55 && cy < 0.32) return 'boomBase'
  // distanza dall'asse del braccio (da BOOM_PIN verso JIB_PIN)
  const [ax, ay] = BOOM_PIN
  const abx = JIB_PIN[0] - ax, aby = JIB_PIN[1] - ay
  const t = ((cx - ax) * abx + (cy - ay) * aby) / (abx * abx + aby * aby)
  const d = Math.hypot(cx - (ax + t * abx), cy - (ay + t * aby))
  if (t > 0.0 && t < 1.1 && d < 0.35) return 'boomBase'
  return 'colonna'
}

// ── Gambe stabilizzatrici (parte bassa) ─────────────────────────────────────
// Ogni gamba (assieme SU00xx nel CAD) è composta da:
//   torretta (LM0533–0539, con le boccole LM0510/BC0031 del perno orizzontale)
//   → braccio diagonale (part_6xx + cilindro Camicia/Stelo_MR0006)
//   → ginocchio → piede (LM0516/0519).
// L'APERTURA ruota l'intera gamba (torretta compresa) attorno al perno
// VERTICALE con cui la torretta è imperniata al telaio (swingPivot, tappi
// part_66x): 45° = aperta a ragno (posa CAD), 0° = ripiegata parallela
// all'asse macchina. Le anteriori ripiegano in avanti (+X) e le posteriori
// indietro (-X), quindi entro 0–45° non possono collidere.
// L'ALZATA PIEDE ruota solo braccio+piede attorno al perno ORIZZONTALE sulla
// torretta (luffPivot = boccole LM0510/BC0031, quota LEG_LUFF_PIVOT_Y).
// armRef = riferimento storico per il test di appartenenza del braccio;
// dir = direzione della gamba aperta; foldSign = verso della rotazione Y di chiusura.
const MACHINE_LEGS = [
  { id: 'frontLeft',  armRef: [-1.97,  0.36], swingPivot: [-2.25,  0.07], luffPivot: [-2.06,  0.26], dir: [ 0.707,  0.707], foldSign:  1 },
  { id: 'frontRight', armRef: [-1.97, -0.90], swingPivot: [-2.25, -0.61], luffPivot: [-2.06, -0.80], dir: [ 0.707, -0.707], foldSign: -1 },
  { id: 'rearLeft',   armRef: [-3.35,  0.36], swingPivot: [-3.07,  0.07], luffPivot: [-3.26,  0.26], dir: [-0.707,  0.707], foldSign: -1 },
  { id: 'rearRight',  armRef: [-3.35, -0.90], swingPivot: [-3.07, -0.61], luffPivot: [-3.26, -0.80], dir: [-0.707, -0.707], foldSign:  1 },
]
export const LEG_OPEN_DEG = 45
// Lunghezza utile della gamba dal perno al piatto d'appoggio (per il test di
// appartenenza lungo l'asse) e raggio del "tubo" attorno all'asse.
const LEG_REACH = 2.05
const LEG_RADIUS = 0.5

// ── Sollevamento piede = alzata del braccio gamba ───────────────────────────
// Come sulla macchina reale: per staccare un piede da terra il cilindro della
// gamba ruota braccio+piede (NON la torretta) verso l'alto attorno al perno
// orizzontale sulla torretta. "Alt. piede" è il sollevamento verticale del
// piatto (m); l'angolo di alzata corrispondente è asin(h / LEG_LUFF_TO_FOOT),
// dato che il piatto sta a ~LEG_LUFF_TO_FOOT dal perno orizzontale.
export const FOOT_LIFT_MAX = 0.35 // sollevamento verticale massimo del piede (m)
const LEG_LUFF_TO_FOOT = 2.15
// Quota nativa (Y) del perno orizzontale sulla torretta (boccole LM0510/BC0031).
const LEG_LUFF_PIVOT_Y = -1.14
// Il gruppo piede (tubo interno LM0519 + piatto PO0004/PR0088) resta separato
// per una futura regolazione fine: oltre il ginocchio (t > 0.6) e sotto quota
// -1.60 (il fodero esterno LM0516 arriva a y ≈ -1.57 e resta col braccio).
const FOOT_T_MIN = 0.6
const FOOT_Y_MAX = -1.6

// Famiglie di pezzi del carro (cingoli, telaio, tendicingolo, minuteria) che
// non appartengono mai alle gambe anche se ricadono vicino al loro asse.
const CARRO_NAME_RE = /^(N6672|3RG|3c|3ac|3ct|3p|3M|vite|OCCHIO|rondella|VITE|seeger|Valvola)/i

// Torretta della gamba: corpo LM0533–0539 più boccole/puntale del perno
// orizzontale (LM0510, BC0031, BH0014) — agganciati per nome perché si
// intrecciano geometricamente col telaio. La testa posteriore del cilindro
// gamba (TF1_MR0006) sta col braccio.
const LEG_TOWER_RE = /^(LM053[3-9]|LM0510|BC0031|BH0014)/
const LEG_ARM_EXTRA_RE = /^TF1_MR0006/

function classifyBassaMesh(name, cx, cy, cz) {
  if (!CARRO_NAME_RE.test(name)) {
    for (const leg of MACHINE_LEGS) {
      const rx = cx - leg.armRef[0], rz = cz - leg.armRef[1]
      const t = (rx * leg.dir[0] + rz * leg.dir[1]) / LEG_REACH
      const d = Math.abs(rx * leg.dir[1] - rz * leg.dir[0])
      if (t > -0.05 && t < 1.15 && d < LEG_RADIUS) {
        return t > FOOT_T_MIN && cy < FOOT_Y_MAX ? `${leg.id}:piede` : leg.id
      }
      if (LEG_ARM_EXTRA_RE.test(name) && t > -0.3 && t < 0.1 && d < 0.3) {
        return leg.id
      }
      if (LEG_TOWER_RE.test(name) && t > -0.5 && t < 0.15 && d < 0.45) {
        return `${leg.id}:torre`
      }
      // Tappi del perno verticale (part_66x): piccoli pezzi sull'asse dello
      // swingPivot, sopra il piano dei cingoli.
      if (cy > -1.3 && Math.hypot(cx - leg.swingPivot[0], cz - leg.swingPivot[1]) < 0.12) {
        return `${leg.id}:torre`
      }
    }
  }
  return 'carro'
}

useGLTF.preload(MACHINE_MODEL_URL)

// Macchina completa: la parte bassa resta fissa a terra, la parte aerea ruota
// con "Rotazione torretta" attorno all'asse verticale della ralla; il braccio
// (pacco delle 4 sezioni + testa + jib) ruota attorno a BOOM_PIN con "Angolo"
// e il jib attorno a JIB_PIN con "Angolo jib". Il modello è traslato in modo
// che l'asse ralla coincida con l'origine del mondo.
function MachineCadModel({ rotationDeg, boomAngleDeg, jibAngleDeg, extensionFrac, legAngles = {}, footLifts = {} }) {
  // URL del GLB dal modello caricato (progetto) — fallback sul m250 storico.
  const glbUrl = useCraneStore((s) => s.model?.glbUrl) || MACHINE_MODEL_URL
  const { scene } = useGLTF(glbUrl)

  const { carro, legs, colonna, boomBase, sfilo1, sfilo2, sfilo3, jib } = useMemo(() => {
    const pick = (name) => {
      const node = scene.getObjectByName(name)
      if (!node) return null
      const clone = node.clone(true)
      clone.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true
          obj.receiveShadow = true
        }
      })
      return clone
    }
    const partition = (root, classify) => {
      const groups = {}
      if (!root) return groups
      const meshes = []
      root.traverse((obj) => { if (obj.isMesh) meshes.push(obj) })
      for (const mesh of meshes) {
        mesh.geometry.computeBoundingBox()
        const bb = mesh.geometry.boundingBox
        const cls = classify(mesh.name, bb)
        ;(groups[cls] ??= new THREE.Group()).add(mesh)
      }
      return groups
    }

    const aereaGroups = partition(pick(MACHINE_AEREA_NODE), (name, bb) =>
      classifyAereaMesh(name, (bb.min.x + bb.max.x) / 2, (bb.min.y + bb.max.y) / 2))
    const bassaGroups = partition(pick(MACHINE_BASSA_NODE), (name, bb) =>
      classifyBassaMesh(name, (bb.min.x + bb.max.x) / 2, (bb.min.y + bb.max.y) / 2, (bb.min.z + bb.max.z) / 2))

    const empty = () => new THREE.Group()
    const result = buildResult()
    // Handle di debug per ispezionare/tarare la partizione da console (solo dev).
    if (import.meta.env.DEV) window.__machine = result
    return result

    function buildResult() { return {
      carro: bassaGroups.carro ?? empty(),
      legs: MACHINE_LEGS.map((leg) => ({
        ...leg,
        tower: bassaGroups[`${leg.id}:torre`] ?? empty(),
        object: bassaGroups[leg.id] ?? empty(),
        foot: bassaGroups[`${leg.id}:piede`] ?? empty(),
      })),
      colonna: aereaGroups.colonna ?? empty(),
      boomBase: aereaGroups.boomBase ?? empty(),
      sfilo1: aereaGroups.sfilo1 ?? empty(),
      sfilo2: aereaGroups.sfilo2 ?? empty(),
      sfilo3: aereaGroups.sfilo3 ?? empty(),
      jib: aereaGroups.jib ?? empty(),
    } }
  }, [scene])

  const recenter = [-MACHINE_SLEW_X, 0, -MACHINE_SLEW_Z]
  // Rotazioni relative alla posa CAD; elevazione positiva = punta in su (asse
  // z nativo). Piega jib positiva = jib in giù, da cui il segno invertito.
  const boomRad = d2r(boomAngleDeg - BOOM_CAD_ANGLE_DEG)
  const jibRad = -d2r(jibAngleDeg - JIB_CAD_BEND_DEG)
  // Sfilo uniforme: la sezione i-esima trasla di i × passo lungo l'asse del
  // braccio (in coordinate solidali al braccio già ruotato).
  const step = clamp(extensionFrac, 0, 1) * BOOM_SECTION_STROKE
  const slide = (i) => [BOOM_AXIS[0] * step * i, BOOM_AXIS[1] * step * i, 0]

  return (
    <group position={[0, -MACHINE_GROUND_Y, 0]}>
      <group position={recenter}>
        <primitive object={carro} />
        {legs.map((leg) => {
          const apertura = clamp(legAngles[leg.id] ?? LEG_OPEN_DEG, 0, LEG_OPEN_DEG)
          const rotY = leg.foldSign * d2r(LEG_OPEN_DEG - apertura)
          // Alzata piede: braccio+piede (NON la torretta) ruotano attorno al
          // perno orizzontale sulla torretta, perpendicolare alla direzione
          // della gamba, finché il piatto sale di h.
          const h = clamp(footLifts[leg.id] ?? 0, 0, FOOT_LIFT_MAX)
          const luffAxis = new THREE.Vector3(-leg.dir[1], 0, leg.dir[0])
          const luffQuat = new THREE.Quaternion().setFromAxisAngle(luffAxis, Math.asin(h / LEG_LUFF_TO_FOOT))
          return (
            <group key={leg.id} position={[leg.swingPivot[0], 0, leg.swingPivot[1]]} rotation={[0, rotY, 0]}>
              <group position={[-leg.swingPivot[0], 0, -leg.swingPivot[1]]}>
                <primitive object={leg.tower} />
                <group position={[leg.luffPivot[0], LEG_LUFF_PIVOT_Y, leg.luffPivot[1]]}>
                  <group quaternion={luffQuat}>
                    <group position={[-leg.luffPivot[0], -LEG_LUFF_PIVOT_Y, -leg.luffPivot[1]]}>
                      <primitive object={leg.object} />
                      <primitive object={leg.foot} />
                    </group>
                  </group>
                </group>
              </group>
            </group>
          )
        })}
      </group>
      <group rotation={[0, -d2r(rotationDeg), 0]}>
        <group position={recenter}>
          <primitive object={colonna} />
          <group position={[BOOM_PIN[0], BOOM_PIN[1], 0]} rotation={[0, 0, boomRad]}>
            <group position={[-BOOM_PIN[0], -BOOM_PIN[1], 0]}>
              <primitive object={boomBase} />
              <group position={slide(1)}>
                <primitive object={sfilo1} />
              </group>
              <group position={slide(2)}>
                <primitive object={sfilo2} />
              </group>
              <group position={slide(3)}>
                <primitive object={sfilo3} />
                <group position={[JIB_PIN[0], JIB_PIN[1], 0]} rotation={[0, 0, jibRad]}>
                  <group position={[-JIB_PIN[0], -JIB_PIN[1], 0]}>
                    <primitive object={jib} />
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────
// Canvas root
// ─────────────────────────────────────────────────────────────────

export default function CraneScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [16, 11, 16], fov: 42, near: 0.1, far: 200 }}
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <SceneInner />
    </Canvas>
  )
}

function SceneInner() {
  const isDragging = useCraneStore((s) => s.isDragging)

  return (
    <>
      <color attach="background" args={['#ffffff']} />
      <fog attach="fog" args={['#ffffff', 35, 100]} />

      <hemisphereLight args={['#ffffff', '#e8e8e8', 0.6]} />
      <directionalLight position={[12, 20, 8]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-8, 10, -6]} intensity={0.35} />

      {/* OrbitControls disabilitato durante il drag dei handles */}
      <OrbitControls
        makeDefault
        enabled={!isDragging}
        enableDamping
        dampingFactor={0.08}
        minDistance={6}
        maxDistance={55}
        maxPolarAngle={Math.PI / 2 - 0.04}
        target={[0, 2, 0]}
      />

      <Suspense fallback={<Html center><span className="text-black/60 text-sm">Caricamento…</span></Html>}>
        <Environment preset="city" />
        <Ground />
        <CraneAssembly />
        <InteractiveLayer />
      </Suspense>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────
// Ground
// ─────────────────────────────────────────────────────────────────

function Ground() {
  return (
    <>
      <Grid args={[80, 80]} cellSize={1} cellThickness={0.5} cellColor="#e5e5e5"
        sectionSize={5} sectionThickness={1} sectionColor="#bdbdbd"
        fadeDistance={60} fadeStrength={1} followCamera={false} infiniteGrid />
      <ContactShadows position={[0, 0.01, 0]} opacity={0.28} scale={50} blur={2.8} far={25} />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────
// Crane assembly (passivo — solo rendering)
// ─────────────────────────────────────────────────────────────────

function CraneAssembly() {
  const model  = useCraneStore((s) => s.model)
  const config = useCraneStore((s) => s.config)

  // Macchina completa (m250.glb): torretta, braccio, sfilo e jib sono
  // articolati internamente al modello. "Corsa sfilo" (m per cilindro) è la
  // stessa grandezza dell'Excel di calcolo: frazione = corsa / corsa max.
  const extensionFrac = config.boomStrokeM / model.mainBoom.strokeMaxM

  return (
    <MachineCadModel
      rotationDeg={config.rotationDeg}
      boomAngleDeg={config.mainBoomAngleDeg}
      jibAngleDeg={config.jibAngleDeg}
      extensionFrac={extensionFrac}
      legAngles={config.outriggerAngleDeg}
      footLifts={config.outriggerFootLiftM}
    />
  )
}

// ─────────────────────────────────────────────────────────────────
// Direct Manipulation — handles interattivi
// ─────────────────────────────────────────────────────────────────

/**
 * Layer separato che contiene tutti i drag handles e il relativo HUD.
 * I window-level pointermove/pointerup sono registrati una sola volta qui
 * e smistano l'evento in base a `activeDrag.current.type`.
 */
function InteractiveLayer() {
  const { camera, gl } = useThree()
  const model       = useCraneStore((s) => s.model)
  const config      = useCraneStore((s) => s.config)
  const setConfig   = useCraneStore((s) => s.setConfig)
  const setDragging = useCraneStore((s) => s.setDragging)

  // Refs per evitare stale closures nei window listener
  const modelRef      = useRef(model);      modelRef.current = model
  const configRef     = useRef(config);     configRef.current = config
  const setConfigRef  = useRef(setConfig);  setConfigRef.current = setConfig

  const activeDrag = useRef(null)   // { type, plane, ...extras }
  const raycaster  = useRef(new THREE.Raycaster())

  // ── Utilità: hit di un piano dal punto sullo schermo ────────
  const getHit = useCallback((clientX, clientY, plane) => {
    const rect = gl.domElement.getBoundingClientRect()
    const nx = ((clientX - rect.left) / rect.width)  * 2 - 1
    const ny = -((clientY - rect.top)  / rect.height) * 2 + 1
    raycaster.current.setFromCamera({ x: nx, y: ny }, camera)
    const pt = new THREE.Vector3()
    return raycaster.current.ray.intersectPlane(plane, pt) ? pt : null
  }, [camera, gl])

  // ── Window listener (attivo per tutta la vita del componente) ─
  useEffect(() => {
    function onMove(e) {
      const drag = activeDrag.current
      if (!drag) return
      const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
      const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0
      const m = modelRef.current

      if (drag.type === 'boom') {
        const pt = getHit(clientX, clientY, drag.plane)
        if (!pt) return
        // Vettore dal pivot al punto toccato, proiettato nel piano del braccio
        const v     = pt.clone().sub(drag.pivot)
        const horiz = v.dot(drag.azimuth)    // componente lungo direzione boom
        const vert  = v.y                    // componente verticale
        const newLen = Math.sqrt(horiz * horiz + vert * vert)
        const newAng = Math.atan2(vert, Math.max(0.01, horiz)) * (180 / Math.PI)
        setConfigRef.current({
          // Distanza gancio↔cerniera → corsa cilindri (il gancio avanza di 3×corsa)
          boomStrokeM: clamp((newLen - HOOK_BASE_LEN_M) / 3, 0, m.mainBoom.strokeMaxM),
          mainBoomAngleDeg: clamp(newAng, m.mainBoom.elevationRangeDeg[0], m.mainBoom.elevationRangeDeg[1]),
        })
      }

    }

    function onUp() {
      if (!activeDrag.current) return
      activeDrag.current = null
      setDragging(false)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup',   onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup',   onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [getHit, setDragging])

  // ── Funzioni di avvio drag ───────────────────────────────────

  function startBoomDrag(e) {
    e.stopPropagation()
    const rotRad  = d2r(config.rotationDeg)
    // Direzione orizzontale del braccio (azimut)
    const azimuth = new THREE.Vector3(Math.sin(rotRad), 0, Math.cos(rotRad))
    // Normale al piano verticale del braccio (vettore perpendicolare all'azimut, orizzontale)
    const normal  = new THREE.Vector3(Math.cos(rotRad), 0, -Math.sin(rotRad))
    // Pivot del braccio in world space
    const pivZ    = model.mainBoom.pivot.z
    const pivH    = model.mainBoom.pivot.y
    const pivot   = new THREE.Vector3(
      Math.sin(rotRad) * pivZ,
      pivH,
      Math.cos(rotRad) * pivZ,
    )
    const plane = new THREE.Plane()
    plane.setFromNormalAndCoplanarPoint(normal, pivot)
    activeDrag.current = { type: 'boom', plane, pivot, azimuth }
    setDragging(true)
  }

  // ── Posizione gancio in world space ───────────────────────────
  const rotRad    = d2r(config.rotationDeg)
  const αRad      = d2r(config.mainBoomAngleDeg)
  const pivZ      = model.mainBoom.pivot.z
  const pivH      = model.mainBoom.pivot.y
  const hookLen   = HOOK_BASE_LEN_M + 3 * config.boomStrokeM
  const tipHoriz  = pivZ + hookLen * Math.cos(αRad)
  const tipHeight = pivH + hookLen * Math.sin(αRad)
  const tipX      = Math.sin(rotRad) * tipHoriz
  const tipZ      = Math.cos(rotRad) * tipHoriz

  return (
    <>
      {/* ── Handle punta braccio (invisibile — resta attivo per il drag) ── */}
      <mesh position={[tipX, tipHeight, tipZ]} onPointerDown={startBoomDrag}>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshStandardMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  )
}


// ─────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────

const d2r   = (deg) => deg * (Math.PI / 180)
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
