import { Suspense, useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, ContactShadows, Environment, Html } from '@react-three/drei'
import { useCraneStore } from '../../store/craneStore'
import { statusColor, fmtM, fmtKg } from '../../utils/format'

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

const ORANGE   = '#EC6726'
const DARK     = '#1a1a1a'
const MID      = '#2e2e2e'
const DARKGRAY = '#3a3a3a'

function CraneAssembly() {
  const model    = useCraneStore((s) => s.model)
  const config   = useCraneStore((s) => s.config)
  const safety   = useCraneStore((s) => s.safety)
  const statusCol = statusColor(safety?.status ?? 'safe')

  return (
    <group>
      <TruckCarrier />
      <OutriggerBeams model={model} config={config} statusCol={statusCol} />

      <group position={[0, model.turret.pivotHeight, 0]}
             rotation={[0, -d2r(config.rotationDeg), 0]}>
        <SlewingBase />
        <Counterweight />
        <TelescopicBoom model={model} config={config} statusCol={statusCol} />
      </group>

      {safety && (
        <LoadRing
          safety={safety}
          loadKg={config.loadKg}
          rotationDeg={config.rotationDeg}
          color={statusCol}
        />
      )}
    </group>
  )
}

// ── Truck ────────────────────────────────────────────────────────

function TruckCarrier() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.7, -0.3]}>
        <boxGeometry args={[2.4, 1.4, 8.8]} />
        <meshStandardMaterial color={ORANGE} metalness={0.2} roughness={0.55} />
      </mesh>
      <mesh castShadow position={[0, 1.6, 3.6]}>
        <boxGeometry args={[2.35, 1.9, 2.4]} />
        <meshStandardMaterial color="#c25112" metalness={0.15} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.9, 4.79]}>
        <boxGeometry args={[2.0, 0.9, 0.07]} />
        <meshStandardMaterial color="#1b3a5a" transparent opacity={0.72} />
      </mesh>
      {[-1.19, 1.19].map((x, i) => (
        <mesh key={i} position={[x, 1.9, 3.6]}>
          <boxGeometry args={[0.07, 0.7, 1.8]} />
          <meshStandardMaterial color="#1b3a5a" transparent opacity={0.65} />
        </mesh>
      ))}
      <mesh position={[0, 0.5, 4.9]}>
        <boxGeometry args={[2.3, 0.45, 0.15]} />
        <meshStandardMaterial color={DARK} metalness={0.5} roughness={0.4} />
      </mesh>
      {[{ z: -3.2, dual: true }, { z: -1.4, dual: true }, { z: 1.6, dual: false }, { z: 3.5, dual: false }]
        .map(({ z, dual }, ai) =>
          [-1.28, 1.28].map((x, si) => (
            <WheelSet key={`w${ai}${si}`} x={x} y={0.42} z={z} dual={dual} outboard={x > 0} />
          ))
        )}
      {[-1.26, 1.26].map((x, i) => (
        <mesh key={i} castShadow position={[x, 0.7, -1.0]}>
          <boxGeometry args={[0.11, 0.65, 4.2]} />
          <meshStandardMaterial color={DARKGRAY} metalness={0.3} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

function WheelSet({ x, y, z, dual, outboard }) {
  const outer = outboard ? 0.14 : -0.14
  return (
    <group position={[x, y, z]}>
      <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.42, 0.42, 0.22, 20]} />
        <meshStandardMaterial color={DARK} roughness={0.9} />
      </mesh>
      {dual && (
        <mesh castShadow rotation={[0, 0, Math.PI / 2]} position={[outboard ? -0.25 : 0.25, 0, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.22, 20]} />
          <meshStandardMaterial color={DARK} roughness={0.9} />
        </mesh>
      )}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[outer, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.04, 12]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.75} roughness={0.3} />
      </mesh>
    </group>
  )
}

function SlewingBase() {
  return (
    <>
      <mesh castShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[1.15, 1.15, 0.1, 24]} />
        <meshStandardMaterial color={MID} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.88, 1.05, 0.74, 24]} />
        <meshStandardMaterial color={DARK} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0, 0.88, 0.2]}>
        <boxGeometry args={[1.1, 0.55, 1.4]} />
        <meshStandardMaterial color={DARK} metalness={0.35} roughness={0.55} />
      </mesh>
    </>
  )
}

function Counterweight() {
  return (
    <mesh castShadow position={[0, 0.55, -1.6]}>
      <boxGeometry args={[1.7, 0.9, 1.4]} />
      <meshStandardMaterial color="#222222" metalness={0.35} roughness={0.6} />
    </mesh>
  )
}

function OutriggerBeams({ model, config, statusCol }) {
  return (
    <group>
      {Object.entries(model.outriggers.positions).map(([name, base]) => {
        const ext   = config.outriggerExtensionM?.[name] ?? 0
        const side  = Math.sign(base.x) || 1
        const padX  = side * (Math.abs(base.x) + ext)
        const edgeX = side * 1.2
        const beamLen = Math.abs(padX - edgeX)
        const beamCX  = (padX + edgeX) / 2
        return (
          <group key={name}>
            <mesh castShadow position={[edgeX + side * 0.3, 0.28, base.z]}>
              <boxGeometry args={[0.55, 0.3, 0.38]} />
              <meshStandardMaterial color={DARKGRAY} metalness={0.3} roughness={0.6} />
            </mesh>
            <mesh castShadow position={[beamCX, 0.28, base.z]}>
              <boxGeometry args={[beamLen, 0.22, 0.28]} />
              <meshStandardMaterial color={MID} metalness={0.4} roughness={0.5} />
            </mesh>
            <mesh castShadow position={[padX, 0.18, base.z]}>
              <cylinderGeometry args={[0.07, 0.10, 0.36, 10]} />
              <meshStandardMaterial color="#505050" metalness={0.55} roughness={0.4} />
            </mesh>
            {/* Pad — solo rendering, il drag handle è in InteractiveLayer */}
            <mesh castShadow receiveShadow position={[padX, 0.03, base.z]}>
              <cylinderGeometry args={[0.34, 0.34, 0.055, 18]} />
              <meshStandardMaterial color={statusCol} metalness={0.15} roughness={0.7} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function TelescopicBoom({ model, config, statusCol }) {
  const totalLen  = config.mainBoomLengthM
  const angleRad  = d2r(config.mainBoomAngleDeg)
  const retracted = model.mainBoom.retractedLength
  const maxLen    = model.mainBoom.extendedLength
  const pivotZ    = model.mainBoom.pivot.z
  const extRatio  = Math.max(0, (totalLen - retracted) / (maxLen - retracted))
  const s1 = retracted
  const s2 = retracted + extRatio * (maxLen - retracted) * 0.55
  const s3 = totalLen

  return (
    <group position={[0, 0, pivotZ]}>
      <group rotation={[Math.PI / 2 - angleRad, 0, 0]}>
        <mesh castShadow position={[0, s1 / 2, 0]}>
          <cylinderGeometry args={[0.26, 0.32, s1, 14]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.45} roughness={0.45} />
        </mesh>
        <mesh castShadow position={[0, s2 / 2, 0]}>
          <cylinderGeometry args={[0.19, 0.24, s2, 12]} />
          <meshStandardMaterial color="#383838" metalness={0.45} roughness={0.42} />
        </mesh>
        <mesh castShadow position={[0, s3 / 2, 0]}>
          <cylinderGeometry args={[0.12, 0.17, s3, 10]} />
          <meshStandardMaterial color={statusCol} metalness={0.5} roughness={0.38} />
        </mesh>
        <mesh position={[0, s3, 0]}>
          <boxGeometry args={[0.22, 0.16, 0.22]} />
          <meshStandardMaterial color={DARK} metalness={0.65} roughness={0.3} />
        </mesh>
        {model.jib?.available && config.jibLengthM > 0 && (
          <group position={[0, s3, 0]} rotation={[-d2r(config.jibAngleDeg), 0, 0]}>
            <mesh castShadow position={[0, config.jibLengthM / 2, 0]}>
              <cylinderGeometry args={[0.07, 0.10, config.jibLengthM, 10]} />
              <meshStandardMaterial color={DARKGRAY} metalness={0.35} roughness={0.55} />
            </mesh>
            <mesh position={[0, config.jibLengthM, 0]}>
              <boxGeometry args={[0.12, 0.10, 0.12]} />
              <meshStandardMaterial color={DARK} metalness={0.6} roughness={0.35} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  )
}

function LoadRing({ safety, loadKg, rotationDeg, color }) {
  // Posizione corretta: ruota con la torretta (rotationDeg = 0 → Z positivo)
  const rotRad = d2r(rotationDeg)
  const x = Math.sin(rotRad) * safety.radiusM
  const z = Math.cos(rotRad) * safety.radiusM
  return (
    <group>
      <mesh position={[x, 0.06, z]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.40, 28]} />
        <meshBasicMaterial color={color} side={2} />
      </mesh>
      {loadKg > 0 && (
        <Html position={[x, 0.7, z]} center style={{ pointerEvents: 'none' }}>
          <div className="px-2 py-1 rounded bg-white border border-line text-xs font-semibold text-black shadow-panel">
            {Math.round(loadKg).toLocaleString('it-IT')} kg
          </div>
        </Html>
      )}
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
  const safety      = useCraneStore((s) => s.safety)
  const setConfig   = useCraneStore((s) => s.setConfig)
  const setOutrigger = useCraneStore((s) => s.setOutrigger)
  const setDragging = useCraneStore((s) => s.setDragging)

  // Refs per evitare stale closures nei window listener
  const modelRef      = useRef(model);      modelRef.current = model
  const configRef     = useRef(config);     configRef.current = config
  const setConfigRef  = useRef(setConfig);  setConfigRef.current = setConfig
  const setOutRef     = useRef(setOutrigger); setOutRef.current = setOutrigger

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

      if (drag.type === 'rotation') {
        const pt = getHit(clientX, clientY, drag.plane)
        if (!pt) return
        const angle = Math.atan2(pt.x, pt.z) * (180 / Math.PI)
        setConfigRef.current({ rotationDeg: angle })
      }

      else if (drag.type === 'boom') {
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

      else if (drag.type === 'outrigger') {
        const pt = getHit(clientX, clientY, drag.plane)
        if (!pt) return
        const absX  = Math.abs(pt.x)
        const steps = m.outriggers.extensionStepsM
        const raw   = absX - Math.abs(drag.baseX)
        // Snap allo step più vicino
        const snapped = steps.reduce((best, s) =>
          Math.abs(s - raw) < Math.abs(best - raw) ? s : best
        )
        setOutRef.current(drag.name, clamp(snapped, 0, Math.max(...steps)))
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

  function startRotationDrag(e) {
    e.stopPropagation()
    // Piano orizzontale passante per l'altezza della torretta
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -model.turret.pivotHeight)
    activeDrag.current = { type: 'rotation', plane }
    setDragging(true)
  }

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

  function startOutriggerDrag(e, name, base) {
    e.stopPropagation()
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)  // piano del suolo
    activeDrag.current = { type: 'outrigger', plane, name, baseX: base.x }
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

  const statusCol = statusColor(safety?.status ?? 'safe')

  // ── Tooltip boom ─────────────────────────────────────────────
  const boomLabel = [
    `↕ ${Math.round(config.mainBoomAngleDeg)}°`,
    `↔ ${config.mainBoomLengthM.toFixed(1)} m`,
    safety ? `R ${safety.radiusM.toFixed(1)} m` : '',
    safety ? `↑ ${safety.tipHeightM?.toFixed(1) ?? '—'} m` : '',
  ].filter(Boolean).join('  ·  ')

  return (
    <>
      {/* ── Anello di rotazione ────────────────────────────────── */}
      <mesh
        position={[0, pivH + 0.06, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        onPointerDown={startRotationDrag}
      >
        <torusGeometry args={[1.5, 0.075, 12, 60]} />
        <meshStandardMaterial color={ORANGE} metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Label rotazione — ruota con la torretta */}
      <group rotation={[0, -d2r(config.rotationDeg), 0]}>
        <Html
          position={[0, pivH - 0.55, 1.8]}
          center
          distanceFactor={14}
          style={{ pointerEvents: 'none' }}
        >
          <Chip>↺ {Math.round(config.rotationDeg)}°</Chip>
        </Html>
      </group>

      {/* ── Handle punta braccio ───────────────────────────────── */}
      <mesh position={[tipX, tipHeight, tipZ]} onPointerDown={startBoomDrag}>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshStandardMaterial
          color={statusCol}
          emissive={statusCol}
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      {/* HUD braccio — vicino alla punta */}
      <Html
        position={[tipX, tipHeight + 0.7, tipZ]}
        center
        distanceFactor={14}
        style={{ pointerEvents: 'none' }}
      >
        <Chip accent>{boomLabel}</Chip>
      </Html>

      {/* SWL badge — vicino alla punta */}
      {safety && (
        <Html
          position={[tipX, tipHeight - 0.6, tipZ]}
          center
          distanceFactor={14}
          style={{ pointerEvents: 'none' }}
        >
          <SWLChip safety={safety} />
        </Html>
      )}

      {/* ── Handles stabilizzatori ─────────────────────────────── */}
      {Object.entries(model.outriggers.positions).map(([name, base]) => {
        const ext    = config.outriggerExtensionM?.[name] ?? 0
        const side   = Math.sign(base.x) || 1
        const padX   = side * (Math.abs(base.x) + ext)
        const react  = safety?.reactions?.find((r) => r.name === name)

        return (
          <group key={name}>
            {/* Sfera drag pad */}
            <mesh
              position={[padX, 0.22, base.z]}
              onPointerDown={(e) => startOutriggerDrag(e, name, base)}
            >
              <sphereGeometry args={[0.24, 14, 14]} />
              <meshStandardMaterial
                color={statusCol}
                emissive={statusCol}
                emissiveIntensity={0.3}
                roughness={0.35}
              />
            </mesh>

            {/* Label pad */}
            {react && (
              <Html
                position={[padX, 0.65, base.z]}
                center
                distanceFactor={16}
                style={{ pointerEvents: 'none' }}
              >
                <PadChip react={react} />
              </Html>
            )}
          </group>
        )
      })}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────
// HUD chip components (HTML sovrapposto alla scena)
// ─────────────────────────────────────────────────────────────────

function Chip({ children, accent = false }) {
  return (
    <div
      className={[
        'px-2 py-1 rounded-md text-[11px] font-mono font-semibold shadow-sm whitespace-nowrap select-none',
        'border border-line bg-white/92 text-black backdrop-blur-sm',
        accent ? 'border-accent/40' : '',
      ].join(' ')}
    >
      {children}
    </div>
  )
}

function SWLChip({ safety }) {
  const util = safety.loadUtil
  const pct  = Math.min(999, Math.round(util * 100))
  const col  = util >= 1 ? '#dc2626' : util >= 0.85 ? '#b45309' : '#16a34a'
  return (
    <div
      className="px-2 py-1 rounded-md text-[11px] font-mono font-bold shadow-sm whitespace-nowrap select-none border bg-white/92 backdrop-blur-sm"
      style={{ borderColor: col, color: col }}
    >
      SWL {fmtKg(safety.swl_kg)} · {pct}%
    </div>
  )
}

function PadChip({ react }) {
  const util  = react.utilization
  const col   = util >= 1 ? '#dc2626' : util >= 0.85 ? '#b45309' : '#555555'
  return (
    <div
      className="px-1.5 py-0.5 rounded text-[10px] font-mono shadow-sm whitespace-nowrap select-none border bg-white/90 backdrop-blur-sm"
      style={{ color: col, borderColor: col + '60' }}
    >
      {react.reaction_kN.toFixed(1)} kN
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────

const d2r   = (deg) => deg * (Math.PI / 180)
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
