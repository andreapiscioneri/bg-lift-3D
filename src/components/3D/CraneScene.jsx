import { Suspense, useRef, useEffect, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, ContactShadows, Environment, Html, useGLTF } from '@react-three/drei'
import { useCraneStore } from '../../store/craneStore'

// ─────────────────────────────────────────────────────────────────
// Modello CAD reale — "Assieme Braccio M250" (convertito da STEP)
// Asse lungo nativo = Y, base a y = NATIVE_MIN_Y, punta a y = NATIVE_MAX_Y.
// ─────────────────────────────────────────────────────────────────

const BOOM_MODEL_URL = '/models/braccio-m250.glb'
const BOOM_NATIVE_MIN_Y = -1.7703024339066644
const BOOM_NATIVE_MAX_Y = 1.5076975660933378
export const BOOM_NATIVE_LENGTH = BOOM_NATIVE_MAX_Y - BOOM_NATIVE_MIN_Y
const BOOM_ASSEMBLY_NODE = 'Assieme_Braccio_M250'

// Nomi reali dei sotto-assiemi cosi' come appaiono nel file CAD originale:
// BR0089/BR0007/BR0008/BR0009 = le 4 piastre del cassone saldato (corrono quasi
// per l'intera lunghezza — non sono stadi telescopici separabili), CR0082 = testa/
// puleggia in punta, MR0003S_Chiuso = martinetto idraulico di sollevamento angolo,
// GA0001/BC0040/PR0038 = perni di attacco alla base.
export const BOOM_PART_NAMES = [
  'BR0089', 'BR0007', 'BR0008', 'BR0009', 'CR0082',
  'MR0003S_Chiuso', 'GA0001', 'BC0040', 'PR0038',
]

useGLTF.preload(BOOM_MODEL_URL)

// Corsa massima approssimativa del martinetto (MR0003S_Chiuso), in unità
// native prima dello scale finale — senza dati di corsa reali del martinetto
// andrebbe tarata su un valore certificato. "Lunghezza sfilo" pilota
// direttamente la Pos. Y del martinetto: sono la stessa identica grandezza,
// per questo il valore mostrato nell'accordion del pezzo cambia insieme allo
// slider "Lunghezza sfilo" in cima al pannello.
export const RAM_MAX_STROKE_NATIVE = 1.2
export const RAM_PART_NAME = 'MR0003S_Chiuso'

const ZERO3 = [0, 0, 0]
const d2rArr = (deg) => [d2r(deg[0]), d2r(deg[1]), d2r(deg[2])]

// Un pezzo, con pivot di rotazione nel proprio baricentro:
//   <group position=P>            ← spostamento manuale (unità native, prima dello scale finale)
//     <group position=C>          ← porta il pivot al baricentro originale del pezzo
//       <group rotation=R>        ← ruota attorno a quel pivot
//         <group position=-C>     ← riporta la geometria in modo che il baricentro coincida col pivot
//           <primitive/>
// Senza questo, ruotare un pezzo lo farebbe roteare attorno all'origine
// dell'intero assieme (0,0,0) anziché "sul posto".
function PartWithPivot({ center, position, rotation, children }) {
  return (
    <group position={position}>
      <group position={center}>
        <group rotation={rotation}>
          <group position={[-center[0], -center[1], -center[2]]}>
            {children}
          </group>
        </group>
      </group>
    </group>
  )
}

// Ogni pezzo dell'assieme è esposto come gruppo indipendente, controllabile
// via `partTransforms[nomePezzo] = { position: [x,y,z] metri, rotation: [x,y,z] gradi }`
// — pieno controllo manuale su ogni componente reale del file STEP. Per il
// martinetto (RAM_PART_NAME) la Pos. Y non è manuale: è pilotata da
// `ramPositionYNative`, cioè da "Lunghezza sfilo" — X, Z e rotazione restano
// liberi. Il resto del modello mantiene sempre le proporzioni reali (scala
// uniforme sulla lunghezza retratta): stirare l'intero cassone in base allo
// sfilo lo deformava (diventava una lama sottile, non realistico).
function BoomCadModel({ retracted, partTransforms = {}, ramPositionYNative = 0 }) {
  const { scene } = useGLTF(BOOM_MODEL_URL)

  const parts = useMemo(() => {
    const assembly = scene.getObjectByName(BOOM_ASSEMBLY_NODE) ?? scene

    return assembly.children.map((child) => {
      const center = new THREE.Box3().setFromObject(child).getCenter(new THREE.Vector3())
      const clone = child.clone(true)
      clone.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true
          obj.receiveShadow = true
        }
      })
      clone.userData.center = center.toArray()
      return clone
    })
  }, [scene])

  const scale = retracted / BOOM_NATIVE_LENGTH

  return (
    <group scale={[scale, scale, scale]} position={[0, -BOOM_NATIVE_MIN_Y, 0]}>
      {parts.map((part) => {
        const t = partTransforms[part.name]
        const manualPosition = t?.position ?? ZERO3
        const rotation = t?.rotation ? d2rArr(t.rotation) : ZERO3
        const position = part.name === RAM_PART_NAME
          ? [manualPosition[0], ramPositionYNative, manualPosition[2]]
          : manualPosition

        return (
          <PartWithPivot key={part.name} center={part.userData.center} position={position} rotation={rotation}>
            <primitive object={part} />
          </PartWithPivot>
        )
      })}
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
  const model          = useCraneStore((s) => s.model)
  const config         = useCraneStore((s) => s.config)
  const partTransforms = useCraneStore((s) => s.partTransforms)

  return (
    <group position={[0, model.turret.pivotHeight, 0]}
           rotation={[0, -d2r(config.rotationDeg), 0]}>
      <TelescopicBoom model={model} config={config} partTransforms={partTransforms} />
    </group>
  )
}

function TelescopicBoom({ model, config, partTransforms }) {
  const angleRad  = d2r(config.mainBoomAngleDeg)
  const retracted = model.mainBoom.retractedLength
  const extended  = model.mainBoom.extendedLength
  const pivotZ    = model.mainBoom.pivot.z
  // L'angolo ruota già visibilmente l'intero braccio; "Lunghezza sfilo" pilota
  // invece direttamente la Pos. Y del martinetto (RAM_PART_NAME) — sono la
  // stessa identica grandezza.
  const lengthFrac = clamp((config.mainBoomLengthM - retracted) / (extended - retracted), 0, 1)
  const ramPositionYNative = lengthFrac * RAM_MAX_STROKE_NATIVE

  return (
    <group position={[0, 0, pivotZ]}>
      <group rotation={[Math.PI / 2 - angleRad, 0, 0]}>
        {/* Modello CAD reale (Assieme Braccio M250) — unico contenuto della scena */}
        <BoomCadModel
          retracted={retracted}
          ramPositionYNative={ramPositionYNative}
          partTransforms={partTransforms}
        />
      </group>
    </group>
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
          mainBoomLengthM:  clamp(newLen, m.mainBoom.retractedLength, m.mainBoom.extendedLength),
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
    const pivH    = model.turret.pivotHeight
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

  // ── Posizione punta braccio in world space ────────────────────
  const rotRad    = d2r(config.rotationDeg)
  const αRad      = d2r(config.mainBoomAngleDeg)
  const pivZ      = model.mainBoom.pivot.z
  const pivH      = model.turret.pivotHeight
  const tipHoriz  = pivZ + config.mainBoomLengthM * Math.cos(αRad)
  const tipHeight = pivH + config.mainBoomLengthM * Math.sin(αRad)
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
